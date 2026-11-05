const express = require('express');
const Stripe = require('stripe');
const dbPadrao = require('./database');
const autenticarPadrao = require('./middlewareAuth');

const erro = (status, mensagem) => Object.assign(new Error(mensagem), { status });
const MAX_DIARIAS = 90;

function dataISO(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw erro(400, `${label} inválida.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw erro(400, `${label} inválida.`);
  return value;
}

function calcularDiarias(inicio, fim) {
  const start = dataISO(inicio, 'Data inicial'), end = dataISO(fim, 'Data de devolução');
  const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;
  if (!Number.isInteger(days) || days < 1 || days > MAX_DIARIAS) throw erro(400, `Informe um período de 1 a ${MAX_DIARIAS} diárias. A data final é o dia da devolução e não é cobrada como diária.`);
  return days;
}

function valorEmCentavos(valor) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(valor));
  if (!match) throw erro(400, 'A diária do anúncio é inválida.');
  const centavos = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0') || 0);
  if (!Number.isSafeInteger(centavos) || centavos < 1) throw erro(400, 'A diária do anúncio é inválida.');
  return centavos;
}

function configurar(env = process.env) {
  if (!env.STRIPE_SECRET_KEY || !env.APP_BASE_URL) throw erro(503, 'Pagamento de locação indisponível: configure Stripe de teste e APP_BASE_URL.');
  if (!/^sk_test_/.test(env.STRIPE_SECRET_KEY)) throw erro(503, 'Pagamentos de locação aceitam somente chaves Stripe de teste.');
  let base;
  try { base = new URL(env.APP_BASE_URL); } catch { throw erro(503, 'APP_BASE_URL inválida.'); }
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw erro(503, 'APP_BASE_URL deve conter somente a origem HTTP(S).');
  return { stripe: new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-09-30.endive', timeout: 10000, maxNetworkRetries: 1 }), base: base.origin };
}

const papel = role => ({ usuario: 'LOCATARIO', proprietario: 'PROPRIETARIO', admin: 'ADMIN' }[String(role || '').toLowerCase()] || role);

function criarLocacao({ db = dbPadrao, autenticar = autenticarPadrao, env = process.env, config = () => configurar(env), evento = registrarEvento } = {}) {
  const router = express.Router();
  const executar = handler => async (req, res) => {
    try { await handler(req, res); }
    catch (e) { if (e.status) return res.status(e.status).json({ mensagem: e.message }); console.error('Falha na operação de locação.'); return res.status(503).json({ mensagem: 'Não foi possível concluir a operação de locação.' }); }
  };
  const exigir = role => (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    if (papel(req.usuario.role) !== role) return res.status(403).json({ mensagem: `Esta operação requer o papel ${role}.` });
    next();
  };
  const auditar = async (req, acao, reservaId, detalhes = {}) => {
    try { await evento({ usuario_id: req.usuario.id, acao, ip: req.ip, detalhes: { recurso: 'reserva', recurso_id: String(reservaId), ...detalhes } }); }
    catch { console.error('Evento financeiro não foi registrado no log-service.'); }
  };

  /** @openapi
   * /api/locacao/reservas/{id}/checkout:
   *   post:
   *     tags: [Locação]
   *     summary: Criar ou reutilizar checkout Stripe de uma locação aprovada
   *     description: Valor, moeda, usuário e reserva são lidos do MariaDB. O checkout aceita somente cartão e chaves Stripe de teste. O proprietário precisa aprovar antes.
   *     security: [{sessao: []}]
   *     parameters: [{in: path, name: id, required: true, schema: {type: integer, minimum: 1}}]
   *     responses: {'200': {description: 'URL do Stripe Checkout em modo de teste'}, '401': {description: Sessão ausente}, '403': {description: Requer LOCATARIO}, '404': {description: 'Reserva não encontrada ou de outra pessoa'}, '409': {description: 'Reserva não aprovada, expirada ou já paga'}, '503': {description: 'Stripe de teste indisponível'}}
   */
  router.post('/reservas/:id/checkout', autenticar, exigir('LOCATARIO'), executar(async (req, res) => {
    const reservaId = parseId(req.params.id), usuarioId = String(req.usuario.id), cfg = config();
    let payment, sessionUrl = null, retrieveId = null;
    const c = await db.getConnection();
    try {
      await c.beginTransaction();
      const [rows] = await c.execute(`SELECT r.id,r.estado,r.valor_total,r.moeda,r.aprovacao_expira_em,r.solicitante_id,a.estado anuncio_estado
        FROM reservas r JOIN anuncios a ON a.id=r.anuncio_id WHERE r.id=? AND r.solicitante_id=? FOR UPDATE`, [reservaId, usuarioId]);
      if (!rows.length) throw erro(404, 'Reserva não encontrada.');
      const reserva = rows[0];
      if (reserva.estado !== 'confirmada') throw erro(409, 'A solicitação precisa ser aprovada pelo proprietário antes do pagamento.');
      if (reserva.anuncio_estado !== 'ativo') throw erro(409, 'O anúncio não está mais ativo.');
      if (!reserva.valor_total) throw erro(409, 'Esta reserva não tem um valor de locação registrado. Solicite um novo período ao proprietário.');
      if (reserva.aprovacao_expira_em && new Date(reserva.aprovacao_expira_em).getTime() <= Date.now()) throw erro(409, 'O prazo para pagar esta aprovação terminou. Solicite um novo período.');
      const [payments] = await c.execute('SELECT * FROM locacao_pagamentos WHERE reserva_id=? ORDER BY id DESC LIMIT 1 FOR UPDATE', [reservaId]);
      payment = payments[0];
      if (payment?.status === 'pago') throw erro(409, 'Esta locação já foi paga.');
      if (payment?.status === 'pendente') throw erro(409, 'O pagamento está aguardando confirmação. Atualize o status em Minhas reservas.');
      if (['checkout_aberto','falho'].includes(payment?.status) && payment.stripe_checkout_id) retrieveId = payment.stripe_checkout_id;
      if (payment?.status === 'criando' && payment.checkout_expira_em && new Date(payment.checkout_expira_em).getTime() <= Date.now()) {
        await atualizarPagamentoLocal(db, payment.id, 'expirado');
        await liberarReserva(db, reservaId, payment.id, 'expirado');
        throw erro(409, 'O prazo desta aprovação terminou. Solicite um novo período.');
      }
      if (payment?.status === 'criando') {
        // Retry seguro: mesmo registro e mesma chave idempotente se a chamada Stripe anterior teve resposta perdida.
      } else if (!retrieveId) {
        const totalCentavos = valorEmCentavos(reserva.valor_total);
        if (totalCentavos > 99999999) throw erro(400, 'O valor total excede o limite aceito pelo checkout.');
        // Stripe exige a expiração ao menos 30 min no futuro; 5 min de margem cobre a latência da API.
        const expiresAt = Math.floor(Date.now() / 1000) + 35 * 60;
        const [insert] = await c.execute(`INSERT INTO locacao_pagamentos (reserva_id,valor_total,moeda,status,checkout_expira_em)
          VALUES (?,?,?,'criando',FROM_UNIXTIME(?))`, [reservaId, reserva.valor_total, reserva.moeda || 'BRL', expiresAt]);
        payment = { id: insert.insertId, reserva_id: reservaId, valor_total: reserva.valor_total, moeda: reserva.moeda || 'BRL', status: 'criando', checkout_expira_em: new Date(expiresAt * 1000) };
        await c.execute('UPDATE reservas SET aprovacao_expira_em=FROM_UNIXTIME(?) WHERE id=?', [expiresAt, reservaId]);
      }
      await c.commit();
    } catch (e) { await c.rollback(); throw e; }
    finally { c.release(); }

    if (retrieveId) {
      const existing = await cfg.stripe.checkout.sessions.retrieve(retrieveId);
      if (existing.livemode !== false) throw erro(503, 'Sessão fora do modo de teste rejeitada.');
      if (existing.mode !== 'payment' || existing.currency !== 'brl' || existing.amount_total !== valorEmCentavos(payment.valor_total) || existing.client_reference_id !== usuarioId || existing.metadata?.tipo !== 'locacao' || existing.metadata?.reserva_id !== String(reservaId) || existing.metadata?.pagamento_id !== String(payment.id)) throw erro(503, 'A sessão Stripe não corresponde à reserva solicitada.');
      if (existing.status === 'open' && existing.url) sessionUrl = existing.url;
      else if (existing.status === 'complete') throw erro(409, 'Checkout concluído. Aguarde a confirmação do pagamento.');
      else {
        await atualizarPagamentoLocal(db, payment.id, 'expirado');
        await liberarReserva(db, reservaId, payment.id, 'expirado');
        throw erro(409, 'O checkout expirou. Solicite um novo período ao proprietário.');
      }
    } else if (!sessionUrl) {
      const amount = valorEmCentavos(payment.valor_total);
      const expiresAt = Math.floor(new Date(payment.checkout_expira_em).getTime() / 1000);
      if (expiresAt <= Math.floor(Date.now() / 1000) + 30 * 60) throw erro(409, 'O prazo desta aprovação terminou. Solicite um novo período.');
      const session = await cfg.stripe.checkout.sessions.create({
        mode: 'payment', payment_method_types: ['card'], client_reference_id: usuarioId,
        metadata: { tipo: 'locacao', reserva_id: String(reservaId), pagamento_id: String(payment.id), usuario_id: usuarioId },
        payment_intent_data: { metadata: { tipo: 'locacao', reserva_id: String(reservaId), pagamento_id: String(payment.id), usuario_id: usuarioId } },
        line_items: [{ quantity: 1, price_data: { currency: 'brl', unit_amount: amount, product_data: { name: `Locação de equipamento · reserva ${reservaId}`, description: 'Pagamento de locação GiroRural' } } }],
        expires_at: expiresAt,
        success_url: `${cfg.base}/pagamento.html?resultado=sucesso&reserva_id=${reservaId}`,
        cancel_url: `${cfg.base}/pagamento.html?resultado=cancelado&reserva_id=${reservaId}`
      }, { idempotencyKey: `giro-locacao-checkout-${payment.id}` });
      if (session.livemode !== false || session.mode !== 'payment' || session.amount_total !== amount || session.currency !== 'brl' || !session.url) throw erro(503, 'O Stripe retornou uma sessão de locação inválida.');
      const c = await db.getConnection();
      try {
        await c.beginTransaction();
        const [locked] = await c.execute('SELECT id,estado FROM reservas WHERE id=? AND solicitante_id=? FOR UPDATE', [reservaId, usuarioId]);
        if (!locked.length || locked[0].estado !== 'confirmada') throw erro(409, 'A locação deixou de estar aprovada.');
        await c.execute("UPDATE locacao_pagamentos SET stripe_checkout_id=?,status='checkout_aberto' WHERE id=? AND status='criando'", [session.id, payment.id]);
        await c.execute('UPDATE reservas SET aprovacao_expira_em=FROM_UNIXTIME(?) WHERE id=?', [session.expires_at, reservaId]);
        await c.commit();
      } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
      sessionUrl = session.url;
    }
    await auditar(req, 'LOCACAO_CHECKOUT_INICIADO', reservaId, { pagamento_id: String(payment.id) });
    res.json({ url: sessionUrl });
  }));

  /** @openapi
   * /api/locacao/reservas/{id}/pagamento:
   *   get:
   *     tags: [Locação]
   *     summary: Consultar pagamento de uma reserva própria ou recebida
   *     security: [{sessao: []}]
   *     parameters: [{in: path, name: id, required: true, schema: {type: integer, minimum: 1}}]
   *     responses: {'200': {description: Valor e estado financeiro autorizados}, '401': {description: Sessão ausente}, '404': {description: Reserva privada não encontrada}}
   */
  router.get('/reservas/:id/pagamento', autenticar, executar(async (req, res) => {
    const reservaId = parseId(req.params.id);
    const [rows] = await db.execute(`SELECT r.id,r.estado,r.inicio,r.fim,r.diarias,r.valor_total,r.moeda,r.aprovacao_expira_em,
        a.proprietario_id,(SELECT p.status FROM locacao_pagamentos p WHERE p.reserva_id=r.id ORDER BY p.id DESC LIMIT 1) pagamento_status,
        (SELECT p.checkout_expira_em FROM locacao_pagamentos p WHERE p.reserva_id=r.id ORDER BY p.id DESC LIMIT 1) checkout_expira_em
      FROM reservas r JOIN anuncios a ON a.id=r.anuncio_id WHERE r.id=? AND (r.solicitante_id=? OR a.proprietario_id=?)`, [reservaId, req.usuario.id, req.usuario.id]);
    if (!rows.length) throw erro(404, 'Reserva não encontrada.');
    const row = rows[0];
    delete row.proprietario_id;
    row.pode_pagar = papel(req.usuario.role) === 'LOCATARIO' && row.estado === 'confirmada' && row.pagamento_status !== 'pago';
    res.json({ reserva: row });
  }));

  return { router, webhook: criarWebhook({ db, env, config, evento }), expirarAprovacoes: () => expirarAprovacoes(db, evento) };
}

function criarWebhook({ db, env, config, evento }) {
  return async (req, res) => {
    let cfg, event;
    try {
      cfg = config();
      if (!env.STRIPE_LOCACAO_WEBHOOK_SECRET || !req.get('Stripe-Signature') || !Buffer.isBuffer(req.body)) throw erro(400, 'Webhook Stripe de locação inválido.');
      event = cfg.stripe.webhooks.constructEvent(req.body, req.get('Stripe-Signature'), env.STRIPE_LOCACAO_WEBHOOK_SECRET);
      if (event.livemode !== false) throw erro(400, 'Eventos fora do modo de teste são rejeitados.');
      const supported = new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','payment_intent.payment_failed']);
      if (!supported.has(event.type)) return res.json({ recebido: true, ignorado: true });
      const object = event.data?.object;
      const paymentIntentFailure=event.type==='payment_intent.payment_failed';
      if (!object || object.livemode !== false || (!paymentIntentFailure&&object.mode !== 'payment') || object.currency !== 'brl') throw erro(400, 'Evento de locação incompatível.');
      const metadata = object.metadata || {};
      if (metadata.tipo !== 'locacao' || !/^[1-9]\d*$/.test(metadata.reserva_id || '') || !/^[1-9]\d*$/.test(metadata.pagamento_id || '') || !/^[1-9]\d*$/.test(metadata.usuario_id || '') || (!paymentIntentFailure&&object.client_reference_id !== metadata.usuario_id)) throw erro(400, 'Vínculo de pagamento inválido.');
      const eventAmount=Number(paymentIntentFailure?object.amount:object.amount_total);
      const paymentId = Number(metadata.pagamento_id), reservaId = Number(metadata.reserva_id), userId = Number(metadata.usuario_id);
      const c = await db.getConnection();
      let changed = false, action = null;
      try {
        await c.beginTransaction();
        const [insert] = await c.execute('INSERT IGNORE INTO stripe_locacao_eventos (id,tipo) VALUES (?,?)', [event.id, event.type]);
        if (!insert.affectedRows) { await c.commit(); return res.json({ recebido: true, repetido: true }); }
        const [payments] = await c.execute('SELECT * FROM locacao_pagamentos WHERE id=? AND reserva_id=? FOR UPDATE', [paymentId, reservaId]);
        if (!payments.length) { await c.commit(); return res.json({ recebido: true, ignorado: true }); }
        const [reservations] = await c.execute('SELECT r.id,r.estado,r.solicitante_id,r.valor_total,r.moeda,r.aprovacao_expira_em FROM reservas r WHERE r.id=? FOR UPDATE', [reservaId]);
        const p = payments[0], r = reservations[0];
        if (!r || Number(r.solicitante_id) !== userId || Math.round(Number(r.valor_total) * 100) !== eventAmount || r.moeda !== 'BRL' || Number(p.valor_total).toFixed(2) !== (eventAmount / 100).toFixed(2)) {
          await c.commit(); return res.json({ recebido: true, ignorado: true });
        }
        if (p.status === 'pago') { await c.commit(); return res.json({ recebido: true, repetido: true }); }
        if (!paymentIntentFailure&&p.stripe_checkout_id&&p.stripe_checkout_id!==object.id){await c.commit();return res.json({recebido:true,ignorado:true})}
        const incomingIntent=paymentIntentFailure?object.id:typeof object.payment_intent==='string'?object.payment_intent:null;
        if(p.stripe_payment_intent_id&&incomingIntent&&p.stripe_payment_intent_id!==incomingIntent){await c.commit();return res.json({recebido:true,ignorado:true})}
        const expectedAmount = valorEmCentavos(p.valor_total);
        if (eventAmount !== expectedAmount) { await c.commit(); return res.json({ recebido: true, ignorado: true }); }
        if(paymentIntentFailure){
          if(!p.stripe_checkout_id){await c.commit();return res.json({recebido:true,ignorado:true})}
          const checkout=await cfg.stripe.checkout.sessions.retrieve(p.stripe_checkout_id);
          if(checkout.livemode!==false||checkout.mode!=='payment'||checkout.payment_intent!==object.id||checkout.metadata?.tipo!=='locacao'||checkout.metadata?.pagamento_id!==String(paymentId)||checkout.client_reference_id!==String(userId)){await c.commit();return res.json({recebido:true,ignorado:true})}
        }
        let status, reservationState = r.estado;
        if(paymentIntentFailure)status='falho';
        else if (event.type === 'checkout.session.completed') status = object.payment_status === 'paid' ? 'pago' : 'pendente';
        else if (event.type === 'checkout.session.async_payment_succeeded') status = 'pago';
        else if (event.type === 'checkout.session.async_payment_failed') { status = 'falho'; reservationState = 'cancelada'; }
        else { status = 'expirado'; if (r.estado === 'confirmada') reservationState = 'cancelada'; }
        if (r.estado === 'cancelada' && status === 'pago') { await c.commit(); return res.json({ recebido: true, ignorado: true }); }
        await c.execute('UPDATE locacao_pagamentos SET stripe_checkout_id=COALESCE(stripe_checkout_id,?),stripe_payment_intent_id=COALESCE(stripe_payment_intent_id,?),status=? WHERE id=?', [paymentIntentFailure?null:object.id,incomingIntent,status,paymentId]);
        if (event.type === 'checkout.session.completed' && status === 'pendente') {
          await c.execute('UPDATE reservas SET aprovacao_expira_em=GREATEST(COALESCE(aprovacao_expira_em,NOW()),DATE_ADD(NOW(),INTERVAL 24 HOUR)) WHERE id=?', [reservaId]);
        }
        if (reservationState !== r.estado) await c.execute('UPDATE reservas SET estado=? WHERE id=?', [reservationState, reservaId]);
        await c.commit();
        changed = true; action = status === 'pago' ? 'LOCACAO_PAGA' : `LOCACAO_PAGAMENTO_${status.toUpperCase()}`;
      } catch (e) { await c.rollback(); throw e; }
      finally { c.release(); }
      if (changed) await registrarAuditoria(evento, userId, action, reservaId, { pagamento_id: String(paymentId) });
      res.json({ recebido: true, atualizado: changed });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ mensagem: e.message });
      console.error('Falha ao processar webhook Stripe de locação.');
      res.status(503).json({ mensagem: 'Webhook de locação não processado. Stripe pode reenviar o evento.' });
    }
  };
}

async function liberarReserva(db, reservaId, paymentId, status) {
  const c=await db.getConnection();
  try {
    await c.beginTransaction();
    const [payments]=await c.execute('SELECT id,status FROM locacao_pagamentos WHERE id=? AND reserva_id=? FOR UPDATE',[paymentId,reservaId]);
    const [reservations]=await c.execute('SELECT id,estado FROM reservas WHERE id=? FOR UPDATE',[reservaId]);
    if(payments[0]?.status!=='pago'&&reservations[0]?.estado==='confirmada'){
      await c.execute('UPDATE locacao_pagamentos SET status=? WHERE id=? AND status<>\'pago\'',[status,paymentId]);
      await c.execute("UPDATE reservas SET estado='cancelada' WHERE id=? AND estado='confirmada'",[reservaId]);
    }
    await c.commit();
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}
async function atualizarPagamentoLocal(db, paymentId, status) { await db.execute('UPDATE locacao_pagamentos SET status=? WHERE id=? AND status<>\'pago\'', [status, paymentId]); }
function parseId(value) { if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw erro(400, 'Identificador inválido.'); return Number(value); }
async function registrarAuditoria(evento, usuarioId, acao, reservaId, detalhes) {
  try { await evento({ usuario_id: usuarioId, acao, ip: 'stripe-webhook', detalhes: { recurso: 'reserva', recurso_id: String(reservaId), ...detalhes } }); }
  catch { console.error('Evento financeiro não foi registrado no log-service.'); }
}
async function expirarAprovacoes(db, evento = registrarEvento) {
  const c=await db.getConnection(), expired=[];
  try {
    await c.beginTransaction();
    const [rows]=await c.execute(`SELECT r.id,r.solicitante_id FROM reservas r WHERE r.estado='confirmada' AND r.valor_total IS NOT NULL
      AND r.aprovacao_expira_em<=NOW() AND NOT EXISTS (SELECT 1 FROM locacao_pagamentos p WHERE p.reserva_id=r.id AND p.status IN ('checkout_aberto','pendente','pago','falho')) FOR UPDATE`);
    for(const row of rows){const [result]=await c.execute("UPDATE reservas SET estado='cancelada' WHERE id=? AND estado='confirmada' AND aprovacao_expira_em<=NOW()",[row.id]);if(result.affectedRows)expired.push(row)}
    await c.commit();
  }catch(e){await c.rollback();throw e;}finally{c.release();}
  for(const row of expired) await registrarAuditoria(evento,row.solicitante_id,'LOCACAO_APROVACAO_EXPIRADA',row.id,{});
  return expired.length;
}
async function registrarEvento(dados) {
  const url = process.env.LOG_SERVICE_URL;
  if (!url) throw new Error('log-service indisponível');
  const response = await fetch(`${url}/eventos`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados), signal: AbortSignal.timeout(1500) });
  if (!response.ok) throw new Error('log-service indisponível');
}

module.exports = { criarLocacao, configurar, calcularDiarias, valorEmCentavos, expirarAprovacoes };

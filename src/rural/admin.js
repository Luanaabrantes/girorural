// Rotas administrativas do domínio GiroRural: visão operacional, moderação de
// anúncios e consulta de reservas. Toda rota exige papel ADMIN, conferido pelo
// auth-service a cada requisição, e as ações de escrita geram auditoria.
const express = require('express');
const dbPadrao = require('../database');
const autenticarPadrao = require('../middlewareAuth');
const { papel, registrarEvento } = require('./rotas');

const erro = (status, mensagem) => Object.assign(new Error(mensagem), { status });
const id = valor => {
  if (!/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(Number(valor))) throw erro(400, 'Identificador inválido.');
  return Number(valor);
};
const busca = v => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : null);

function criarRotasAdminRural({ db = dbPadrao, autenticar = autenticarPadrao, evento = registrarEvento } = {}) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const auditar = async (req, acao, detalhes) => {
    try { await evento({ usuario_id: req.usuario.id, acao, ip: req.ip, detalhes }); }
    catch { console.error('Evento administrativo não registrado no log-service.'); }
  };
  const exigirAdmin = async (req, res, next) => {
    if (papel(req.usuario?.role) === 'ADMIN') return next();
    await auditar(req, 'ACAO_NEGADA', { recurso: 'ADMIN_GIRORURAL', operacao: `${req.method} ${req.baseUrl}${req.path}`, motivo: 'role_insuficiente' });
    return res.status(403).json({ mensagem: 'Acesso permitido somente a administradores.' });
  };
  const executar = handler => async (req, res) => {
    try { await handler(req, res); }
    catch (e) {
      if (e.status) return res.status(e.status).json({ mensagem: e.message });
      console.error('Falha na operação administrativa GiroRural.');
      return res.status(503).json({ mensagem: 'Serviço temporariamente indisponível.' });
    }
  };
  const protegido = [autenticar, exigirAdmin];

  /** @openapi
   * /api/admin/resumo:
   *   get:
   *     tags: [Administração]
   *     summary: Indicadores operacionais da plataforma (admin)
   *     description: Totais de contas por papel, anúncios por estado e moderação, reservas por estado e valor pago em modo de teste.
   *     security: [{sessao: []}]
   *     responses: {'200': {description: 'Indicadores agregados, sem dados pessoais'}, '401': {description: Sessão ausente}, '403': {description: Requer ADMIN}, '503': {description: Banco indisponível}}
   */
  router.get('/resumo', ...protegido, executar(async (req, res) => {
    const [[usuarios], [anuncios], [reservas], [pagamentos], [recentes]] = await Promise.all([
      db.execute('SELECT role, COUNT(*) total FROM usuarios GROUP BY role'),
      db.execute('SELECT estado, moderacao, COUNT(*) total FROM anuncios GROUP BY estado, moderacao'),
      db.execute('SELECT estado, COUNT(*) total FROM reservas GROUP BY estado'),
      db.execute("SELECT COUNT(*) total, COALESCE(SUM(valor_total),0) valor FROM locacao_pagamentos WHERE status='pago'"),
      db.execute('SELECT DATE(criado_em) dia, COUNT(*) total FROM reservas WHERE criado_em >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) GROUP BY DATE(criado_em) ORDER BY dia')
    ]);
    const porPapel = { ADMIN: 0, PROPRIETARIO: 0, LOCATARIO: 0 };
    for (const u of usuarios) porPapel[papel(u.role)] = (porPapel[papel(u.role)] || 0) + Number(u.total);
    const anunciosResumo = { ativo: 0, rascunho: 0, inativo: 0, arquivado: 0, suspenso: 0 };
    for (const a of anuncios) {
      anunciosResumo[a.estado] = (anunciosResumo[a.estado] || 0) + Number(a.total);
      if (a.moderacao === 'suspenso') anunciosResumo.suspenso += Number(a.total);
    }
    const reservasResumo = { solicitada: 0, confirmada: 0, recusada: 0, cancelada: 0, concluida: 0 };
    for (const r of reservas) reservasResumo[r.estado] = Number(r.total);
    res.json({
      usuarios: { ...porPapel, total: Object.values(porPapel).reduce((a, b) => a + b, 0) },
      anuncios: anunciosResumo,
      reservas: reservasResumo,
      pagamentos: { pagos: Number(pagamentos[0]?.total || 0), valor_pago: Number(pagamentos[0]?.valor || 0).toFixed(2), moeda: 'BRL', modo: 'teste' },
      reservas_por_dia: recentes.map(r => ({ dia: r.dia instanceof Date ? r.dia.toISOString().slice(0, 10) : String(r.dia).slice(0, 10), total: Number(r.total) }))
    });
  }));

  /** @openapi
   * /api/admin/anuncios:
   *   get:
   *     tags: [Administração]
   *     summary: Listar anúncios para moderação (admin)
   *     security: [{sessao: []}]
   *     parameters:
   *       - {in: query, name: q, schema: {type: string, maxLength: 80}, description: 'Busca por equipamento, cidade ou proprietário'}
   *       - {in: query, name: moderacao, schema: {type: string, enum: [liberado, suspenso]}}
   *     responses: {'200': {description: Anúncios com proprietário e estado de moderação}, '401': {description: Sessão ausente}, '403': {description: Requer ADMIN}}
   */
  router.get('/anuncios', ...protegido, executar(async (req, res) => {
    const filtros = [], vals = [], q = busca(req.query.q);
    if (q) { filtros.push('(e.nome LIKE ? OR a.cidade LIKE ? OR u.nome LIKE ? OR u.email LIKE ?)'); vals.push(...Array(4).fill(`%${q}%`)); }
    if (req.query.moderacao !== undefined) {
      if (!['liberado', 'suspenso'].includes(req.query.moderacao)) throw erro(400, 'Filtro de moderação inválido.');
      filtros.push('a.moderacao=?'); vals.push(req.query.moderacao);
    }
    const [rows] = await db.execute(`SELECT a.id, e.nome, e.categoria, a.diaria, a.cidade, a.uf, a.estado, a.moderacao, a.moderacao_motivo, a.moderado_em, a.criado_em,
      u.id proprietario_id, u.nome proprietario_nome, u.email proprietario_email,
      (SELECT COUNT(*) FROM reservas r WHERE r.anuncio_id=a.id) reservas
      FROM anuncios a JOIN equipamentos e ON e.id=a.equipamento_id JOIN usuarios u ON u.id=a.proprietario_id
      ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''} ORDER BY a.moderacao='suspenso' DESC, a.id DESC LIMIT 500`, vals);
    res.json({ anuncios: rows.map(r => ({ ...r, nome: String(r.nome).replace(/^DEMO · /, ''), reservas: Number(r.reservas) })) });
  }));

  /** @openapi
   * /api/admin/anuncios/{id}/moderacao:
   *   patch:
   *     tags: [Administração]
   *     summary: Suspender ou liberar anúncio (admin)
   *     description: Suspender tira o anúncio do catálogo e impede que o proprietário o reative. Liberar remove o bloqueio; o proprietário decide quando reativar.
   *     security: [{sessao: []}]
   *     parameters: [{in: path, name: id, required: true, schema: {type: integer, minimum: 1}}]
   *     requestBody: {required: true, content: {application/json: {schema: {type: object, required: [acao], additionalProperties: false, properties: {acao: {type: string, enum: [suspender, liberar]}, motivo: {type: string, maxLength: 500}}}}}}
   *     responses: {'200': {description: Moderação aplicada}, '400': {description: Ação ou motivo inválido}, '401': {description: Sessão ausente}, '403': {description: Requer ADMIN}, '404': {description: Anúncio não encontrado}}
   */
  router.patch('/anuncios/:id/moderacao', ...protegido, executar(async (req, res) => {
    const anuncioId = id(req.params.id), acao = req.body?.acao;
    if (!['suspender', 'liberar'].includes(acao)) throw erro(400, 'Ação de moderação inválida.');
    const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
    if (acao === 'suspender' && (motivo.length < 5 || motivo.length > 500)) throw erro(400, 'Informe o motivo da suspensão (5 a 500 caracteres).');
    const [r] = acao === 'suspender'
      ? await db.execute("UPDATE anuncios SET moderacao='suspenso', moderacao_motivo=?, moderado_em=NOW(), estado=IF(estado='ativo','inativo',estado) WHERE id=?", [motivo, anuncioId])
      : await db.execute("UPDATE anuncios SET moderacao='liberado', moderacao_motivo=NULL, moderado_em=NOW() WHERE id=?", [anuncioId]);
    if (!r.affectedRows) throw erro(404, 'Anúncio não encontrado.');
    await auditar(req, acao === 'suspender' ? 'ANUNCIO_SUSPENSO' : 'ANUNCIO_LIBERADO', { recurso: 'anuncio', recurso_id: String(anuncioId), ...(motivo ? { motivo: motivo.slice(0, 200) } : {}) });
    res.json({ atualizado: true, moderacao: acao === 'suspender' ? 'suspenso' : 'liberado' });
  }));

  /** @openapi
   * /api/admin/reservas:
   *   get:
   *     tags: [Administração]
   *     summary: Consultar reservas da plataforma (admin)
   *     security: [{sessao: []}]
   *     parameters: [{in: query, name: estado, schema: {type: string, enum: [solicitada, confirmada, recusada, cancelada, concluida]}}]
   *     responses: {'200': {description: 'Reservas com partes, valores e estado do pagamento'}, '400': {description: Filtro inválido}, '401': {description: Sessão ausente}, '403': {description: Requer ADMIN}}
   */
  router.get('/reservas', ...protegido, executar(async (req, res) => {
    const vals = [];
    let where = '';
    if (req.query.estado !== undefined) {
      if (!['solicitada', 'confirmada', 'recusada', 'cancelada', 'concluida'].includes(req.query.estado)) throw erro(400, 'Filtro de estado inválido.');
      where = 'WHERE r.estado=?'; vals.push(req.query.estado);
    }
    const [rows] = await db.execute(`SELECT r.id, r.anuncio_id, e.nome, r.inicio, r.fim, r.diarias, r.valor_total, r.moeda, r.estado, r.criado_em,
      us.nome locatario_nome, up.nome proprietario_nome,
      (SELECT p.status FROM locacao_pagamentos p WHERE p.reserva_id=r.id ORDER BY p.id DESC LIMIT 1) pagamento_status
      FROM reservas r JOIN anuncios a ON a.id=r.anuncio_id JOIN equipamentos e ON e.id=a.equipamento_id
      JOIN usuarios us ON us.id=r.solicitante_id JOIN usuarios up ON up.id=a.proprietario_id
      ${where} ORDER BY r.id DESC LIMIT 500`, vals);
    res.json({ reservas: rows.map(r => ({ ...r, nome: String(r.nome).replace(/^DEMO · /, '') })) });
  }));

  return router;
}

module.exports = { criarRotasAdminRural };

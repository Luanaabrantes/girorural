const $ = s => document.querySelector(s);
const status = $('#status'), feedback = $('#feedback');
const reservaId = new URLSearchParams(location.search).get('id');
const moeda = (v, m = 'BRL') => v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: m }).format(Number(v));
const dataBR = v => { if (!v) return '—'; const s = String(v).slice(0, 10).split('-'); return `${s[2]}/${s[1]}/${s[0]}`; };
const dataHora = v => v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
const ROTULO = { solicitada: 'Aguardando aprovação', confirmada: 'Aprovada', recusada: 'Recusada', cancelada: 'Cancelada', concluida: 'Concluída' };
const PAG = { criando: 'Preparando pagamento', checkout_aberto: 'Pagamento iniciado', pendente: 'Pagamento pendente', pago: 'Pago', falho: 'Pagamento recusado', expirado: 'Pagamento expirado' };
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
async function api(url, options = {}) {
  const r = await fetch(url, { cache: 'no-store', ...options }); let d = {};
  try { d = await r.json(); } catch { /* sem corpo */ }
  if (!r.ok) throw Object.assign(new Error(d.mensagem || 'Não foi possível concluir.'), { status: r.status });
  return d;
}
function linha(rot, val, cls) { const d = el('div', 'resumo-linha' + (cls ? ' ' + cls : '')); d.append(el('span', '', rot), el('strong', '', val)); return d; }
function passo(titulo, sub, estado) { const li = el('li', estado); const t = el('div'); t.append(el('b', '', titulo)); if (sub) t.append(el('small', '', sub)); li.replaceChildren(t); return li; }
function avisar(t, erro) { feedback.textContent = t; feedback.className = erro ? 'error' : 'success'; }
async function acao(fn, botao) { if (botao) botao.disabled = true; try { await fn(); await carregar(); } catch (e) { avisar(e.message, true); if (botao) botao.disabled = false; } }

async function carregar() {
  if (!/^[1-9]\d*$/.test(reservaId || '')) throw new Error('Reserva inválida.');
  const { reserva: r } = await api(`/api/reservas/${reservaId}`);
  const dono = r.como === 'proprietario', pago = r.pagamento_status === 'pago';
  $('#voltar').href = dono ? '/painel.html#minhas-reservas' : '/minhas-reservas.html';
  $('#voltar').textContent = dono ? '← Solicitações recebidas' : '← Minhas reservas';
  document.title = `Reserva #${r.id} · GiroRural`;
  $('#codigo').textContent = `Reserva #${r.id} · ${dono ? 'você é o proprietário' : 'você é o locatário'}`;
  $('#titulo').textContent = r.equipamento.nome;
  $('#local').textContent = [r.equipamento.marca, r.equipamento.modelo].filter(x => x && x !== 'A consultar').join(' ') + ` · ${r.equipamento.cidade}/${r.equipamento.uf}`;
  const selos = [el('span', `badge ${r.estado}`, ROTULO[r.estado] || r.estado)];
  if (r.pagamento_status) selos.push(el('span', `badge ${r.pagamento_status}`, PAG[r.pagamento_status] || r.pagamento_status));
  $('#selos').replaceChildren(...selos);

  // Linha do tempo
  const t = [passo('Solicitação enviada', dataHora(r.criado_em), 'feito')];
  if (r.estado === 'solicitada') t.push(passo('Aguardando aprovação do proprietário', 'O proprietário analisa período e condições.', 'atual'));
  else if (r.estado === 'recusada') t.push(passo('Solicitação recusada', dataHora(r.decidido_em), 'falha'));
  else if (r.estado === 'cancelada') t.push(passo('Reserva cancelada', dataHora(r.atualizado_em), 'falha'));
  else t.push(passo('Aprovada pelo proprietário', dataHora(r.decidido_em), 'feito'));
  if (['confirmada', 'concluida'].includes(r.estado) && r.valor_total != null) {
    if (pago) t.push(passo('Pagamento confirmado', 'Modo de teste Stripe', 'feito'));
    else t.push(passo(r.pagamento_status === 'falho' ? 'Pagamento recusado: tente novamente' : 'Aguardando pagamento',
      r.aprovacao_expira_em ? `Pague até ${dataHora(r.aprovacao_expira_em)} para garantir as datas.` : '', r.pagamento_status === 'falho' ? 'falha' : 'atual'));
  }
  if (r.estado !== 'recusada' && r.estado !== 'cancelada') {
    t.push(passo(`Retirada em ${dataBR(r.inicio)}`, 'Combine entrega e retirada pelo contato liberado.', r.estado === 'concluida' ? 'feito' : ''));
    t.push(passo(`Devolução em ${dataBR(r.fim)}`, r.estado === 'concluida' ? 'Locação concluída.' : 'O dia da devolução não é cobrado.', r.estado === 'concluida' ? 'feito' : ''));
  }
  $('#timeline').replaceChildren(...t);

  $('#secObs').hidden = !r.observacao; $('#observacao').textContent = r.observacao || '';
  $('#secRecusa').hidden = !r.motivo_recusa; $('#motivo').textContent = r.motivo_recusa || '';
  $('#condicoes').textContent = r.equipamento.condicoes || 'O proprietário não informou condições adicionais.';
  const foto = $('#foto'); if (r.equipamento.foto_url) { foto.src = r.equipamento.foto_url; foto.alt = `Foto de ${r.equipamento.nome}`; foto.hidden = false; }
  $('#resumo').replaceChildren(
    linha('Retirada', dataBR(r.inicio)), linha('Devolução', dataBR(r.fim)),
    linha('Diária', moeda(r.equipamento.diaria)), linha('Diárias', String(r.diarias ?? '—')),
    linha('Total', moeda(r.valor_total, r.moeda), 'total'));

  // Contato: liberado somente após aprovação
  const c = r.contraparte, box = $('#contato');
  $('#contatoTitulo').textContent = dono ? 'Locatário' : 'Proprietário';
  const nome = el('p', '', ''); nome.style.margin = '0 0 8px'; nome.append(el('strong', '', c.nome || '—'));
  if (c.cidade) nome.append(` · ${c.cidade}/${c.uf}`);
  const itens = [nome];
  if (!dono && c.id) { const a = el('a', '', 'Ver perfil público'); a.href = `/proprietario.html?id=${c.id}`; itens.push(a); }
  if (r.contato_liberado) {
    if (c.telefone) { const tel = el('a', 'button small outline', `Ligar ou WhatsApp: ${c.telefone}`); tel.href = `tel:${c.telefone.replace(/[^\d+]/g, '')}`; tel.style.marginTop = '10px'; itens.push(tel); }
    if (c.email) { const em = el('a', 'button small outline', `E-mail: ${c.email}`); em.href = `mailto:${c.email}?subject=${encodeURIComponent('GiroRural · Reserva #' + r.id)}`; em.style.marginTop = '8px'; itens.push(em); }
  } else itens.push(el('p', 'notice', 'Telefone e e-mail aparecem aqui depois que a reserva for aprovada.'));
  box.replaceChildren(...itens);

  // Ações por papel e estado
  const acoes = [];
  if (!dono) {
    if (r.estado === 'confirmada' && r.valor_total != null && !pago && !['checkout_aberto', 'pendente', 'criando'].includes(r.pagamento_status)) {
      const b = el('button', 'button', r.pagamento_status === 'falho' ? 'Tentar pagar novamente' : `Pagar ${moeda(r.valor_total, r.moeda)}`); b.type = 'button';
      b.onclick = () => location.assign(`/pagamento.html?reserva_id=${r.id}`);
      acoes.push(b, el('small', '', 'Ambiente de teste: use o cartão 4242 4242 4242 4242, qualquer data futura e CVC.'));
    }
    if (['checkout_aberto', 'pendente', 'criando'].includes(r.pagamento_status)) acoes.push(el('p', 'notice', 'Pagamento em processamento. Atualize a página em alguns instantes.'));
    if (r.estado === 'solicitada' || (r.estado === 'confirmada' && !r.pagamento_status)) {
      const b = el('button', 'button danger', 'Cancelar solicitação'); b.type = 'button';
      b.onclick = () => { if (b.dataset.confirmar) acao(() => api(`/api/reservas/${r.id}/cancelar`, { method: 'POST' }), b); else { b.dataset.confirmar = '1'; b.textContent = 'Confirmar cancelamento'; } };
      acoes.push(b);
    }
  } else {
    if (r.estado === 'solicitada') {
      const ok = el('button', 'button', 'Aprovar reserva'); ok.type = 'button';
      ok.onclick = () => acao(() => api(`/api/reservas/${r.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ estado: 'confirmada' }) }), ok);
      const no = el('button', 'button danger', 'Recusar'); no.type = 'button';
      no.onclick = () => { $('#formRecusa').hidden = false; $('#motivoRecusa').focus(); };
      acoes.push(ok, no, el('small', '', 'Ao aprovar, o locatário tem 24 horas para pagar e as datas ficam bloqueadas.'));
    }
    if (r.estado === 'confirmada' && (pago || r.valor_total == null)) {
      const b = el('button', 'button', 'Marcar como concluída (devolvido)'); b.type = 'button';
      b.onclick = () => acao(() => api(`/api/reservas/${r.id}/concluir`, { method: 'POST' }), b);
      acoes.push(b);
    }
  }
  $('#acoes').replaceChildren(...acoes);
  $('#secAcoes').hidden = !acoes.length;
  status.hidden = true; $('#conteudo').hidden = false;
}
$('#formRecusa').onsubmit = e => { e.preventDefault(); acao(() => api(`/api/reservas/${reservaId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ estado: 'recusada', motivo: $('#motivoRecusa').value }) })).then(() => { $('#formRecusa').hidden = true; }); };
$('#cancelarRecusa').onclick = () => { $('#formRecusa').hidden = true; };
carregar().catch(e => {
  status.className = 'notice error'; status.textContent = e.message;
  if (e.status === 401) { const a = el('a', '', ' Entrar'); a.href = `/login.html?voltar=${encodeURIComponent(location.pathname + location.search)}`; status.append(a); }
});

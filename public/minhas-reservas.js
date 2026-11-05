const statusEl = document.querySelector('#reservasStatus'), list = document.querySelector('#listaReservas');
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
async function api(url, options = {}) { const r = await fetch(url, { cache: 'no-store', ...options }); let data = {}; try { data = await r.json(); } catch { /* sem corpo */ } if (!r.ok) throw Object.assign(Error(data.mensagem || 'Não foi possível carregar as reservas.'), { status: r.status }); return data; }
const money = (v, c = 'BRL') => v == null ? 'Valor não disponível' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: c }).format(Number(v));
const dataBR = v => { const s = String(v).slice(0, 10).split('-'); return `${s[2]}/${s[1]}/${s[0]}`; };
const ROTULO = { solicitada: 'Aguardando aprovação', confirmada: 'Aprovada', recusada: 'Recusada', cancelada: 'Cancelada', concluida: 'Concluída' };
const PAG = { criando: 'Preparando pagamento', checkout_aberto: 'Pagamento iniciado', pendente: 'Pagamento pendente', pago: 'Pago', falho: 'Pagamento recusado', expirado: 'Pagamento expirado' };
let reservas = [], filtro = 'andamento';
for (const tab of document.querySelectorAll('[role=tab]')) tab.onclick = () => { filtro = tab.dataset.filtro; document.querySelectorAll('[role=tab]').forEach(t => t.setAttribute('aria-selected', String(t === tab))); desenhar(); };
function desenhar() {
  const lista = reservas.filter(r => (filtro === 'andamento') === ['solicitada', 'confirmada'].includes(r.estado));
  list.replaceChildren();
  if (!lista.length) {
    const v = el('div', 'vazio'); v.append(el('strong', '', filtro === 'andamento' ? 'Nenhuma locação em andamento' : 'Sem histórico ainda'), el('p', '', 'Encontre tratores e implementos perto de você.'));
    const a = el('a', 'button', 'Explorar equipamentos'); a.href = '/anuncios.html'; v.append(a); list.append(v);
  }
  for (const r of lista) {
    const card = el('article', 'reserva-card');
    const img = el('img'); img.alt = ''; img.loading = 'lazy'; img.src = `/api/anuncios/${r.anuncio_id}/foto`; img.onerror = () => { img.src = '/imagens/equipamentos.svg'; img.onerror = null; };
    const meio = el('div'); meio.append(el('h2', '', r.nome), el('p', '', `${r.cidade}/${r.uf} · ${dataBR(r.inicio)} a ${dataBR(r.fim)} · ${r.diarias || '—'} diárias`));
    const selos = el('p'); selos.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px';
    selos.append(el('span', `badge ${r.estado}`, ROTULO[r.estado] || r.estado)); if (r.pagamento_status) selos.append(el('span', `badge ${r.pagamento_status}`, PAG[r.pagamento_status]));
    meio.append(selos);
    if (r.estado === 'recusada' && r.motivo_recusa) meio.append(el('p', '', `Motivo: ${r.motivo_recusa}`));
    const lado = el('div', 'lado'); lado.append(el('span', 'valor', money(r.valor_total, r.moeda)));
    const precisaPagar = r.estado === 'confirmada' && r.valor_total && !['pago', 'checkout_aberto', 'pendente', 'criando'].includes(r.pagamento_status);
    const ver = el('a', precisaPagar ? 'button small' : 'button small outline', precisaPagar ? 'Pagar agora' : 'Ver detalhes'); ver.href = `/reserva.html?id=${r.id}`;
    lado.append(ver); card.append(img, meio, lado); list.append(card);
  }
  list.hidden = false;
}
async function load() {
  try {
    ({ reservas } = await api('/api/reservas/minhas'));
    statusEl.hidden = true;
    if (reservas.some(r => r.estado === 'confirmada' && r.valor_total && r.pagamento_status !== 'pago')) { statusEl.hidden = false; statusEl.className = 'notice'; statusEl.textContent = 'Você tem reserva aprovada aguardando pagamento. Pague em até 24 horas para garantir as datas.'; }
    desenhar();
  } catch (e) {
    statusEl.textContent = e.message; statusEl.classList.add('error');
    if (e.status === 401) { const link = el('a', '', ' Entrar'); link.href = '/login.html?voltar=/minhas-reservas.html'; statusEl.append(link); }
  }
}
load();

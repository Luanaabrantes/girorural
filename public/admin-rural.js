const $ = s => document.querySelector(s);
const status = $('#status'), feedback = $('#feedback');
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const moeda = v => v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
const dataBR = v => { if (!v) return '—'; const s = String(v).slice(0, 10).split('-'); return `${s[2]}/${s[1]}/${s[0]}`; };
const ROT_RES = { solicitada: 'Aguardando aprovação', confirmada: 'Aprovada', recusada: 'Recusada', cancelada: 'Cancelada', concluida: 'Concluída' };
const ROT_PAG = { criando: 'Preparando', checkout_aberto: 'Checkout aberto', pendente: 'Pendente', pago: 'Pago', falho: 'Recusado', expirado: 'Expirado' };
const ROT_AN = { ativo: 'Publicado', rascunho: 'Rascunho', inativo: 'Pausado', arquivado: 'Arquivado' };
const papel = r => ({ admin: 'ADMIN', usuario: 'LOCATARIO' }[r] || r);
async function api(url, options = {}) {
  const r = await fetch(url, { cache: 'no-store', ...options }); let d = {};
  try { d = await r.json(); } catch { /* sem corpo */ }
  if (!r.ok) throw Object.assign(new Error(d.mensagem || 'Falha ao carregar painel.'), { status: r.status });
  return d;
}
function avisar(t, erro) { feedback.textContent = t; feedback.className = erro ? 'error' : 'success'; }
function td(...filhos) { const c = el('td'); c.append(...filhos); return c; }
function vazio(tbody, cols, texto) { const tr = el('tr'), c = el('td', 'vazio', texto); c.colSpan = cols; tr.append(c); tbody.replaceChildren(tr); }

// Abas acessíveis
const abas = [...document.querySelectorAll('[role=tab]')];
const carregados = new Set();
function abrir(aba) {
  for (const a of abas) { const sel = a === aba; a.setAttribute('aria-selected', String(sel)); a.tabIndex = sel ? 0 : -1; $('#' + a.getAttribute('aria-controls')).hidden = !sel; }
  const nome = aba.id.slice(2); history.replaceState(null, '', '#' + nome);
  if (!carregados.has(nome)) { carregados.add(nome); ({ visao: carregarVisao, moderacao: carregarAnuncios, reservas: carregarReservas, usuarios: carregarUsuarios, auditoria: carregarAuditoria })[nome]().catch(e => avisar(e.message, true)); }
}
abas.forEach((a, i) => { a.onclick = () => abrir(a); a.onkeydown = e => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { const n = abas[(i + d + abas.length) % abas.length]; n.focus(); abrir(n); } }; });

async function carregarVisao() {
  const r = await api('/api/admin/resumo');
  const stat = (rot, val, sub) => { const s = el('div', 'stat'); s.append(el('span', '', rot), el('strong', '', String(val))); if (sub) s.append(el('small', '', sub)); return s; };
  $('#stats').replaceChildren(
    stat('Usuários', r.usuarios.total, `${r.usuarios.PROPRIETARIO} proprietários · ${r.usuarios.LOCATARIO} locatários`),
    stat('Anúncios publicados', r.anuncios.ativo, `${r.anuncios.suspenso} suspensos · ${r.anuncios.rascunho} rascunhos`),
    stat('Aguardando aprovação', r.reservas.solicitada, `${r.reservas.confirmada} aprovadas em andamento`),
    stat('Pagamentos (teste)', moeda(r.pagamentos.valor_pago), `${r.pagamentos.pagos} locações pagas`));
  const total = Object.values(r.reservas).reduce((a, b) => a + b, 0) || 1;
  $('#porEstado').replaceChildren(...Object.entries(r.reservas).map(([k, v]) => {
    const linha = el('div', 'resumo-linha'); const rot = el('span', `badge ${k}`, ROT_RES[k]);
    const barra = el('div'); barra.style.cssText = 'flex:1;height:8px;background:#F1EFEA;border-radius:4px;align-self:center;margin:0 12px;overflow:hidden';
    const fill = el('div'); fill.style.cssText = `height:100%;width:${Math.round(v / total * 100)}%;background:var(--gr-verde)`; barra.append(fill);
    linha.append(rot, barra, el('strong', '', String(v))); return linha;
  }));
  try {
    const h = await fetch('/health', { cache: 'no-store' }).then(x => x.json());
    const deps = h.dependencias || h.checks || {};
    const nomes = { mariadb: 'Banco MariaDB', autenticacao: 'Autenticação', logService: 'Auditoria (Redis)', minio: 'Fotos (MinIO)' };
    const linhas = Object.entries(deps).map(([k, v]) => { const ok = (v?.status || v) === 'ok'; const l = el('div', 'resumo-linha'); l.append(el('span', '', nomes[k] || k), el('span', `badge ${ok ? 'pago' : 'falho'}`, ok ? 'Operando' : 'Indisponível')); return l; });
    $('#servicos').replaceChildren(...(linhas.length ? linhas : [el('p', 'notice', `Estado geral: ${h.status}`)]));
  } catch { $('#servicos').replaceChildren(el('p', 'notice error', 'Não foi possível consultar /health.')); }
}

async function carregarAnuncios() {
  const f = new FormData($('#filtroAnuncios')), q = new URLSearchParams();
  if (f.get('q')) q.set('q', f.get('q')); if (f.get('moderacao')) q.set('moderacao', f.get('moderacao'));
  const { anuncios } = await api('/api/admin/anuncios?' + q), tbody = $('#anuncios');
  if (!anuncios.length) return vazio(tbody, 7, 'Nenhum anúncio encontrado.');
  tbody.replaceChildren(...anuncios.map(a => {
    const tr = el('tr'), link = el('a', '', a.nome); link.href = `/anuncio.html?id=${a.id}`;
    const nome = td(link, el('br'), el('small', '', `${a.categoria} · ${a.reservas} reservas`));
    const dono = td(el('span', '', a.proprietario_nome), el('br'), el('small', '', a.proprietario_email));
    const mod = td(el('span', `badge ${a.moderacao}`, a.moderacao === 'suspenso' ? 'Suspenso' : 'Liberado'));
    if (a.moderacao_motivo) mod.append(el('br'), el('small', '', a.moderacao_motivo));
    const acoes = el('div', 'acoes');
    if (a.moderacao === 'suspenso') {
      const b = el('button', 'button small outline', 'Liberar'); b.type = 'button';
      b.onclick = () => moderar(a.id, 'liberar', null, b); acoes.append(b);
    } else {
      const input = el('input'); input.placeholder = 'Motivo da suspensão'; input.maxLength = 500; input.setAttribute('aria-label', `Motivo para suspender ${a.nome}`); input.style.cssText = 'min-height:40px;border:1px solid var(--gr-borda);border-radius:8px;padding:0 10px;min-width:180px';
      const b = el('button', 'button small danger', 'Suspender'); b.type = 'button';
      b.onclick = () => moderar(a.id, 'suspender', input.value, b); acoes.append(input, b);
    }
    tr.append(nome, dono, td(`${a.cidade}/${a.uf}`), td(moeda(a.diaria)), td(el('span', `badge ${a.estado}`, ROT_AN[a.estado] || a.estado)), mod, td(acoes));
    return tr;
  }));
}
async function moderar(id, acao, motivo, botao) {
  botao.disabled = true;
  try {
    await api(`/api/admin/anuncios/${id}/moderacao`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(motivo ? { acao, motivo } : { acao }) });
    avisar(acao === 'suspender' ? 'Anúncio suspenso e retirado do catálogo.' : 'Anúncio liberado. O proprietário pode reativá-lo.');
    carregados.delete('visao'); await carregarAnuncios();
  } catch (e) { avisar(e.message, true); botao.disabled = false; }
}

async function carregarReservas() {
  const estado = new FormData($('#filtroReservas')).get('estado');
  const { reservas } = await api('/api/admin/reservas' + (estado ? `?estado=${estado}` : '')), tbody = $('#reservas');
  if (!reservas.length) return vazio(tbody, 8, 'Nenhuma reserva encontrada.');
  tbody.replaceChildren(...reservas.map(r => {
    const tr = el('tr');
    tr.append(td(String(r.id)), td(r.nome), td(r.locatario_nome), td(r.proprietario_nome), td(`${dataBR(r.inicio)} a ${dataBR(r.fim)}`), td(moeda(r.valor_total)),
      td(el('span', `badge ${r.estado}`, ROT_RES[r.estado] || r.estado)), td(r.pagamento_status ? el('span', `badge ${r.pagamento_status}`, ROT_PAG[r.pagamento_status]) : el('small', '', 'Não iniciado')));
    return tr;
  }));
}

let usuarios = [];
async function carregarUsuarios() { usuarios = (await api('/api/admin/usuarios')).usuarios; desenharUsuarios(); }
function desenharUsuarios() {
  const q = String(new FormData($('#filtroUsuarios')).get('q') || '').toLocaleLowerCase('pt-BR');
  const lista = usuarios.filter(u => !q || `${u.nome} ${u.email}`.toLocaleLowerCase('pt-BR').includes(q)), tbody = $('#usuarios');
  if (!lista.length) return vazio(tbody, 4, 'Nenhum usuário encontrado.');
  tbody.replaceChildren(...lista.map(u => {
    const tr = el('tr'), p = papel(u.role);
    const select = el('select'); select.setAttribute('aria-label', `Papel de ${u.nome}`); select.style.cssText = 'min-height:40px;border:1px solid var(--gr-borda);border-radius:8px;padding:0 8px';
    for (const [v, t] of [['LOCATARIO', 'Locatário'], ['PROPRIETARIO', 'Proprietário'], ['ADMIN', 'Administrador']]) { const o = el('option', '', t); o.value = v; o.selected = v === p; select.append(o); }
    const b = el('button', 'button small outline', 'Salvar'); b.type = 'button';
    b.onclick = async () => { b.disabled = true; try { await api(`/api/admin/usuarios/${u.id}/role`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: select.value }) }); avisar(`Papel de ${u.nome} atualizado.`); await carregarUsuarios(); } catch (e) { avisar(e.message, true); b.disabled = false; } };
    const acoes = el('div', 'acoes'); acoes.style.justifyContent = 'flex-start'; acoes.append(select, b);
    tr.append(td(u.nome), td(u.email), td(el('span', `badge ${p.toLowerCase()}`, { ADMIN: 'Administrador', PROPRIETARIO: 'Proprietário', LOCATARIO: 'Locatário' }[p] || p)), td(acoes));
    return tr;
  }));
}
$('#filtroUsuarios').oninput = desenharUsuarios;
$('#filtroUsuarios').onsubmit = e => { e.preventDefault(); desenharUsuarios(); };

let eventos = [];
async function carregarAuditoria() { eventos = (await api('/api/logs?limit=100')).eventos || []; desenharAuditoria(); }
function desenharAuditoria() {
  const filtro = new FormData($('#filtroAuditoria')).get('acao'), tbody = $('#eventos');
  // Sinaliza contas com várias ações negadas: possível tentativa de acesso indevido.
  const negadas = {}; for (const e of eventos) if (e.acao === 'ACAO_NEGADA') negadas[e.usuario_id] = (negadas[e.usuario_id] || 0) + 1;
  const suspeitos = Object.entries(negadas).filter(([, n]) => n >= 3);
  $('#alertas').hidden = !suspeitos.length;
  $('#alertas').className = 'notice error';
  $('#alertas').textContent = suspeitos.length ? `Atenção: ${suspeitos.map(([u, n]) => `usuário ${u} teve ${n} ações negadas`).join('; ')} nos últimos 100 eventos.` : '';
  const lista = eventos.filter(e => !filtro || e.acao.startsWith(filtro));
  if (!lista.length) return vazio(tbody, 5, 'Nenhum evento registrado.');
  tbody.replaceChildren(...lista.map(e => {
    const tr = el('tr'), d = e.detalhes || {};
    const recurso = d.recurso ? `${d.recurso}${d.recurso_id ? ' #' + d.recurso_id : ''}${d.motivo ? ' · ' + d.motivo : ''}` : (d.role_nova ? `papel → ${d.role_nova}` : '—');
    tr.append(td(new Date(e.timestamp).toLocaleString('pt-BR')), td(el('span', e.acao === 'ACAO_NEGADA' ? 'badge falho' : 'badge', e.acao)), td(String(e.usuario_id)), td(recurso), td(e.ip || '—'));
    return tr;
  }));
}
$('#filtroAuditoria').onchange = desenharAuditoria;
$('#filtroAnuncios').onsubmit = e => { e.preventDefault(); carregarAnuncios().catch(x => avisar(x.message, true)); };
$('#filtroReservas').onsubmit = e => { e.preventDefault(); carregarReservas().catch(x => avisar(x.message, true)); };

(async () => {
  try {
    const { usuario } = await api('/api/auth/me');
    if (papel(usuario.role) !== 'ADMIN') throw new Error('Acesso permitido somente a administradores.');
    status.hidden = true; $('#area').hidden = false;
    const inicial = abas.find(a => a.id === 't-' + location.hash.slice(1)) || abas[0];
    abrir(inicial);
  } catch (e) {
    status.className = 'notice error'; status.textContent = e.message;
    if (e.status === 401) { const a = el('a', '', ' Entrar'); a.href = '/login.html?voltar=/admin.html'; status.append(a); }
  }
})();

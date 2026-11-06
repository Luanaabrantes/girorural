const $ = s => document.querySelector(s);
const status = $('#status'), feedback = $('#feedback');
async function api(url, options = {}) {
  const r = await fetch(url, { cache: 'no-store', ...options }); let d = {};
  try { d = await r.json(); } catch { /* resposta sem corpo */ }
  if (!r.ok) throw Object.assign(new Error(d.mensagem || 'Não foi possível concluir.'), { status: r.status, dados: d });
  return d;
}
function item(texto, ok) { const li = document.createElement('li'); li.textContent = texto; if (ok) li.className = 'ok'; return li; }
async function carregar() {
  let usuario;
  try { usuario = (await api('/api/auth/me')).usuario; }
  catch {
    status.innerHTML = '';
    status.append('Crie uma conta gratuita ou entre para anunciar. ');
    const criar = document.createElement('a'); criar.href = '/cadastro.html'; criar.textContent = 'Criar conta';
    const entrar = document.createElement('a'); entrar.href = '/login.html?voltar=/anunciante.html'; entrar.textContent = 'Entrar';
    status.append(criar, ' · ', entrar); return;
  }
  const papel = { admin: 'ADMIN', usuario: 'LOCATARIO' }[usuario.role] || usuario.role;
  $('#etapa1').className = 'ok';
  if (papel === 'PROPRIETARIO') {
    $('#etapa2').className = 'ok'; $('#etapa3').className = 'atual';
    status.className = 'notice success';
    status.textContent = 'Seu modo anunciante já está ativo. ';
    const a = document.createElement('a'); a.href = '/anunciar.html'; a.textContent = 'Anunciar uma máquina agora';
    status.append(a); return;
  }
  if (papel === 'ADMIN') { status.textContent = 'Contas administrativas não publicam anúncios.'; return; }
  $('#etapa2').className = 'atual';
  const { perfil } = await api('/api/perfil/me');
  const ok = { telefone: !!perfil.telefone?.trim(), cidade: !!perfil.cidade?.trim(), uf: !!perfil.uf?.trim() };
  $('#checklist').replaceChildren(
    item('Conta criada e e-mail confirmado no login', true),
    item(`Telefone de contato${ok.telefone ? ': ' + perfil.telefone : ''}`, ok.telefone),
    item(`Cidade e UF${ok.cidade && ok.uf ? ': ' + perfil.cidade + '/' + perfil.uf : ''}`, ok.cidade && ok.uf)
  );
  const completo = ok.telefone && ok.cidade && ok.uf;
  $('#perfilDica').hidden = completo;
  if (!completo) montarFormPerfil(perfil);
  $('#habilitar').disabled = !completo;
  status.hidden = true; $('#passos').hidden = false;
}
$('#formAceite').onsubmit = async e => {
  e.preventDefault();
  const botao = $('#habilitar'); botao.disabled = true;
  feedback.className = ''; feedback.textContent = 'Habilitando...';
  try {
    const d = await api('/api/auth/anunciante', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aceite_termos: $('#aceite').checked }) });
    feedback.className = 'success'; feedback.textContent = d.mensagem;
    setTimeout(() => location.assign('/anunciar.html'), 900);
  } catch (err) { feedback.className = 'error'; feedback.textContent = err.message; botao.disabled = false; }
};
// Completa telefone, cidade e UF aqui mesmo, sem sair do fluxo de anunciar.
function montarFormPerfil(perfil) {
  const dica = $('#perfilDica'); dica.className = 'gcard'; dica.style.cssText = 'padding:20px;display:flex;flex-direction:column;gap:14px;margin:12px 0';
  const campo = (rot, nome, extra = {}) => { const l = document.createElement('label'); l.className = 'lb'; l.textContent = rot; const i = document.createElement(extra.tag || 'input'); i.className = 'in'; i.name = nome; Object.assign(i, extra.props || {}); i.value = perfil[nome] || ''; l.append(i); return l; };
  const titulo = document.createElement('b'); titulo.textContent = 'Complete seus dados de contato';
  const sub = document.createElement('span'); sub.className = 'mu'; sub.style.fontSize = '14px'; sub.textContent = 'O locatário só vê o telefone depois que você aprovar o pedido.';
  const form = document.createElement('form'); form.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:12px;align-items:end';
  const uf = campo('UF', 'uf', { tag: 'select' }); const sel = uf.querySelector('select'); sel.append(new Option('—', ''));
  for (const u of 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')) sel.append(new Option(u, u)); sel.value = perfil.uf || '';
  const botao = document.createElement('button'); botao.className = 'btn bp'; botao.type = 'submit'; botao.textContent = 'Salvar dados';
  const msg = document.createElement('p'); msg.className = 'msg'; msg.setAttribute('role', 'status');
  form.append(campo('Telefone (WhatsApp)', 'telefone', { props: { type: 'tel', maxLength: 30, placeholder: '(00) 00000-0000', required: true } }), campo('Cidade', 'cidade', { props: { maxLength: 120, required: true } }), uf, botao);
  form.onsubmit = async e => {
    e.preventDefault(); const f = form.elements;
    if (!f.telefone.value.trim() || !f.cidade.value.trim() || !f.uf.value) { msg.className = 'msg erro'; msg.textContent = 'Preencha telefone, cidade e UF.'; return; }
    botao.disabled = true;
    try { await api('/api/perfil/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ telefone: f.telefone.value.trim(), cidade: f.cidade.value.trim(), uf: f.uf.value }) }); await carregar(); }
    catch (err) { msg.className = 'msg erro'; msg.textContent = err.message; botao.disabled = false; }
  };
  dica.replaceChildren(titulo, sub, form, msg);
}
carregar().catch(e => { status.className = 'notice error'; status.textContent = e.message; });

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
carregar().catch(e => { status.className = 'notice error'; status.textContent = e.message; });

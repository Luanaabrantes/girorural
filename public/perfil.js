(() => {
  const $ = id => document.getElementById(id);
  const form = $('formPerfil'), status = $('status');
  const CAMPOS = ['nome', 'nome_exibicao', 'email', 'telefone', 'cidade', 'uf', 'bio'];
  const PAPEIS = { ADMIN: 'Administrador', admin: 'Administrador', PROPRIETARIO: 'Proprietário', LOCATARIO: 'Locatário', usuario: 'Locatário' };
  let perfil;
  for (const uf of 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')) $('uf').append(new Option(uf, uf));

  const api = (url, opcoes = {}) => fetch(url, { cache: 'no-store', ...opcoes }).then(async r => {
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = Error(d.mensagem || 'Não foi possível concluir.'); e.status = r.status; throw e; }
    return d;
  });
  let tempo;
  const avisar = (texto, erro = false) => {
    const t = $('aviso'); t.textContent = texto; t.className = `toast${erro ? ' erro' : ''}`; t.hidden = false;
    clearTimeout(tempo); tempo = setTimeout(() => { t.hidden = true; }, erro ? 6000 : 3500);
  };
  const iniciais = () => (perfil.nome_exibicao || perfil.nome || 'G').trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();

  function mostrarIdentidade() {
    $('nomeMini').textContent = perfil.nome_exibicao || perfil.nome;
    $('papelMini').textContent = PAPEIS[perfil.role] || 'Conta GiroRural';
    $('linkAnunciante').hidden = !['LOCATARIO', 'usuario'].includes(perfil.role);
    const mini = $('avatarMini');
    mini.replaceChildren();
    if (perfil.foto_url) { const i = new Image(); i.alt = ''; i.src = perfil.foto_url; i.onerror = () => { mini.textContent = iniciais(); }; mini.append(i); }
    else mini.textContent = iniciais();
    const img = $('foto'), ini = $('iniciais');
    ini.textContent = iniciais(); ini.hidden = false; img.hidden = true; $('removerFoto').hidden = !perfil.foto_url;
    if (perfil.foto_url) { img.onload = () => { img.hidden = false; ini.hidden = true; }; img.src = perfil.foto_url; }
  }
  const contarBio = () => { $('bioConta').textContent = `${form.elements.bio.value.length}/300`; };

  async function carregar() {
    try {
      perfil = (await api('/api/perfil/me')).perfil;
      for (const c of CAMPOS) form.elements[c].value = perfil[c] || '';
      contarBio(); mostrarIdentidade();
      form.hidden = false; $('seguranca').hidden = false; $('perfilNav').hidden = false; status.hidden = true;
    } catch (e) {
      status.className = 'msg erro';
      if (e.status === 401) { status.textContent = 'Sua sessão expirou. '; const a = document.createElement('a'); a.href = '/login.html?voltar=/perfil.html'; a.textContent = 'Entrar novamente'; status.append(a); }
      else status.textContent = e.message === 'Failed to fetch' ? 'Não foi possível conectar ao servidor.' : e.message;
    }
  }

  form.elements.bio.addEventListener('input', contarBio);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.elements.nome.value.trim()) { avisar('Informe seu nome completo.', true); form.elements.nome.focus(); return; }
    const botao = e.submitter; if (botao) botao.disabled = true;
    const dados = Object.fromEntries(['nome', 'nome_exibicao', 'telefone', 'cidade', 'uf', 'bio'].map(c => [c, form.elements[c].value]));
    try {
      const d = await api('/api/perfil/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
      perfil = d.perfil; mostrarIdentidade(); avisar(d.mensagem || 'Perfil atualizado.');
    } catch (err) { avisar(err.message, true); } finally { if (botao) botao.disabled = false; }
  });

  $('fotoBotao').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fotoInput').click(); } });
  $('fotoInput').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024) { avisar('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.', true); e.target.value = ''; return; }
    const dados = new FormData(); dados.append('foto', f); avisar('Enviando foto…');
    try { const d = await api('/api/perfil/me/foto', { method: 'POST', body: dados }); perfil.foto_url = d.foto_url; mostrarIdentidade(); avisar(d.mensagem || 'Foto atualizada.'); }
    catch (err) { avisar(err.message, true); } finally { e.target.value = ''; }
  });
  $('removerFoto').addEventListener('click', async () => {
    const b = $('removerFoto'); b.disabled = true;
    try { const d = await api('/api/perfil/me/foto', { method: 'DELETE' }); perfil.foto_url = null; mostrarIdentidade(); avisar(d.mensagem || 'Foto removida.'); }
    catch (err) { avisar(err.message, true); } finally { b.disabled = false; }
  });

  $('trocarSenha').addEventListener('click', async () => {
    const b = $('trocarSenha'), m = $('segurancaMsg'); b.disabled = true;
    try {
      await api('/api/auth/esqueci-senha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: perfil.email }) });
      m.className = 'msg ok'; m.textContent = 'Pronto. Se o envio de e-mail estiver ativo, o link para criar a nova senha chega em alguns minutos.';
    } catch (err) { m.className = 'msg erro'; m.textContent = err.message; b.disabled = false; }
  });
  $('sair').addEventListener('click', async () => { try { await fetch('/api/auth/logout', { method: 'POST' }); } finally { location.assign('/'); } });

  // Destaca a seção visível no menu lateral.
  const links = [...document.querySelectorAll('.perfil-nav a.nv[href^="#"]')];
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle('ativo', a.hash === `#${en.target.id}`)); }), { rootMargin: '-30% 0px -60% 0px' });
    ['dados', 'localizacao', 'apresentacao', 'seguranca'].forEach(id => obs.observe($(id)));
  }
  carregar();
})();

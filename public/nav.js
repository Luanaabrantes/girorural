// Cabeçalho comum: monta a navegação conforme a sessão e os papéis da conta.
(function () {
  const header = document.querySelector('header.top');
  if (!header) return;
  let nav = header.querySelector('nav');
  if (!nav) { nav = document.createElement('nav'); header.append(nav); }
  nav.id = 'navPrincipal';
  nav.setAttribute('aria-label', 'Navegação principal');
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'nav-toggle'; toggle.setAttribute('aria-label', 'Abrir menu');
  toggle.setAttribute('aria-controls', 'navPrincipal'); toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  toggle.onclick = () => { const aberto = nav.classList.toggle('aberto'); toggle.setAttribute('aria-expanded', String(aberto)); };
  header.insertBefore(toggle, nav);
  const link = (href, texto, cls) => { const a = document.createElement('a'); a.href = href; a.textContent = texto; if (cls) a.className = cls; if (location.pathname === href.split(/[?#]/)[0]) a.setAttribute('aria-current', 'page'); return a; };
  const papel = r => ({ admin: 'ADMIN', usuario: 'LOCATARIO' }[r] || r);
  fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null).then(dados => {
    const usuario = dados?.usuario;
    window.giroUsuario = usuario || null;
    document.dispatchEvent(new CustomEvent('giro:sessao', { detail: usuario || null }));
    const itens = [link('/anuncios.html', 'Explorar')];
    if (!usuario) {
      itens.push(link('/anunciante.html', 'Anunciar equipamento'), link('/login.html', 'Entrar', 'button small outline'), link('/cadastro.html', 'Criar conta', 'button small'));
      nav.replaceChildren(...itens); return;
    }
    const p = papel(usuario.role);
    itens.push(link('/minhas-reservas.html', 'Minhas reservas'));
    if (p === 'PROPRIETARIO') itens.push(link('/painel.html', 'Minha garagem'));
    if (p === 'LOCATARIO') itens.push(link('/anunciante.html', 'Anunciar equipamento'));
    if (p === 'ADMIN') itens.push(link('/admin.html', 'Administração'));
    itens.push(link('/perfil.html', 'Meu perfil'));
    const user = document.createElement('span'); user.className = 'nav-user';
    const avatar = document.createElement('span'); avatar.className = 'nav-avatar'; avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = String(usuario.nome || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
    const sair = document.createElement('button'); sair.type = 'button'; sair.textContent = 'Sair';
    sair.onclick = async () => { try { await fetch('/api/auth/logout', { method: 'POST' }); } finally { location.assign('/'); } };
    user.append(avatar, sair);
    nav.replaceChildren(...itens, user);
  });
})();

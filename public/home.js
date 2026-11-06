(() => {
  const { el, svg, categorias, cardMaquina, vazio } = window.Giro;
  document.getElementById('categorias').replaceChildren(...categorias.map(c =>
    el('a', { class: 'cat', href: `/anuncios.html?categoria=${encodeURIComponent(c.n)}` },
      el('i', {}, svg(`<path d="${c.d}"/>`, '', 'width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round')),
      el('span', {}, c.n), el('span', { class: 'mu', style: 'font-size:13px;font-weight:400' }, 'Ver máquinas'))));
  const destaques = document.getElementById('destaques');
  fetch('/api/anuncios?limite=4', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject())
    .then(d => destaques.replaceChildren(...(d.anuncios.length ? d.anuncios.slice(0, 4).map(a => cardMaquina(a))
      : [vazio('Ainda não há máquinas anunciadas', 'Seja o primeiro a anunciar um equipamento na sua região.', el('a', { class: 'btn bs', href: '/anunciante.html' }, 'Anunciar minha máquina'))])))
    .catch(() => destaques.replaceChildren(vazio('Não foi possível carregar as máquinas', 'Tente novamente em instantes.')));
})();

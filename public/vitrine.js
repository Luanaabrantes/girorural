// Peças compartilhadas pelas telas públicas (início, catálogo e detalhe).
window.Giro = (() => {
  const el = (tag, attrs = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v === true ? '' : v);
    }
    e.append(...filhos.flat().filter(f => f !== undefined && f !== null && f !== false));
    return e;
  };
  const svg = (paths, cls = 'ic', extra = '') => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true');
    if (extra) s.setAttribute('style', extra);
    s.innerHTML = paths; return s;
  };
  const real = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
  const realCurto = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: Number(v) % 1 ? 2 : 0 }).format(Number(v));
  const PIN = '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>';
  const categorias = [
    { n: 'Tratores', d: 'M4 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0M16 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0M4 13V7h7l2 6h6v5M11 7V4' },
    { n: 'Colheitadeiras', d: 'M3 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M3 15V9h10v8M13 11h5l3 4v2M7 9V5h4M1 6h4' },
    { n: 'Plantadeiras', d: 'M4 6h16M6 6v6M10 6v6M14 6v6M18 6v6M6 16v2M10 16v2M14 16v2M18 16v2' },
    { n: 'Pulverizadores', d: 'M12 3v6M8 9h8v4H8zM4 13h16M6 17v.01M10 17v.01M14 17v.01M18 17v.01M8 21v.01M12 21v.01M16 21v.01' },
    { n: 'Preparo do solo', d: 'M3 12h18M4 12a2.5 4 0 1 0 5 0a2.5 4 0 1 0-5 0M10 12a2.5 4 0 1 0 5 0a2.5 4 0 1 0-5 0M16 12a2.5 4 0 1 0 5 0a2.5 4 0 1 0-5 0' },
    { n: 'Transporte', d: 'M2 7h14v8H2zM16 11h4l2 3v1h-6M5 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0' },
    { n: 'Distribuidores', d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z' }
  ];
  const foto = (a, altura) => {
    const ph = el('div', { class: 'ph', style: `height:${altura}px` });
    if (a.foto_url) {
      const img = el('img', { src: a.foto_url, alt: `${a.nome}`, loading: 'lazy' });
      img.onerror = () => { img.remove(); ph.append(`[Foto indisponível]`); };
      ph.append(img);
    } else ph.append(`[Sem foto: ${a.nome}]`);
    ph.append(el('span', { class: 'bg bg-ok', style: 'position:absolute;top:12px;left:12px' }, 'Disponível'));
    return ph;
  };
  const cardMaquina = (a, { altura = 210, compacto = false } = {}) => {
    const spec = [a.marca, a.modelo, a.ano].filter(Boolean).join(' · ') || a.categoria;
    const local = el('div', { class: 'mu', style: 'font-size:14px;display:flex;gap:4px;align-items:center' }, svg(PIN, '', 'width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.75'), `${a.cidade}/${a.uf}`);
    const corpo = el('div', { class: 'corpo' },
      el('b', {}, a.nome),
      el('div', { class: 'mu', style: 'font-size:14px' }, spec),
      local,
      el('div', { class: 'preco', style: compacto ? 'font-size:16px' : '' }, realCurto(a.diaria), ' ', el('small', {}, '/ diária')));
    return el('a', { href: `/anuncio.html?id=${encodeURIComponent(a.id)}`, class: 'gcard maq' }, foto(a, altura), corpo);
  };
  const vazio = (titulo, texto, link) => el('div', { class: 'gcard', style: 'grid-column:1/-1;padding:40px;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center' },
    el('b', { style: 'font-size:18px' }, titulo), el('p', { class: 'mu' }, texto), link || '');
  return { el, svg, real, realCurto, categorias, cardMaquina, vazio, PIN };
})();

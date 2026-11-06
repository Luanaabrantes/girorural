(() => {
  const { el, svg, categorias, cardMaquina, vazio } = window.Giro;
  const form = document.getElementById('filtros'), lista = document.getElementById('anuncios'), statusEl = document.getElementById('status');
  const chips = document.getElementById('chips'), pag = document.getElementById('paginacao');
  const LIMITE = 12, nomes = { busca: 'Busca', cidade: 'Cidade', categoria: 'Categoria', diaria_min: 'Diária mín.', diaria_max: 'Diária máx.' };
  document.getElementById('filtroCategorias').append(...categorias.map(c => el('label', { class: 'ck' }, el('input', { type: 'radio', name: 'categoria', value: c.n }), c.n)));

  // Os filtros vivem na URL, assim a busca da página inicial e o botão Voltar funcionam.
  const daUrl = () => {
    const q = new URLSearchParams(location.search);
    for (const campo of form.elements) {
      if (!campo.name) continue;
      if (campo.type === 'radio') campo.checked = (q.get(campo.name) || '') === campo.value;
      else campo.value = q.get(campo.name) || (campo.tagName === 'SELECT' ? campo.options[0].value : '');
    }
    for (const c of document.querySelectorAll('[form="filtros"]')) c.value = q.get(c.name) || (c.tagName === 'SELECT' ? c.options[0].value : '');
    return q;
  };
  const paraUrl = (pagina = 1) => {
    const q = new URLSearchParams(new FormData(form));
    for (const c of document.querySelectorAll('[form="filtros"]')) q.set(c.name, c.value);
    for (const [k, v] of [...q]) if (!String(v).trim() || (k === 'ordenar' && v === 'recentes')) q.delete(k);
    if (pagina > 1) q.set('pagina', pagina);
    history.pushState(null, '', '?' + q); carregar();
  };
  const fechar = '<path d="M18 6 6 18M6 6l12 12"/>';

  async function carregar() {
    const q = daUrl(), pagina = Number(q.get('pagina') || 1);
    const cat = q.get('categoria'), cidade = q.get('cidade');
    const titulo = cat && cidade ? `${cat} em ${cidade}` : cat || (cidade ? `Máquinas em ${cidade}` : 'Máquinas disponíveis');
    document.getElementById('titulo').textContent = titulo; document.getElementById('trilha').textContent = titulo;
    document.title = `${titulo} · GiroRural`;
    chips.replaceChildren(...[...q].filter(([k]) => nomes[k]).map(([k, v]) => {
      const b = el('button', { type: 'button', class: 'chip on', 'aria-label': `Remover filtro ${nomes[k]}: ${v}` }, k.startsWith('diaria') ? `${nomes[k]} R$ ${v}` : v, svg(fechar, '', 'width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round'));
      b.onclick = () => { const n = new URLSearchParams(location.search); n.delete(k); n.delete('pagina'); history.pushState(null, '', '?' + n); carregar(); };
      return b;
    }));
    if (chips.children.length) { const limpar = el('button', { type: 'button', class: 'chip', style: 'border:0;background:transparent;color:#1F6B3A;font-weight:600' }, 'Limpar tudo'); limpar.onclick = () => { history.pushState(null, '', location.pathname); carregar(); }; chips.append(limpar); }
    statusEl.textContent = 'Buscando máquinas…'; lista.setAttribute('aria-busy', 'true'); pag.replaceChildren();
    const api = new URLSearchParams(q); api.set('limite', LIMITE);
    try {
      const r = await fetch('/api/anuncios?' + api, { cache: 'no-store' }), d = await r.json();
      if (!r.ok) throw Error(d.mensagem || 'Não foi possível carregar as máquinas.');
      const n = d.anuncios.length;
      statusEl.textContent = n ? `${n === LIMITE ? `Mostrando ${n}` : n} ${n === 1 ? 'máquina disponível' : 'máquinas disponíveis'}${pagina > 1 ? ` · página ${pagina}` : ''}` : 'Nenhuma máquina encontrada';
      lista.replaceChildren(...(n ? d.anuncios.map(a => cardMaquina(a, { altura: 190 }))
        : [vazio('Nenhuma máquina com esses filtros', 'Tente outra cidade, categoria ou faixa de preço.')]));
      if (pagina > 1 || n === LIMITE) {
        const botao = (rotulo, alvo, ativo, atual) => { const b = el('button', { type: 'button', class: `btn ${atual ? 'bp' : 'bt'}`, style: `padding:0;width:44px;${atual ? '' : 'border:1px solid #EDEBE7;background:#fff'}`, 'aria-label': rotulo.length > 2 ? rotulo : undefined, 'aria-current': atual ? 'page' : undefined, disabled: !ativo }, rotulo.length > 2 ? svg(rotulo === 'Página anterior' ? '<path d="m15 18-6-6 6-6"/>' : '<path d="m9 18 6-6-6-6"/>') : rotulo); if (ativo && !atual) b.onclick = () => paraUrl(alvo); return b; };
        pag.replaceChildren(botao('Página anterior', pagina - 1, pagina > 1), botao(String(pagina), pagina, true, true), botao('Próxima página', pagina + 1, n === LIMITE));
      }
    } catch (e) { statusEl.textContent = e.message; lista.replaceChildren(); }
    finally { lista.removeAttribute('aria-busy'); }
  }
  form.addEventListener('submit', e => { e.preventDefault(); paraUrl(); });
  for (const c of document.querySelectorAll('select[form="filtros"]')) c.addEventListener('change', () => paraUrl());
  for (const r of form.querySelectorAll('input[type=radio]')) r.addEventListener('change', () => paraUrl());
  document.getElementById('buscaTopo').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); paraUrl(); } });
  addEventListener('popstate', carregar);
  carregar();
})();

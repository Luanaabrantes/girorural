(() => {
  const { el, svg, real, realCurto, cardMaquina, PIN } = window.Giro;
  const statusEl = document.getElementById('status'), root = document.getElementById('detalhe'), box = document.getElementById('lightbox');
  const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const papelLocacao = r => ['LOCATARIO', 'usuario', 'PROPRIETARIO'].includes(r);
  const ICONES = {
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
  };

  // Fotos de catálogo com licença livre exigem crédito ao autor (Wikimedia Commons).
  function creditoFoto(a) {
    const p = el('p', { class: 'mu', style: 'font-size:12px;margin:-12px 0 0' });
    const m = /\/imagens\/catalogo\/maquinas\/([a-z0-9-]+\.(?:jpg|png|webp))$/.exec(a.foto_url || '');
    if (!m) return p;
    fetch('/imagens/catalogo/maquinas/manifest.json').then(r => r.ok ? r.json() : []).then(lista => {
      const c = lista.find(x => x.arquivo === m[1]); if (!c) return;
      p.append('Foto ilustrativa: ', c.autor || 'autor desconhecido', ' · ', el('a', { href: c.licenca_url || c.fonte, target: '_blank', rel: 'noopener' }, c.licenca), ' · ', el('a', { href: c.fonte, target: '_blank', rel: 'noopener' }, 'Wikimedia Commons'));
    }).catch(() => {});
    return p;
  }
  function galeria(a) {
    const fotos = (Array.isArray(a.fotos) && a.fotos.length ? a.fotos : (a.foto_url ? [{ foto_url: a.foto_url, principal: true }] : []))
      .slice().sort((x, y) => (y.principal ? 1 : 0) - (x.principal ? 1 : 0));
    const ph = (i, rotulo, altura, extra = '') => {
      const f = fotos[i], b = el('button', { type: 'button', class: 'ph', style: `min-height:${altura}px;${extra}`, 'aria-label': rotulo });
      if (f) { b.append(el('img', { src: f.foto_url, alt: '' })); b.onclick = () => abrir(i); } else { b.disabled = true; b.style.cursor = 'default'; b.append(i === 0 ? '[Sem foto]' : ''); }
      return b;
    };
    function abrir(i) {
      let atual = i;
      const img = el('img', { alt: '' }), legenda = el('span', { style: 'font-size:15px' });
      const miniaturas = el('div', { style: 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap' });
      const mostrar = () => {
        img.src = fotos[atual].foto_url; img.alt = `${a.nome}, foto ${atual + 1}`;
        legenda.textContent = `${atual + 1} / ${fotos.length} · ${a.nome}`;
        miniaturas.querySelectorAll('button').forEach((m, j) => { m.style.outline = j === atual ? '3px solid #F2B705' : ''; m.style.opacity = j === atual ? '1' : '.6'; });
      };
      const passo = d => { atual = (atual + d + fotos.length) % fotos.length; mostrar(); };
      fotos.forEach((f, j) => miniaturas.append(el('button', { type: 'button', class: 'ph', 'aria-label': `Foto ${j + 1}`, style: 'width:88px;height:60px;border-radius:6px;border:0;padding:0;cursor:pointer', onclick: () => { atual = j; mostrar(); } }, el('img', { src: f.foto_url, alt: '' }))));
      const fecharBtn = el('button', { type: 'button', class: 'btn' }, svg('<path d="M18 6 6 18M6 6l12 12"/>'), 'Fechar');
      const seta = (d, rot, p) => el('button', { type: 'button', class: 'btn', 'aria-label': rot, style: 'padding:0;width:52px;min-height:52px;border-radius:999px', onclick: () => passo(d) }, svg(p));
      const gatilho = document.activeElement;
      const teclas = e => { if (e.key === 'Escape') fechar(); if (e.key === 'ArrowRight') passo(1); if (e.key === 'ArrowLeft') passo(-1); };
      function fechar() { box.hidden = true; box.replaceChildren(); document.removeEventListener('keydown', teclas); gatilho?.focus(); }
      fecharBtn.onclick = fechar;
      box.replaceChildren(
        el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, legenda, fecharBtn),
        el('div', { style: 'flex:1;display:flex;align-items:center;gap:16px;min-height:0' },
          fotos.length > 1 ? seta(-1, 'Foto anterior', '<path d="m15 18-6-6 6-6"/>') : '',
          el('div', { style: 'flex:1;height:100%;min-height:0;display:flex' }, img),
          fotos.length > 1 ? seta(1, 'Próxima foto', '<path d="m9 18 6-6-6-6"/>') : ''),
        fotos.length > 1 ? miniaturas : '');
      box.hidden = false; document.addEventListener('keydown', teclas); mostrar(); fecharBtn.focus();
    }
    const grade = el('div', { class: 'galeria' }, ph(0, 'Abrir galeria em tela cheia', 440, 'grid-row:span 2'));
    if (fotos.length > 1) {
      const lado = el('div', { style: 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px' });
      for (let i = 1; i <= 3; i++) lado.append(ph(i, `Foto ${i + 1}`, 216));
      lado.append(el('button', { type: 'button', class: 'ph', style: 'min-height:216px;cursor:zoom-in;align-items:center;justify-content:center;background-color:#24432F;background-image:none;color:#fff;font-size:15px;font-weight:600;border:0', onclick: () => abrir(0) }, `Ver as ${fotos.length} fotos`));
      grade.append(lado);
    } else grade.style.gridTemplateColumns = '1fr';
    return grade;
  }

  function reserva(a, usuario) {
    const ini = el('input', { type: 'date', required: true, min: hoje() }), fim = el('input', { type: 'date', required: true, min: hoje() });
    const obs = el('textarea', { rows: 2, maxlength: 1000, placeholder: 'Finalidade, local de entrega, se precisa de operador…' });
    const linhas = el('div', { style: 'display:flex;flex-direction:column;gap:10px;font-size:15px' });
    const msg = el('p', { class: 'msg', role: 'status', style: 'text-align:center' });
    const demo = Boolean(a.demonstrativo), podePedir = usuario && papelLocacao(usuario.role);
    const enviar = el('button', { class: 'btn bp', style: 'width:100%;min-height:52px;font-size:16px' }, demo ? 'Calcular prévia' : usuario ? 'Solicitar reserva' : 'Entrar para reservar');
    const diarias = () => ini.value && fim.value ? Math.round((Date.parse(fim.value + 'T00:00:00Z') - Date.parse(ini.value + 'T00:00:00Z')) / 86400000) : 0;
    const atualizar = () => {
      if (ini.value) { const n = new Date(ini.value + 'T00:00:00Z'); n.setUTCDate(n.getUTCDate() + 1); fim.min = n.toISOString().slice(0, 10); }
      const n = diarias();
      linhas.replaceChildren(...(n > 0 ? [
        el('div', { class: 'linha' }, el('span', {}, `${real(a.diaria)} × ${n} ${n === 1 ? 'diária' : 'diárias'}`), el('span', {}, real(a.diaria * n))),
        el('div', { class: 'linha', style: 'border-top:1px solid #EDEBE7;padding-top:12px;font-weight:800;font-size:17px' }, el('span', {}, 'Total'), el('span', {}, real(a.diaria * n)))
      ] : [el('p', { class: 'mu', style: 'font-size:14px;text-align:center' }, 'Escolha as datas para ver o total.')]));
    };
    ini.onchange = fim.onchange = atualizar; atualizar();
    const form = el('form', { class: 'gcard', style: 'padding:24px;display:flex;flex-direction:column;gap:18px;box-shadow:0 12px 32px rgba(30,30,30,.10)' },
      el('div', { style: 'display:flex;align-items:baseline;gap:6px' }, el('span', { style: 'font-size:28px;font-weight:800;color:#1F6B3A' }, realCurto(a.diaria)), el('span', { class: 'mu' }, '/ diária')),
      el('div', { class: 'reserva-box' },
        el('label', { style: 'border-right:1px solid #CFCAC1' }, el('span', {}, 'Retirada'), ini),
        el('label', {}, el('span', {}, 'Devolução'), fim),
        el('label', { style: 'grid-column:span 2;border-top:1px solid #CFCAC1' }, el('span', {}, 'Mensagem ao proprietário (opcional)'), obs)),
      enviar,
      el('p', { class: 'mu', style: 'font-size:13px;text-align:center' }, demo ? 'Anúncio de exemplo: a prévia não cria pedido nem cobra nada.' : 'Você só paga depois que o proprietário aprovar.'),
      linhas, msg);
    form.onsubmit = async e => {
      e.preventDefault(); msg.className = 'msg';
      if (!usuario && !demo) { location.assign(`/login.html?voltar=${encodeURIComponent(location.pathname + location.search)}`); return; }
      if (diarias() < 1) { msg.classList.add('erro'); msg.textContent = 'Escolha a retirada e uma devolução depois dela.'; return; }
      if (demo) { msg.classList.add('ok'); msg.textContent = 'Prévia calculada. Este anúncio de exemplo não recebe pedidos.'; return; }
      if (!podePedir) { msg.classList.add('erro'); msg.textContent = 'Contas administrativas não solicitam locações.'; return; }
      enviar.disabled = true; msg.textContent = 'Enviando solicitação…';
      try {
        const r = await fetch('/api/reservas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ anuncio_id: a.id, inicio: ini.value, fim: fim.value, ...(obs.value.trim() ? { observacao: obs.value.trim() } : {}) }) });
        const d = await r.json(); if (!r.ok) throw Error(d.mensagem || 'Não foi possível solicitar a reserva.');
        msg.classList.add('ok'); msg.textContent = 'Solicitação enviada! Abrindo o acompanhamento…';
        setTimeout(() => location.assign(`/reserva.html?id=${d.id}`), 900);
      } catch (err) { msg.classList.add('erro'); msg.textContent = err.message; enviar.disabled = false; }
    };
    return el('aside', { 'aria-label': 'Reserva', class: 'reserva-lado', style: 'flex:1 1 340px;max-width:400px;position:sticky;top:96px' }, form);
  }

  const secao = (titulo, ...conteudo) => el('section', { class: 'sec' }, el('h2', { class: 'h2' }, titulo), ...conteudo);
  const cond = (icone, titulo, texto) => el('div', { class: 'cond' }, el('span', {}, svg(ICONES[icone])), el('div', { style: 'display:flex;flex-direction:column;gap:4px' }, el('b', {}, titulo), el('span', { class: 'mu', style: 'font-size:14px;line-height:1.5;white-space:pre-line' }, texto)));

  async function carregar() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id || !/^[1-9]\d*$/.test(id)) { statusEl.textContent = 'Anúncio não encontrado.'; return; }
    try {
      const [r, usuario] = await Promise.all([
        fetch(`/api/anuncios/${id}`, { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }).then(x => x.ok ? x.json() : null).then(x => x?.usuario || null).catch(() => null)]);
      const d = await r.json(); if (!r.ok) throw Error(d.mensagem || 'Este anúncio não está disponível.');
      const a = d.anuncio; document.title = `${a.nome} · GiroRural`;
      const trilha = el('nav', { 'aria-label': 'Você está em', style: 'display:flex;gap:8px;font-size:14px;flex-wrap:wrap' },
        el('a', { href: '/' }, 'Início'), el('span', { class: 'mu', 'aria-hidden': 'true' }, '/'),
        el('a', { href: `/anuncios.html?categoria=${encodeURIComponent(a.categoria)}` }, a.categoria), el('span', { class: 'mu', 'aria-hidden': 'true' }, '/'),
        el('span', { class: 'mu', 'aria-current': 'page' }, a.nome));
      const topo = el('div', { style: 'display:flex;flex-direction:column;gap:10px' },
        el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, el('span', { class: 'bg bg-ok', style: 'background:#DDF3E5' }, 'Disponível'), el('span', { class: 'bg', style: 'background:#F5ECE3;color:#6E4520' }, a.categoria), a.demonstrativo ? el('span', { class: 'bg', style: 'background:#FDF3D0;color:#7A5B00' }, 'Anúncio de exemplo') : ''),
        el('h1', { style: 'font-size:clamp(28px,3vw,36px);font-weight:800;letter-spacing:-.025em;margin:0' }, a.nome),
        el('div', { class: 'mu', style: 'display:flex;gap:6px;align-items:center;font-size:15px' }, svg(PIN, '', 'width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.75'), `${a.cidade}/${a.uf}`));
      const compartilhar = el('button', { type: 'button', class: 'btn bt', style: 'border:1px solid #EDEBE7;background:#fff' }, svg('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>'), 'Compartilhar');
      compartilhar.onclick = async () => { try { if (navigator.share) await navigator.share({ title: a.nome, url: location.href }); else { await navigator.clipboard.writeText(location.href); compartilhar.lastChild.textContent = 'Link copiado'; } } catch {} };
      const cabeca = el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap' }, topo, compartilhar);

      const conteudo = el('div', { style: 'flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:32px' });
      if (!a.demonstrativo) {
        const nome = a.proprietario?.nome || 'Proprietário';
        const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
        conteudo.append(el('div', { class: 'gcard', style: 'padding:20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap' },
          el('span', { style: 'width:56px;height:56px;border-radius:999px;background:#E8F3EC;color:#1F6B3A;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px', 'aria-hidden': 'true' }, iniciais),
          el('div', { style: 'flex:1;display:flex;flex-direction:column;gap:4px;min-width:200px' }, el('b', { style: 'font-size:17px' }, nome), el('span', { class: 'mu', style: 'font-size:14px' }, 'Proprietário · aprova cada pedido em até 24 h')),
          a.proprietario?.id ? el('a', { class: 'btn bo', href: `/proprietario.html?id=${encodeURIComponent(a.proprietario.id)}` }, 'Ver perfil') : ''));
      }
      conteudo.append(secao('Descrição', el('p', { style: 'font-size:16px;line-height:1.65;white-space:pre-line' }, a.descricao || 'O proprietário ainda não escreveu uma descrição.')));
      const ficha = [['Categoria', a.categoria], ['Marca', a.marca], ['Modelo', a.modelo], ['Ano', a.ano], ['Localização', `${a.cidade}/${a.uf}`], ['Diária', real(a.diaria)]];
      conteudo.append(secao('Ficha técnica', el('div', { class: 'gcard', style: 'overflow:hidden;box-shadow:none' }, el('table', { class: 'ficha' }, el('tbody', {}, ficha.map(([k, v]) => el('tr', {}, el('th', { scope: 'row' }, k), el('td', {}, v ? String(v) : 'Não informado'))))))));
      const condicoes = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:20px' },
        cond('doc', 'Condições do proprietário', a.condicoes || 'A combinar com o proprietário.'),
        cond('escudo', 'Pagamento após a aprovação', 'O valor só é cobrado depois que o proprietário aceitar o pedido.'),
        cond('cal', 'Período por diárias', 'O total considera a quantidade de diárias entre a retirada e a devolução.'));
      if (a.informacoes_adicionais) condicoes.append(cond('info', 'Informações úteis', a.informacoes_adicionais));
      conteudo.append(secao('Condições de locação', condicoes));
      const semelhantes = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:20px' });
      const blocoSemelhantes = el('section', { style: 'display:flex;flex-direction:column;gap:16px', hidden: true }, el('h2', { class: 'h2' }, 'Máquinas semelhantes'), semelhantes);
      conteudo.append(blocoSemelhantes);
      fetch(`/api/anuncios?categoria=${encodeURIComponent(a.categoria)}&limite=4`).then(x => x.ok ? x.json() : null).then(s => {
        const outros = (s?.anuncios || []).filter(o => o.id !== a.id).slice(0, 3);
        if (outros.length) { semelhantes.replaceChildren(...outros.map(o => cardMaquina(o, { altura: 140, compacto: true }))); blocoSemelhantes.hidden = false; }
      }).catch(() => {});

      root.replaceChildren(trilha, cabeca, galeria(a), creditoFoto(a), el('div', { style: 'display:flex;flex-wrap:wrap;gap:48px;align-items:flex-start;margin-top:16px' }, conteudo, reserva(a, usuario)));
      root.hidden = false; statusEl.remove();
    } catch (e) { statusEl.textContent = e.message; }
  }
  carregar();
})();

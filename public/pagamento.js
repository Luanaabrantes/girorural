(() => {
  const { el, svg } = window.Giro;
  const raiz = document.getElementById('raiz');
  const q = new URLSearchParams(location.search);
  const id = q.get('reserva_id'), resultado = q.get('resultado');
  const moeda = (v, m = 'BRL') => v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: m || 'BRL' }).format(Number(v));
  const dataBR = v => { if (!v) return '—'; const s = String(v).slice(0, 10).split('-'); return `${s[2]}/${s[1]}/${s[0]}`; };
  const dataHora = v => v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' às') : '';
  const api = (url, opcoes = {}) => fetch(url, { cache: 'no-store', ...opcoes }).then(async r => {
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(Error(d.mensagem || 'Não foi possível concluir.'), { status: r.status });
    return d;
  });
  const I = {
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    cartao: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>', escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'
  };
  const icone = (p, tam, cor = 'currentColor', w = 2) => svg(p, '', `width:${tam}px;height:${tam}px;fill:none;stroke:${cor};stroke-width:${w};stroke-linecap:round;stroke-linejoin:round;flex:none`);

  if (!/^[1-9]\d*$/.test(id || '')) { mostrarErro('Não encontramos qual reserva você quer pagar.'); return; }
  document.getElementById('voltar').href = `/reserva.html?id=${id}`;
  document.getElementById('voltar').lastChild.textContent = 'Voltar à reserva';

  function mostrarErro(texto, login) {
    const p = el('p', { class: 'msg erro', role: 'status' }, texto);
    if (login) p.append(' ', el('a', { href: `/login.html?voltar=${encodeURIComponent(location.pathname + location.search)}` }, 'Entrar'));
    raiz.replaceChildren(p);
  }

  function resumo(r, p) {
    const e = r.equipamento || {};
    const foto = el('div', { class: 'ph', style: 'width:96px;height:72px;border-radius:8px;flex:none;padding:0' });
    if (e.foto_url) foto.append(el('img', { src: e.foto_url, alt: '' }));
    const diarias = Number(p.diarias || r.diarias) || 0, total = p.valor_total ?? r.valor_total;
    return el('aside', { class: 'gcard', style: 'flex:1 1 340px;max-width:420px;padding:24px;display:flex;flex-direction:column;gap:16px', 'aria-label': 'Resumo do pedido' },
      el('b', { style: 'font-size:18px' }, 'Resumo do pedido'),
      el('div', { style: 'display:flex;gap:14px' }, foto, el('div', { style: 'display:flex;flex-direction:column;gap:3px;min-width:0' },
        el('b', { style: 'font-size:15px' }, e.nome || 'Equipamento'),
        el('span', { class: 'mu', style: 'font-size:13px' }, `Reserva #${r.id}${e.cidade ? ` · ${e.cidade}/${e.uf}` : ''}`),
        el('span', { style: 'font-size:13px' }, `${dataBR(p.inicio || r.inicio)} → ${dataBR(p.fim || r.fim)}`))),
      el('div', { style: 'border-top:1px solid #EDEBE7;padding-top:14px;display:flex;flex-direction:column;gap:10px' },
        e.diaria != null && diarias ? el('div', { class: 'kv' }, el('span', {}, `${diarias} ${diarias === 1 ? 'diária' : 'diárias'} × ${moeda(e.diaria)}`), el('span', {}, moeda(Number(e.diaria) * diarias))) : '',
        el('div', { class: 'kv', style: 'border-top:1px solid #EDEBE7;padding-top:12px;font-weight:800;font-size:19px' }, el('span', {}, 'Total'), el('span', {}, moeda(total, p.moeda)))),
      el('div', { style: 'background:#E3EEFA;color:#1F4F86;border-radius:10px;padding:14px;font-size:14px;line-height:1.5' }, 'O valor é cobrado uma única vez. Sem taxas extras do GiroRural nesta versão.'));
  }

  function telaCheckout(r, p) {
    const dono = r.contraparte?.nome ? r.contraparte.nome.split(' ')[0] : 'o proprietário';
    const sub = el('p', { class: 'mu', style: 'font-size:16px;line-height:1.5' }, `Reserva aprovada por ${dono}.`);
    if (p.aprovacao_expira_em) sub.append(' Conclua até ', el('b', { style: 'color:#1E1E1E' }, dataHora(p.aprovacao_expira_em)), ' para garantir as datas.');
    const msg = el('p', { class: 'msg', role: 'status', 'aria-live': 'polite' });
    const botao = el('button', { class: 'btn bp', type: 'button', style: 'min-height:52px;padding:0 28px;font-size:16px' }, `Pagar ${moeda(p.valor_total, p.moeda)} com cartão`);
    botao.onclick = async () => {
      botao.disabled = true; msg.className = 'msg'; msg.textContent = 'Abrindo o pagamento seguro…';
      try { const d = await api(`/api/locacao/reservas/${id}/checkout`, { method: 'POST' }); location.assign(d.url); }
      catch (e) { msg.className = 'msg erro'; msg.textContent = e.message; botao.disabled = false; }
    };
    const passos = ['Você vai para a página segura do Stripe para digitar o cartão.', 'O GiroRural não vê nem guarda os dados do seu cartão.', 'A reserva só fica paga quando o Stripe confirma o pagamento.'];
    const secao = el('section', { style: 'flex:999 1 520px;min-width:0;display:flex;flex-direction:column;gap:24px' },
      el('div', { style: 'display:flex;flex-direction:column;gap:6px' }, el('h1', { style: 'font-size:32px;font-weight:700;letter-spacing:-.02em' }, 'Pagamento'), sub),
      el('div', { role: 'radiogroup', 'aria-label': 'Forma de pagamento', style: 'display:flex;gap:12px' },
        el('div', { role: 'radio', 'aria-checked': 'true', class: 'metodo', style: 'flex:1' }, icone(I.cartao, 22, 'currentColor', 1.75), 'Cartão de crédito')),
      el('div', { class: 'gcard', style: 'padding:28px;display:flex;flex-direction:column;gap:16px' },
        el('b', { style: 'font-size:18px;display:flex;gap:10px;align-items:center' }, icone(I.escudo, 22, '#1F6B3A'), 'Como funciona'),
        el('ol', { class: 'mu', style: 'margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:15px;line-height:1.5' }, passos.map(t => el('li', {}, t)))),
      el('div', { style: 'display:flex;flex-direction:column;gap:12px' }, el('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, botao, el('a', { class: 'btn bo', href: `/reserva.html?id=${id}`, style: 'min-height:52px' }, 'Voltar à reserva')), msg));
    raiz.replaceChildren(el('div', { style: 'display:flex;flex-wrap:wrap;gap:40px;align-items:flex-start' }, secao, resumo(r, p)));
  }

  function telaResultado(tipo, r, p, extra) {
    const conf = {
      ok: { selo: 'ok', ic: I.check, titulo: 'Pagamento confirmado', texto: 'Sua reserva está garantida. O proprietário já foi avisado e os contatos estão liberados na página da reserva.' },
      espera: { selo: 'espera', ic: I.relogio, titulo: 'Confirmando seu pagamento', texto: 'Recebemos o seu retorno do Stripe e estamos aguardando a confirmação. Isso costuma levar poucos segundos.' },
      falha: { selo: 'falha', ic: I.x, titulo: 'Pagamento não concluído', texto: extra || 'Nenhum valor foi cobrado.' }
    }[tipo];
    const e = r.equipamento || {};
    const linhas = [['Reserva', `#${r.id}`], ['Máquina', e.nome || '—'], ['Período', `${dataBR(p.inicio)} a ${dataBR(p.fim)}`]];
    if (tipo === 'ok') linhas.push(['Forma', 'Cartão de crédito · Stripe (teste)']);
    const acoes = tipo === 'falha'
      ? [el('a', { class: 'btn bp', href: `/pagamento.html?reserva_id=${id}` }, 'Tentar de novo'), el('a', { class: 'btn bo', href: `/reserva.html?id=${id}` }, 'Voltar à reserva')]
      : [el('a', { class: 'btn bp', href: `/reserva.html?id=${id}` }, 'Ver detalhes da reserva'), el('a', { class: 'btn bo', href: '/minhas-reservas.html' }, 'Minhas reservas')];
    const lista = el('div', {}, linhas.map(([k, v]) => el('div', { class: 'kv-l' }, el('span', { class: 'mu' }, k), el('span', { style: 'text-align:right' }, v))),
      el('div', { class: 'kv-l', style: 'border-bottom:0;font-weight:800;font-size:18px' }, el('span', {}, tipo === 'ok' ? 'Total pago' : 'Total'), el('span', {}, moeda(p.valor_total, p.moeda))));
    const ajuda = tipo === 'falha' ? el('div', { style: 'background:#FAF9F6;border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:8px;font-size:15px;line-height:1.5' },
      el('b', {}, 'O que você pode fazer'), el('span', {}, '• Conferir os dados e o limite do cartão'), el('span', {}, '• Usar outro cartão de crédito'),
      el('span', { class: 'mu', style: 'font-size:13px' }, 'No modo de teste, o cartão 4000 0000 0000 0002 sempre é recusado.')) : '';
    raiz.replaceChildren(el('div', { style: 'display:flex;justify-content:center;padding:16px 0' }, el('div', { class: 'resultado' },
      el('div', { style: 'display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px' },
        el('span', { class: `selo ${conf.selo}` }, icone(conf.ic, 40, '#fff', 2.6)),
        el('h1', { style: 'font-size:30px;font-weight:800;letter-spacing:-.02em;margin-top:8px' }, conf.titulo),
        el('p', { class: 'mu', style: 'font-size:16px;line-height:1.5', role: 'status' }, conf.texto)),
      lista, ajuda, el('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center' }, acoes))));
  }

  async function carregar() {
    const [{ reserva: r }, { reserva: p }] = await Promise.all([api(`/api/reservas/${id}`), api(`/api/locacao/reservas/${id}/pagamento`)]);
    return { r, p };
  }

  (async () => {
    let r, p;
    try { ({ r, p } = await carregar()); }
    catch (e) { return mostrarErro(e.status === 401 ? 'Sua sessão expirou.' : e.message === 'Failed to fetch' ? 'Não foi possível conectar ao servidor.' : e.message, e.status === 401); }
    const prazo = p.aprovacao_expira_em ? ` Sua reserva continua aprovada até ${dataHora(p.aprovacao_expira_em)}.` : '';
    if (p.pagamento_status === 'pago') return telaResultado('ok', r, p);
    if (resultado === 'cancelado') return telaResultado('falha', r, p, `Você saiu do pagamento antes de concluir. Nenhum valor foi cobrado.${prazo}`);
    if (resultado === 'sucesso') {
      telaResultado('espera', r, p);
      for (let i = 0; i < 10; i++) {
        await new Promise(ok => setTimeout(ok, 2000));
        try { p = (await api(`/api/locacao/reservas/${id}/pagamento`)).reserva; } catch { continue; }
        if (p.pagamento_status === 'pago') return telaResultado('ok', r, p);
        if (['falho', 'expirado'].includes(p.pagamento_status)) break;
      }
      if (!['falho', 'expirado'].includes(p.pagamento_status)) {
        const t = raiz.querySelector('[role=status]'); if (t) t.textContent = 'A confirmação ainda está a caminho. Você pode acompanhar pela página da reserva; ela é atualizada assim que o Stripe confirmar.';
        return;
      }
    }
    if (p.pagamento_status === 'falho') return telaResultado('falha', r, p, `O cartão foi recusado. Nenhum valor foi cobrado.${prazo}`);
    if (p.pagamento_status === 'expirado' && !p.pode_pagar) return telaResultado('falha', r, p, 'O prazo de pagamento terminou e nenhum valor foi cobrado.');
    if (p.pode_pagar) {
      if (['checkout_aberto', 'pendente', 'criando'].includes(p.pagamento_status) && resultado !== 'cancelado') return telaResultado('espera', r, p);
      return telaCheckout(r, p);
    }
    const motivo = { solicitada: 'Esta reserva ainda aguarda a aprovação do proprietário. O pagamento é liberado depois que ele aprovar.', recusada: 'Esta reserva foi recusada, então não há nada a pagar.', cancelada: 'Esta reserva foi cancelada, então não há nada a pagar.', concluida: 'Esta reserva já foi concluída.' }[p.estado] || 'O pagamento desta reserva não está disponível para a sua conta.';
    raiz.replaceChildren(el('div', { class: 'gcard', style: 'max-width:560px;margin:0 auto;padding:28px;display:flex;flex-direction:column;gap:16px' },
      el('h1', { style: 'font-size:24px;font-weight:700' }, 'Pagamento indisponível'), el('p', { class: 'mu', style: 'font-size:16px;line-height:1.5' }, motivo),
      el('div', {}, el('a', { class: 'btn bp', href: `/reserva.html?id=${id}` }, 'Ver a reserva'))));
  })();
})();

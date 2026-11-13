(() => {
  const $ = id => document.getElementById(id);
  const form = $('form'), status = $('status');
  const api = (url, opcoes = {}) => fetch(url, { cache: 'no-store', ...opcoes }).then(async r => {
    const d = r.status === 204 ? {} : await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(Error(d.mensagem || 'Não foi possível concluir.'), { status: r.status });
    return d;
  });
  const json = (url, metodo, corpo) => api(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  for (const c of window.Giro.categorias) $('categoria').append(new Option(c.n, c.n));
  for (const uf of 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')) $('uf').append(new Option(uf, uf));
  form.elements.ano.max = String(new Date().getFullYear() + 1);

  const el = form.elements;
  let nomeEditado = false, anuncioId = null;
  const sugerir = () => { if (!nomeEditado) el.nome.value = [singular(el.categoria.value), el.marca.value.trim(), el.modelo.value.trim()].filter(Boolean).join(' '); };
  const singular = c => ({ Tratores: 'Trator', Colheitadeiras: 'Colheitadeira', Plantadeiras: 'Plantadeira', Pulverizadores: 'Pulverizador', 'Preparo do solo': '', Transporte: '', Distribuidores: 'Distribuidor' }[c] ?? c);
  ['categoria', 'marca', 'modelo'].forEach(n => el[n].addEventListener('input', sugerir));
  el.categoria.addEventListener('change', sugerir);
  el.nome.addEventListener('input', () => { nomeEditado = el.nome.value.trim() !== ''; });

  function etapa(n) {
    $('etapa1').hidden = n !== 1; $('etapa2').hidden = n !== 2; form.hidden = n === 3; $('etapa3').hidden = n !== 3;
    ['p1', 'p2', 'p3'].forEach((p, i) => { $(p).className = i + 1 < n ? 'feito' : i + 1 === n ? 'atual' : ''; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function validar(campos) {
    for (const c of campos) {
      const f = el[c];
      if (!f.checkValidity() || (f.required && !String(f.value).trim())) {
        status.className = 'msg erro'; status.textContent = `Confira o campo "${f.closest('label').firstChild.textContent.trim()}".`; f.focus(); return false;
      }
    }
    status.textContent = ''; return true;
  }
  $('ir2').onclick = () => { sugerir(); if (validar(['categoria', 'marca', 'modelo', 'ano', 'nome'])) etapa(2); };
  $('voltar1').onclick = () => etapa(1);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validar(['diaria', 'cidade', 'uf'])) return;
    const b = $('publicar'); b.disabled = true; status.className = 'msg'; status.textContent = 'Publicando…';
    let equipamentoId;
    try {
      ({ id: equipamentoId } = await json('/api/equipamentos', 'POST', { nome: el.nome.value.trim(), categoria: el.categoria.value, marca: el.marca.value.trim(), modelo: el.modelo.value.trim(), ano: el.ano.value ? Number(el.ano.value) : null, descricao: el.descricao.value.trim(), informacoes_adicionais: el.informacoes_adicionais.value.trim() }));
      ({ id: anuncioId } = await json('/api/anuncios', 'POST', { equipamento_id: equipamentoId, diaria: Number(el.diaria.value), cidade: el.cidade.value.trim(), uf: el.uf.value, condicoes: el.condicoes.value.trim(), estado: el.rascunho.checked ? 'rascunho' : 'ativo' }));
      status.className = 'msg ok'; status.textContent = el.rascunho.checked ? 'Rascunho salvo. Agora adicione as fotos.' : 'Anúncio publicado! Agora adicione as fotos.';
      $('verAnuncio').href = `/anuncio.html?id=${anuncioId}`; $('verAnuncio').hidden = el.rascunho.checked;
      etapa(3);
    } catch (err) {
      // Evita deixar equipamento solto quando o anúncio falha (ex.: limite do plano).
      if (equipamentoId && !anuncioId) await api(`/api/equipamentos/${equipamentoId}`, { method: 'DELETE' }).catch(() => {});
      status.className = 'msg erro'; status.textContent = err.message; b.disabled = false;
    }
  });

  async function enviarFotos(lista) {
    const files = [...lista]; const msg = $('fotosMsg');
    if (!files.length) return;
    if (files.length > 8 || files.some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024)) { msg.className = 'msg erro'; msg.textContent = 'Use até 8 imagens JPG, PNG ou WebP de até 5 MB cada.'; return; }
    const dados = new FormData(); files.forEach(f => dados.append('fotos', f));
    msg.className = 'msg'; msg.textContent = 'Enviando fotos…';
    try { await api(`/api/anuncios/${anuncioId}/fotos`, { method: 'POST', body: dados }); msg.className = 'msg ok'; msg.textContent = 'Fotos adicionadas.'; await mostrarFotos(); }
    catch (err) { msg.className = 'msg erro'; msg.textContent = err.message; }
    finally { $('fotos').value = ''; }
  }
  async function mostrarFotos() {
    const { fotos } = await api(`/api/anuncios/${anuncioId}/fotos`);
    $('previas').replaceChildren(...fotos.map(f => { const d = document.createElement('div'); d.className = 'previa'; const i = new Image(); i.src = f.foto_url; i.alt = ''; d.append(i); if (f.principal) { const s = document.createElement('span'); s.textContent = 'Principal'; d.append(s); } return d; }));
  }
  $('fotos').addEventListener('change', e => enviarFotos(e.target.files));
  const zona = $('soltar');
  zona.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fotos').click(); } });
  ['dragover', 'dragenter'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add('sobre'); }));
  ['dragleave', 'drop'].forEach(t => zona.addEventListener(t, () => zona.classList.remove('sobre')));
  zona.addEventListener('drop', e => { e.preventDefault(); enviarFotos(e.dataTransfer.files); });

  // Só proprietários anunciam; locatários passam antes pela ativação do modo anunciante.
  document.addEventListener('giro:sessao', async ev => {
    const u = ev.detail; if (!u) return;
    if (['LOCATARIO', 'usuario'].includes(u.role)) { location.replace('/anunciante.html'); return; }
    form.hidden = false;
    try {
      const { perfil } = await api('/api/perfil/me');
      if (perfil.cidade && !el.cidade.value) el.cidade.value = perfil.cidade;
      if (perfil.uf && !el.uf.value) el.uf.value = perfil.uf;
    } catch { /* perfil é só sugestão */ }
    try {
      const uso = await api('/api/premium/uso');
      if (uso.limite_anuncios_mes == null) $('limite').textContent = 'Plano Pro: anúncios sem limite.';
      else $('limite').textContent = `Plano Gratuito: ${uso.anuncios_criados_mes} de ${uso.limite_anuncios_mes} anúncios criados este mês.${uso.restantes === 0 ? ' Você atingiu o limite; assine o Pro em Minha garagem > Plano para anunciar sem limite.' : ''}`;
    } catch { /* informativo */ }
  });
})();

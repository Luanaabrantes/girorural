(() => {
  const $ = id => document.getElementById(id);
  const form = $('formCadastro'), mensagem = $('mensagem'), senha = $('senha'), confirmar = $('confirmar');
  for (const uf of 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')) $('uf').append(new Option(uf, uf));

  const forca = v => [v.length >= 6, v.length >= 10, /\d/.test(v) && /[a-zA-Z]/.test(v), /[^a-zA-Z0-9]/.test(v)].filter(Boolean).length;
  senha.addEventListener('input', () => {
    const n = senha.value ? forca(senha.value) : 0;
    [...$('forca').children].forEach((b, i) => b.classList.toggle('on', i < n));
    $('forcaTexto').textContent = `Força: ${['—', 'fraca', 'razoável', 'forte', 'muito forte'][n]}`;
    $('forcaTexto').style.color = n >= 3 ? '#1D6B3D' : n ? '#7A5B00' : '';
  });
  confirmar.addEventListener('input', () => confirmar.setCustomValidity(confirmar.value && confirmar.value !== senha.value ? 'As senhas não conferem.' : ''));

  const enviar = (url, metodo, corpo) => fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw Error(d.mensagem || 'Não foi possível concluir.'); return d; });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (confirmar.value !== senha.value) { mensagem.className = 'msg erro'; mensagem.textContent = 'As senhas não conferem.'; return; }
    const nome = $('nome').value.trim(), email = $('email').value.trim();
    const perfil = Object.fromEntries(['telefone', 'cidade', 'uf'].map(k => [k, $(k).value.trim()]).filter(([, v]) => v));
    const botao = form.querySelector('button'); botao.disabled = true;
    mensagem.className = 'msg'; mensagem.textContent = 'Criando sua conta…';
    try {
      await enviar('/api/auth/cadastro', 'POST', { nome, email, senha: senha.value });
      // Entra direto e completa o perfil com os dados informados aqui.
      try {
        await enviar('/api/auth/login', 'POST', { email, senha: senha.value });
        if (Object.keys(perfil).length) await enviar('/api/perfil/me', 'PATCH', perfil).catch(() => {});
        mensagem.className = 'msg ok'; mensagem.textContent = 'Conta criada! Abrindo o catálogo…';
        setTimeout(() => location.assign('/anuncios.html'), 900);
      } catch {
        mensagem.className = 'msg ok'; mensagem.textContent = 'Conta criada! Faça login para continuar.';
        setTimeout(() => location.assign('/login.html'), 1200);
      }
    } catch (erro) {
      mensagem.className = 'msg erro'; mensagem.textContent = erro.message === 'Failed to fetch' ? 'Não foi possível conectar ao servidor.' : erro.message;
      botao.disabled = false;
    }
  });
})();

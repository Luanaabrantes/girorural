const formLogin = document.getElementById('formLogin');
const mensagem = document.getElementById('mensagem');

formLogin.addEventListener('submit', async (evento) => {

    evento.preventDefault();

    const email =
        document.getElementById('email').value.trim();

    const senha =
        document.getElementById('senha').value;

    mensagem.textContent = 'Entrando...';
    mensagem.className = 'msg';

    try {

        const resposta = await fetch(
            '/api/auth/login',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    email,
                    senha
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {

            mensagem.textContent =
                dados.mensagem ||
                'E-mail ou senha inválidos.';

            mensagem.className = 'msg erro';

            return;
        }

        mensagem.textContent =
            'Login realizado com sucesso!';

        mensagem.className =
            'msg ok';

        // Retorna à página que pediu login (somente caminhos internos).
        const voltar = new URLSearchParams(location.search).get('voltar');
        window.location.href = voltar && /^\/[^/\\]/.test(voltar) ? voltar : '/anuncios.html';

    } catch (erro) {

        console.error(
            'Erro ao realizar login:',
            erro
        );

        mensagem.textContent =
            'Não foi possível conectar ao servidor.';

        mensagem.className =
            'msg erro';
    }

});

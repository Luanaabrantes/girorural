const express = require('express');
const dbPadrao = require('./database');
const registrarEventoAuditoriaPadrao = require('./auditoria');
const verificarAutenticacaoPadrao = require('./middlewareAuth');

// Habilita o modo anunciante sem intervenção de administrador. O papel nunca é
// recebido do navegador: a transição permitida é somente LOCATARIO -> PROPRIETARIO,
// após aceite explícito dos termos e com contato e localização no perfil.
function criarRotasAnunciante({ db = dbPadrao, autenticar = verificarAutenticacaoPadrao, auditar = registrarEventoAuditoriaPadrao } = {}) {
    const router = express.Router();
    /**
     * @openapi
     * /auth/me/anunciante:
     *   post:
     *     tags: [Auth-service]
     *     summary: Habilitar modo anunciante da própria conta
     *     description: >-
     *       Transição única LOCATARIO para PROPRIETARIO. Exige aceite_termos true e perfil com telefone, cidade e UF.
     *       O proprietário continua podendo alugar equipamentos de terceiros. Proxy público: POST /api/auth/anunciante.
     *     operationId: post_auth_me_anunciante
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema: {type: object, required: [aceite_termos], properties: {aceite_termos: {type: boolean, enum: [true]}}}
     *     responses:
     *       '200': {description: Modo anunciante habilitado ou já ativo}
     *       '400': {description: Termos não aceitos}
     *       '401': {description: Token ausente ou inválido}
     *       '403': {description: Papel administrativo não usa esta transição}
     *       '409': {description: 'Perfil incompleto (telefone, cidade e UF)'}
     *       '500': {description: Erro interno}
     *     x-public-proxy: POST /api/auth/anunciante
     */
    router.post('/me/anunciante', autenticar, async (req, res) => {
        if (req.body?.aceite_termos !== true) {
            return res.status(400).json({ mensagem: 'Aceite os termos do anunciante para continuar.' });
        }
        if (['PROPRIETARIO'].includes(req.usuario.role)) {
            return res.json({ mensagem: 'Seu modo anunciante já está ativo.', usuario: req.usuario });
        }
        if (!['LOCATARIO', 'usuario'].includes(req.usuario.role)) {
            return res.status(403).json({ mensagem: 'Contas administrativas não usam esta transição.' });
        }
        let conexao;
        try {
            conexao = await db.getConnection();
            await conexao.beginTransaction();
            const [usuarios] = await conexao.execute('SELECT id, nome, email, role FROM usuarios WHERE id = ? FOR UPDATE', [req.usuario.id]);
            if (!usuarios.length) { await conexao.rollback(); return res.status(401).json({ mensagem: 'Usuário não encontrado.' }); }
            const [perfis] = await conexao.execute('SELECT telefone, cidade, uf FROM perfis WHERE usuario_id = ? FOR UPDATE', [req.usuario.id]);
            const p = perfis[0] || {};
            const faltando = [['telefone', 'telefone'], ['cidade', 'cidade'], ['uf', 'UF']].filter(([c]) => !String(p[c] || '').trim()).map(([, n]) => n);
            if (faltando.length) {
                await conexao.rollback();
                return res.status(409).json({ mensagem: `Complete seu perfil antes de anunciar: ${faltando.join(', ')}.`, faltando });
            }
            if (['LOCATARIO', 'usuario'].includes(usuarios[0].role)) {
                await conexao.execute("UPDATE usuarios SET role = 'PROPRIETARIO' WHERE id = ?", [req.usuario.id]);
                await conexao.execute('UPDATE perfis SET anunciante_desde = COALESCE(anunciante_desde, NOW()) WHERE usuario_id = ?', [req.usuario.id]);
            }
            await conexao.commit();
            const { id, nome, email } = usuarios[0];
            await auditar({ usuarioId: id, acao: 'ANUNCIANTE_HABILITADO', ip: req.ip, detalhes: { role_anterior: usuarios[0].role, role_nova: 'PROPRIETARIO' } });
            return res.json({ mensagem: 'Modo anunciante habilitado. Cadastre seu primeiro equipamento.', usuario: { id, nome, email, role: 'PROPRIETARIO' } });
        } catch {
            try { if (conexao) await conexao.rollback(); } catch { /* conexão indisponível */ }
            console.error('Falha ao habilitar modo anunciante.');
            return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
        } finally { if (conexao) conexao.release(); }
    });
    return router;
}

module.exports = { criarRotasAnunciante };

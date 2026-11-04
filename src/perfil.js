const express = require('express');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const dbPadrao = require('./database');
const autenticarPadrao = require('./middlewareAuth');
const storagePadrao = require('./minio');
const auditarPadrao = require('./auditoria');
const { receberFoto, atualizarFoto, ErroFoto } = require('./fotoPerfil');

function criarRotasPerfil({ db = dbPadrao, autenticar = autenticarPadrao, storage = storagePadrao,
  auditar = auditarPadrao, atualizarFotoFn = atualizarFoto, receberFotoFn = receberFoto } = {}) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  /** @openapi
   * /api/perfil/fotos/{usuarioId}/{arquivo}:
   *   get:
   *     tags: [Perfil]
   *     summary: Exibir foto pública de perfil
   *     security: []
   *     parameters: [{in: path, name: usuarioId, required: true, schema: {type: integer, minimum: 1}}, {in: path, name: arquivo, required: true, schema: {type: string, pattern: '^[0-9a-f-]{36}\\.(jpg|png|webp)$'}}]
   *     responses: {'200': {description: Imagem pública}, '404': {description: Foto inexistente}, '503': {description: MinIO indisponível}}
   */
  router.get('/perfil/fotos/:usuarioId/:arquivo', async (req, res) => {
    const chave = `perfis/${req.params.usuarioId}/${req.params.arquivo}`;
    try { storage.url(chave); } catch { return res.sendStatus(404); }
    try {
      const resposta = await storage.lerPublico(chave);
      if (resposta.status === 404) return res.sendStatus(404);
      const tipo = resposta.headers.get('content-type') || '';
      if (!resposta.ok || !/^image\/(jpeg|png|webp)$/.test(tipo)) { await resposta.body?.cancel(); return res.sendStatus(503); }
      res.set({ 'Content-Type': tipo, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
      await pipeline(Readable.fromWeb(resposta.body), res);
    } catch { if (!res.headersSent) res.sendStatus(503); else res.destroy(); }
  });

  /** @openapi
   * /api/perfil/me:
   *   get:
   *     tags: [Perfil]
   *     summary: Consultar o próprio perfil
   *     security: [{sessao: []}]
   *     responses:
   *       '200':
   *         description: Dados próprios incluindo e-mail e telefone privados.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               required: [perfil]
   *               properties:
   *                 perfil: {$ref: '#/components/schemas/PerfilPrivado'}
   *       '401': {description: Sessão ausente}
   *       '503': {description: Banco indisponível}
   *   patch:
   *     tags: [Perfil]
   *     summary: Atualizar dados do próprio perfil
   *     description: E-mail e papel não podem ser alterados por esta rota; a identidade vem da sessão.
   *     security: [{sessao: []}]
   *     requestBody: {required: true, content: {application/json: {schema: {$ref: '#/components/schemas/PerfilAtualizacao'}}}}
   *     responses:
   *       '200':
   *         description: Perfil atualizado.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               required: [mensagem, perfil]
   *               properties:
   *                 mensagem: {type: string}
   *                 perfil: {$ref: '#/components/schemas/PerfilPrivado'}
   *       '400': {description: Dados inválidos ou tentativa de alteração de papel/email}
   *       '401': {description: Sessão ausente}
   *       '503': {description: Banco indisponível}
   */
  router.get('/perfil/me', autenticar, async (req, res) => {
    try {
      const [rows] = await db.execute(`SELECT u.id,u.nome,u.email,u.role,p.nome_exibicao,p.telefone,p.cidade,p.uf,p.bio,p.foto_chave
        FROM usuarios u LEFT JOIN perfis p ON p.usuario_id=u.id WHERE u.id=?`, [req.usuario.id]);
      if (!rows.length) return res.status(404).json({ mensagem: 'Perfil não encontrado.' });
      res.json({ perfil: formatar(rows[0], storage) });
    } catch { res.status(503).json({ mensagem: 'Não foi possível consultar o perfil.' }); }
  });

  /** @openapi
   * /api/proprietarios/{id}:
   *   get:
   *     tags: [Perfil]
   *     summary: Consultar perfil público de proprietário
   *     description: Retorna somente identidade pública, localização, descrição e anúncios ativos reais; nunca inclui e-mail ou telefone.
   *     security: []
   *     parameters: [{in: path, name: id, required: true, schema: {type: integer, minimum: 1}}]
   *     responses:
   *       '200':
   *         description: Perfil público e anúncios ativos sem e-mail ou telefone.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               required: [proprietario, anuncios]
   *               properties:
   *                 proprietario: {$ref: '#/components/schemas/PerfilProprietarioPublico'}
   *                 anuncios:
   *                   type: array
   *                   items: {$ref: '#/components/schemas/AnuncioProprietarioPublico'}
   *       '404': {description: Proprietário sem perfil público ou sem anúncios ativos}
   */
  router.get('/proprietarios/:id', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) return res.status(400).json({ mensagem: 'Identificador inválido.' });
    try {
      const [users] = await db.execute(`SELECT u.id,u.nome,p.nome_exibicao,p.cidade,p.uf,p.bio,p.foto_chave FROM usuarios u
        LEFT JOIN perfis p ON p.usuario_id=u.id WHERE u.id=? AND u.role IN ('PROPRIETARIO','admin')`, [Number(req.params.id)]);
      if (!users.length) return res.status(404).json({ mensagem: 'Perfil público não encontrado.' });
      const [ads] = await db.execute(`SELECT a.id,e.nome,e.categoria,e.marca,e.modelo,e.ano,e.descricao,e.imagem_chave,
        a.diaria,a.cidade,a.uf,a.condicoes FROM anuncios a JOIN equipamentos e ON e.id=a.equipamento_id
        WHERE a.proprietario_id=? AND a.estado='ativo' AND e.estado='ativo' AND (e.descricao IS NULL OR e.descricao NOT LIKE '[DEMO FICTÍCIO]%')
        ORDER BY a.criado_em DESC,a.id DESC`, [Number(req.params.id)]);
      if (!ads.length) return res.status(404).json({ mensagem: 'Perfil público não encontrado.' });
      const row = users[0];
      res.json({ proprietario: { id: row.id, nome: row.nome_exibicao || row.nome, foto_url: storage.url(row.foto_chave), cidade: row.cidade || '', uf: row.uf || '', descricao: row.bio || '' },
        anuncios: ads.map(a => ({ id: a.id, nome: a.nome, categoria: a.categoria, marca: a.marca, modelo: a.modelo, ano: a.ano,
          descricao: a.descricao, diaria: a.diaria, cidade: a.cidade, uf: a.uf, condicoes: a.condicoes,
          foto_url: a.imagem_chave ? `/api/anuncios/${a.id}/foto` : null, demonstrativo: false })) });
    } catch { res.status(503).json({ mensagem: 'Não foi possível consultar o perfil público.' }); }
  });

  router.patch('/perfil/me', autenticar, async (req, res) => {
    const body = req.body || {};
    const aceitos = new Set(['nome', 'nome_exibicao', 'telefone', 'cidade', 'uf', 'bio']);
    const proibidos = Object.keys(body).filter(k => ['role','papel','email','id','usuario_id'].includes(k));
    if (proibidos.length) return res.status(400).json({ mensagem: proibidos.some(k => ['role','papel'].includes(k)) ? 'O papel não pode ser alterado pelo perfil.' : 'O e-mail só pode ser alterado por um fluxo de verificação.' });
    if (!Object.keys(body).length || Object.keys(body).some(k => !aceitos.has(k))) return res.status(400).json({ mensagem: 'Envie ao menos um campo de perfil permitido.' });
    const limits = { nome: 150, nome_exibicao: 100, telefone: 30, cidade: 120, uf: 2, bio: 300 };
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string' || value.trim().length > limits[key] || (key === 'nome' && !value.trim()) || (key === 'uf' && value.trim() && !/^[A-Za-z]{2}$/.test(value.trim()))) {
        return res.status(400).json({ mensagem: `${labels[key]} inválido.` });
      }
    }
    const id = Number(req.usuario.id);
    const nome = body.nome?.trim();
    const perfilKeys = ['nome_exibicao','telefone','cidade','uf','bio'].filter(k => Object.hasOwn(body, k));
    let conn;
    try {
      conn = await db.getConnection(); await conn.beginTransaction();
      if (nome !== undefined) await conn.execute('UPDATE usuarios SET nome=? WHERE id=?', [nome, id]);
      if (perfilKeys.length) {
        const columns = ['nome_exibicao','telefone','cidade','uf','bio'];
        const updates = perfilKeys.map(k => `${k}=VALUES(${k})`).join(',');
        const normalizar = k => k === 'uf' ? body[k].trim().toUpperCase() || null : body[k].trim() || null;
        await conn.execute(`INSERT INTO perfis (usuario_id, ${columns.join(',')}) VALUES (?, ${columns.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${updates}`,
          [id, ...columns.map(k => perfilKeys.includes(k) ? normalizar(k) : null)]);
      }
      await conn.commit();
      await auditar({ usuarioId: id, acao: 'PERFIL_ATUALIZADO', ip: req.ip, detalhes: { recurso: 'PERFIL' } });
      const [rows] = await db.execute(`SELECT u.id,u.nome,u.email,u.role,p.nome_exibicao,p.telefone,p.cidade,p.uf,p.bio,p.foto_chave FROM usuarios u LEFT JOIN perfis p ON p.usuario_id=u.id WHERE u.id=?`, [id]);
      res.json({ mensagem: 'Perfil atualizado com sucesso.', perfil: formatar(rows[0], storage) });
    } catch { try { await conn?.rollback(); } catch {} res.status(503).json({ mensagem: 'Não foi possível salvar o perfil.' }); }
    finally { conn?.release(); }
  });

  /** @openapi
   * /api/perfil/me/foto:
   *   post:
   *     tags: [Perfil]
   *     summary: Enviar ou substituir foto própria
   *     description: Aceita JPEG PNG ou WebP estático de até 5 MB; somente o usuário da sessão pode alterar a própria foto.
   *     security: [{sessao: []}]
   *     requestBody: {required: true, content: {multipart/form-data: {schema: {type: object, required: [foto], properties: {foto: {type: string, format: binary}}}}}}
   *     responses: {'200': {description: Foto validada e armazenada no MinIO}, '400': {description: Formato inválido}, '401': {description: Sessão ausente}, '413': {description: Foto acima de 5 MB}, '503': {description: MinIO indisponível}}
   *   delete:
   *     tags: [Perfil]
   *     summary: Remover foto própria
   *     security: [{sessao: []}]
   *     responses: {'200': {description: Foto removida do perfil}, '401': {description: Sessão ausente}, '503': {description: Remoção indisponível}}
   */
  router.post('/perfil/me/foto', autenticar, (req, res, next) => receberFotoFn(req, res, err => {
    if (err) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ mensagem: err.code === 'LIMIT_FILE_SIZE' ? 'A foto deve ter no máximo 5 MB.' : 'Envie uma imagem JPEG, PNG ou WebP no campo foto.' });
    next();
  }), async (req, res) => {
    try {
      const foto = await atualizarFotoFn(Number(req.usuario.id), req.file);
      await auditar({ usuarioId: req.usuario.id, acao: 'FOTO_PERFIL_ATUALIZADA', ip: req.ip, detalhes: { recurso: 'PERFIL' } });
      res.json({ mensagem: 'Foto atualizada com sucesso.', ...foto });
    } catch (e) { res.status(e instanceof ErroFoto ? e.status : 503).json({ mensagem: e instanceof ErroFoto ? e.message : 'Não foi possível atualizar a foto.' }); }
  });

  router.delete('/perfil/me/foto', autenticar, async (req, res) => {
    let conn, chave;
    try {
      conn = await db.getConnection(); await conn.beginTransaction();
      const [rows] = await conn.execute('SELECT foto_chave FROM perfis WHERE usuario_id=? FOR UPDATE', [req.usuario.id]);
      chave = rows[0]?.foto_chave;
      if (rows.length) await conn.execute('UPDATE perfis SET foto_chave=NULL WHERE usuario_id=?', [req.usuario.id]);
      await conn.commit();
      if (chave) { try { await storage.remover(chave); } catch { console.error('Foto de perfil removida do banco; limpeza do objeto MinIO pendente.'); } }
      await auditar({ usuarioId: req.usuario.id, acao: 'FOTO_PERFIL_REMOVIDA', ip: req.ip, detalhes: { recurso: 'PERFIL' } });
      res.json({ mensagem: 'Foto de perfil removida.', foto_url: null });
    } catch { try { await conn?.rollback(); } catch {} res.status(503).json({ mensagem: 'Não foi possível remover a foto.' }); }
    finally { conn?.release(); }
  });

  router.use((e, req, res, next) => {
    if (e.status) return res.status(e.status).json({ mensagem: e.message });
    next(e);
  });
  return router;
}

const labels = { nome: 'Nome completo', nome_exibicao: 'Nome de exibição', telefone: 'Telefone', cidade: 'Cidade', uf: 'Estado', bio: 'Descrição' };
function formatar(row, storage) {
  return { id: row.id, nome: row.nome, nome_exibicao: row.nome_exibicao || '', email: row.email,
    role: row.role, telefone: row.telefone || '', cidade: row.cidade || '', uf: row.uf || '',
    bio: row.bio || '', foto_url: storage.url(row.foto_chave) };
}
module.exports = { criarRotasPerfil, formatar };

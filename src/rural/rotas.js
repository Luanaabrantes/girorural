const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const dbPadrao = require('../database');
const autenticarPadrao = require('../middlewareAuth');
const storage = require('../minio');
const { acessoValido } = require('../premiumPeriodo');

const papelsValidos = new Set(['ADMIN', 'PROPRIETARIO', 'LOCATARIO']);
const papel = role => ({ admin: 'ADMIN', usuario: 'LOCATARIO', ADMIN: 'ADMIN', PROPRIETARIO: 'PROPRIETARIO', LOCATARIO: 'LOCATARIO' }[role] || role);
const erro = (status, mensagem) => Object.assign(new Error(mensagem), { status });
const id = valor => {
  if (!/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(Number(valor))) throw erro(400, 'Identificador inválido.');
  return Number(valor);
};
function texto(v, nome, max, obrigatorio = true) {
  if (v == null && !obrigatorio) return null;
  if (typeof v !== 'string' || (obrigatorio && !v.trim()) || v.trim().length > max) throw erro(400, `${nome} inválido.`);
  return v.trim() || null;
}
function dataISO(v, nome) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw erro(400, `${nome} inválida.`);
  const parsed = new Date(`${v}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== v) throw erro(400, `${nome} inválida.`);
  return v;
}
async function limiteAtivos(c, usuarioId) {
  const [plans] = await c.execute('SELECT * FROM premium_assinaturas WHERE usuario_id=?', [usuarioId]);
  return acessoValido(plans[0], process.env.STRIPE_PRICE_ID, Math.floor(Date.now() / 1000)) ? 20 : 2;
}
function criarRotasRural({ db = dbPadrao, autenticar = autenticarPadrao, evento = registrarEvento } = {}) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const exigir = (...permitidos) => (req, res, next) => {
    const atual = papel(req.usuario?.role);
    if (!req.usuario) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    if (!papelsValidos.has(atual) || !permitidos.includes(atual)) return res.status(403).json({ mensagem: 'Papel sem permissão para esta operação.' });
    next();
  };
  const auditar = async (req, acao, recurso, recursoId) => {
    try { await evento({ usuario_id: req.usuario.id, acao, ip: req.ip, detalhes: { recurso, recurso_id: String(recursoId) } }); }
    catch { console.error('Evento de negócio não registrado no log-service.'); }
  };
  const executar = handler => async (req, res) => {
    try { await handler(req, res); }
    catch (e) { if (e.status) return res.status(e.status).json({ mensagem: e.message }); console.error('Falha na operação GiroRural.'); return res.status(503).json({ mensagem: 'Serviço temporariamente indisponível.' }); }
  };
  const fields = `a.id, e.nome, e.categoria, e.marca, e.modelo, e.ano, e.descricao, a.diaria, a.cidade, a.uf, a.condicoes, e.imagem_chave, u.id proprietario_id, CASE WHEN e.descricao LIKE '[DEMO FICTÍCIO]%' THEN 'Proprietário demonstrativo (fictício)' ELSE COALESCE(NULLIF(p.nome_exibicao,''),u.nome) END proprietario_nome`;
  const uploadFoto = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 }, fileFilter(req, file, cb) { cb(['image/jpeg','image/png','image/webp'].includes(file.mimetype) ? null : erro(400, 'Use uma imagem JPEG, PNG ou WebP.'), ['image/jpeg','image/png','image/webp'].includes(file.mimetype)); } }).single('foto');

  /** @openapi
   * /api/anuncios/{id}/foto:
   *   post:
   *     tags: [Anúncios]
   *     summary: Enviar foto do equipamento ao MinIO
   *     security: [{sessao: []}]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }]
   *     requestBody: {required: true, content: {multipart/form-data: {schema: {type: object, required: [foto], properties: {foto: {type: string, format: binary}}}}}}
   *     responses: {'201': {description: Imagem armazenada}, '400': {description: Imagem inválida}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}, '404': {description: Anúncio privado}, '413': {description: Imagem acima de 5 MB}, '503': {description: MinIO indisponível}}
   *   get:
   *     tags: [Anúncios]
   *     summary: Ler foto pública de anúncio ativo ou foto própria autenticada
   *     security: []
   *     parameters: [{ in: path, name: id, required: true, schema: {type: integer, minimum: 1} }]
   *     responses: {'200': {description: Imagem servida pelo MinIO}, '404': {description: Imagem não encontrada ou privada}, '503': {description: MinIO indisponível}}
   */
  router.post('/anuncios/:id/foto', autenticar, exigir('PROPRIETARIO'), uploadFoto, executar(async (req, res) => {
    if (!req.file) throw erro(400, 'Envie uma foto do equipamento.');
    const anuncioId = id(req.params.id);
    let buffer, formato;
    try { const image = sharp(req.file.buffer, { limitInputPixels: 25000000, failOn: 'warning' }); const meta = await image.metadata(); if (!['jpeg','png','webp'].includes(meta.format) || meta.format !== req.file.mimetype.split('/')[1].replace('jpg','jpeg') || (meta.pages || 1) > 1) throw new Error(); formato = meta.format; buffer = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).toFormat(formato).toBuffer(); }
    catch { throw erro(400, 'Imagem inválida. Envie JPEG, PNG ou WebP estático de até 25 megapixels.'); }
    const [ads] = await db.execute('SELECT e.id,e.imagem_chave FROM anuncios a JOIN equipamentos e ON e.id=a.equipamento_id WHERE a.id=? AND a.proprietario_id=?', [anuncioId, req.usuario.id]);
    if (!ads.length) throw erro(404, 'Anúncio não encontrado.');
    let chave;
    try { chave = await storage.enviarFotoAnuncio(req.usuario.id, buffer, formato); await db.execute('UPDATE equipamentos SET imagem_chave=? WHERE id=? AND proprietario_id=?', [chave, ads[0].id, req.usuario.id]); }
    catch { if (chave) storage.removerFotoAnuncio(chave).catch(() => {}); throw erro(503, 'Não foi possível armazenar a foto do equipamento.'); }
    if (ads[0].imagem_chave) storage.removerFotoAnuncio(ads[0].imagem_chave).catch(() => {});
    await auditar(req, 'FOTO_EQUIPAMENTO_ENVIADA', 'anuncio', anuncioId); res.status(201).json({ foto_url: `/api/anuncios/${anuncioId}/foto` });
  }));
  const authOpcional = (req, res, next) => req.cookies?.token ? autenticar(req, res, next) : next();
  router.get('/anuncios/:id/foto', authOpcional, executar(async (req, res) => {
    const [rows] = await db.execute(`SELECT e.imagem_chave,a.estado anuncio_estado,e.estado equipamento_estado,a.proprietario_id FROM anuncios a JOIN equipamentos e ON e.id=a.equipamento_id WHERE a.id=?`, [id(req.params.id)]);
    if (!rows.length || !rows[0].imagem_chave) throw erro(404, 'Imagem não encontrada.');
    const row = rows[0], publico = row.anuncio_estado === 'ativo' && row.equipamento_estado === 'ativo';
    if (!publico && (!req.usuario || req.usuario.id !== row.proprietario_id)) throw erro(404, 'Imagem não encontrada.');
    try { res.set('Content-Type', row.imagem_chave.endsWith('.jpg') ? 'image/jpeg' : row.imagem_chave.endsWith('.png') ? 'image/png' : 'image/webp'); res.set('Cache-Control', publico ? 'public, max-age=300' : 'private, no-store'); (await storage.lerFotoAnuncio(row.imagem_chave)).on('error', () => { if (!res.headersSent) res.status(503).end(); }).pipe(res); }
    catch { throw erro(503, 'Armazenamento de imagens indisponível.'); }
  }));

  /** @openapi
   * /api/anuncios:
   *   get:
   *     tags: [Anúncios]
   *     summary: Listar anúncios ativos publicamente, com filtros por cidade/categoria e dados públicos do proprietário
   *     security: []
   *     parameters:
   *       - { in: query, name: cidade, schema: { type: string } }
   *       - { in: query, name: categoria, schema: { type: string } }
   *       - { in: query, name: pagina, schema: { type: integer, minimum: 1, default: 1 } }
   *       - { in: query, name: limite, schema: { type: integer, minimum: 1, maximum: 50, default: 20 } }
   *     responses:
   *       '200':
   *         description: Anúncios públicos paginados. Demonstrações fictícias são identificadas e não podem receber reservas.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 pagina: { type: integer }
   *                 limite: { type: integer }
   *                 anuncios: { type: array, items: { $ref: '#/components/schemas/AnuncioPublico' } }
   */
  router.get('/anuncios', executar(async (req, res) => {
    const pagina = Number(req.query.pagina || 1), limite = Number(req.query.limite || 20);
    if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(limite) || limite < 1 || limite > 50) throw erro(400, 'Paginação inválida.');
    const filtros = ['a.estado = \'ativo\'', 'e.estado = \'ativo\''], params = [];
    if (req.query.cidade) { filtros.push('a.cidade = ?'); params.push(texto(req.query.cidade, 'Cidade', 120)); }
    if (req.query.categoria) { filtros.push('e.categoria = ?'); params.push(texto(req.query.categoria, 'Categoria', 80)); }
    const [rows] = await db.execute(`SELECT ${fields} FROM anuncios a JOIN equipamentos e ON e.id=a.equipamento_id JOIN usuarios u ON u.id=a.proprietario_id LEFT JOIN perfis p ON p.usuario_id=u.id WHERE ${filtros.join(' AND ')} ORDER BY a.criado_em DESC,a.id DESC LIMIT ? OFFSET ?`, [...params, limite, (pagina - 1) * limite]);
    res.json({ pagina, limite, anuncios: rows.map(publico) });
  }));

  /** @openapi
   * /api/anuncios/meus:
   *   get:
   *     tags: [Anúncios]
   *     summary: Listar anúncios próprios, incluindo estado
   *     security: [{sessao: []}]
   *     responses: {'200': {description: Anúncios da sessão}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}}
   */
  router.get('/anuncios/meus', autenticar, exigir('PROPRIETARIO'), executar(async (req, res) => {
    const [rows] = await db.execute(`SELECT ${fields},a.estado,a.equipamento_id FROM anuncios a JOIN equipamentos e ON e.id=a.equipamento_id JOIN usuarios u ON u.id=a.proprietario_id LEFT JOIN perfis p ON p.usuario_id=u.id WHERE a.proprietario_id=? ORDER BY a.id DESC`, [req.usuario.id]);
    res.json({ anuncios: rows.map(row => ({ ...publico(row), estado: row.estado, equipamento_id: row.equipamento_id })) });
  }));

  /** @openapi
   * /api/anuncios/{id}:
   *   get:
   *     tags: [Anúncios]
   *     summary: Consultar anúncio ativo
   *     security: []
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }]
   *     responses:
   *       '200':
   *         description: Detalhes públicos do equipamento, condições e nome público do proprietário, sem e-mail ou identificadores da conta.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               required: [anuncio]
   *               properties:
   *                 anuncio: { $ref: '#/components/schemas/AnuncioPublico' }
   *       '404': {description: Anúncio indisponível}
   */
  router.get('/anuncios/:id', executar(async (req, res) => {
    const [rows] = await db.execute(`SELECT ${fields} FROM anuncios a JOIN equipamentos e ON e.id=a.equipamento_id JOIN usuarios u ON u.id=a.proprietario_id LEFT JOIN perfis p ON p.usuario_id=u.id WHERE a.id=? AND a.estado='ativo' AND e.estado='ativo'`, [id(req.params.id)]);
    if (!rows.length) throw erro(404, 'Anúncio não encontrado.');
    res.json({ anuncio: publico(rows[0]) });
  }));

  /** @openapi
   * /api/equipamentos:
   *   post:
   *     tags: [Equipamentos]
   *     summary: Cadastrar equipamento próprio
   *     security: [{sessao: []}]
   *     requestBody: {required: true, content: {application/json: {schema: {$ref: '#/components/schemas/EquipamentoNovo'}}}}
   *     responses: {'201': {description: Equipamento cadastrado}, '400': {description: Dados inválidos}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}}
   */
  router.post('/equipamentos', autenticar, exigir('PROPRIETARIO'), executar(async (req, res) => {
    const b = req.body || {};
    const dados = [texto(b.nome, 'Nome', 150), texto(b.categoria, 'Categoria', 80), texto(b.marca, 'Marca', 100, false), texto(b.modelo, 'Modelo', 120, false), b.ano == null || b.ano === '' ? null : Number(b.ano), texto(b.descricao, 'Descrição', 5000, false), req.usuario.id];
    if (dados[4] !== null && (!Number.isInteger(dados[4]) || dados[4] < 1800 || dados[4] > new Date().getFullYear() + 1)) throw erro(400, 'Ano inválido.');
    const [r] = await db.execute('INSERT INTO equipamentos (nome,categoria,marca,modelo,ano,descricao,proprietario_id) VALUES (?,?,?,?,?,?,?)', dados);
    await auditar(req, 'EQUIPAMENTO_CADASTRADO', 'equipamento', r.insertId);
    res.status(201).json({ id: r.insertId });
  }));

  /** @openapi
   * /api/equipamentos/{id}:
   *   put:
   *     tags: [Equipamentos]
   *     summary: Atualizar equipamento próprio
   *     security: [{sessao: []}]
   *     requestBody: {required: true, content: {application/json: {schema: {$ref: '#/components/schemas/EquipamentoAlteracao'}}}}
   *     parameters: [{in: path, name: id, required: true, schema: {type: integer, minimum: 1}}]
   *     responses: {'200': {description: Equipamento atualizado}, '400': {description: Dados inválidos}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}, '404': {description: Equipamento de outra conta}}
   *   delete:
   *     tags: [Equipamentos]
   *     summary: Desativar equipamento próprio
   *     security: [{sessao: []}]
   *     parameters: [{in: path, name: id, required: true, schema: {type: integer, minimum: 1}}]
   *     responses: {'204': {description: Equipamento desativado}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}, '404': {description: Equipamento de outra conta}}
   */
  router.put('/equipamentos/:id', autenticar, exigir('PROPRIETARIO'), executar(async (req, res) => {
    const equipamentoId = id(req.params.id), b = req.body || {}, permitidos = new Set(['nome','categoria','marca','modelo','ano','descricao','estado']);
    if (!Object.keys(b).length || Object.keys(b).some(k => !permitidos.has(k))) throw erro(400, 'Campos de equipamento inválidos.');
    const campos = { nome: ['nome', () => texto(b.nome, 'Nome', 150)], categoria: ['categoria', () => texto(b.categoria, 'Categoria', 80)], marca: ['marca', () => texto(b.marca, 'Marca', 100, false)], modelo: ['modelo', () => texto(b.modelo, 'Modelo', 120, false)], descricao: ['descricao', () => texto(b.descricao, 'Descrição', 5000, false)] };
    const sets = [], vals = [];
    for (const [k, [coluna, validar]] of Object.entries(campos)) if (b[k] !== undefined) { sets.push(`${coluna}=?`); vals.push(validar()); }
    if (b.ano !== undefined) { const ano = b.ano === null || b.ano === '' ? null : Number(b.ano); if (ano !== null && (!Number.isInteger(ano) || ano < 1800 || ano > new Date().getFullYear() + 1)) throw erro(400, 'Ano inválido.'); sets.push('ano=?'); vals.push(ano); }
    if (b.estado !== undefined) { if (!['ativo','inativo'].includes(b.estado)) throw erro(400, 'Estado inválido.'); sets.push('estado=?'); vals.push(b.estado); }
    if (!sets.length) throw erro(400, 'Nenhum campo atualizável informado.');
    const [found] = await db.execute('SELECT id FROM equipamentos WHERE id=? AND proprietario_id=?', [equipamentoId, req.usuario.id]);
    if (!found.length) throw erro(404, 'Equipamento não encontrado.');
    const c = await db.getConnection();
    try {
      await c.beginTransaction();
      await c.execute(`UPDATE equipamentos SET ${sets.join(',')} WHERE id=? AND proprietario_id=?`, [...vals, equipamentoId, req.usuario.id]);
      if (b.estado === 'inativo') await c.execute("UPDATE anuncios SET estado='inativo' WHERE equipamento_id=? AND proprietario_id=? AND estado='ativo'", [equipamentoId, req.usuario.id]);
      await c.commit();
    } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
    await auditar(req, 'EQUIPAMENTO_ATUALIZADO', 'equipamento', equipamentoId); res.json({ atualizado: true });
  }));
  router.delete('/equipamentos/:id', autenticar, exigir('PROPRIETARIO'), executar(async (req, res) => {
    const equipamentoId = id(req.params.id), c = await db.getConnection();
    try {
      await c.beginTransaction();
      const [own] = await c.execute('SELECT id FROM equipamentos WHERE id=? AND proprietario_id=? FOR UPDATE', [equipamentoId, req.usuario.id]);
      if (!own.length) throw erro(404, 'Equipamento não encontrado.');
      await c.execute("UPDATE equipamentos SET estado='inativo' WHERE id=? AND proprietario_id=?", [equipamentoId, req.usuario.id]);
      await c.execute("UPDATE anuncios SET estado='inativo' WHERE equipamento_id=? AND proprietario_id=? AND estado='ativo'", [equipamentoId, req.usuario.id]);
      await c.commit();
    } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
    await auditar(req, 'EQUIPAMENTO_DESATIVADO', 'equipamento', req.params.id); res.status(204).end();
  }));

  /** @openapi
   * /api/equipamentos/meus:
   *   get:
   *     tags: [Equipamentos]
   *     summary: Listar equipamentos próprios
   *     security: [{sessao: []}]
   *     responses: {'200': {description: Equipamentos da sessão}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}}
   */
  router.get('/equipamentos/meus', autenticar, exigir('PROPRIETARIO'), executar(async (req, res) => {
    const [rows] = await db.execute('SELECT id,nome,categoria,marca,modelo,ano,descricao,imagem_chave,estado,criado_em,atualizado_em FROM equipamentos WHERE proprietario_id=? ORDER BY id DESC', [req.usuario.id]);
    res.json({ equipamentos: rows });
  }));

  /** @openapi
   * /api/anuncios:
   *   post:
   *     tags: [Anúncios]
   *     summary: Criar anúncio para equipamento próprio
   *     security: [{sessao: []}]
   *     requestBody: {required: true, content: {application/json: {schema: {$ref: '#/components/schemas/AnuncioNovo'}}}}
   *     responses: {'201': {description: Anúncio criado}, '400': {description: Dados inválidos}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}, '409': {description: Limite do plano atingido}}
   */
  router.post('/anuncios', autenticar, exigir('PROPRIETARIO'), executar(async (req, res) => {
    const b = req.body || {}, equipamentoId = id(b.equipamento_id), diaria = Number(b.diaria);
    const cidade = texto(b.cidade, 'Cidade', 120), uf = texto(b.uf, 'UF', 2).toUpperCase();
    if (!Number.isFinite(diaria) || diaria <= 0 || Math.round(diaria * 100) !== diaria * 100 || !/^[A-Z]{2}$/.test(uf)) throw erro(400, 'Diária ou UF inválida.');
    const c = await db.getConnection(); let anuncioId;
    try {
      await c.beginTransaction();
      await c.execute('SELECT id FROM usuarios WHERE id=? FOR UPDATE', [req.usuario.id]);
      const [eq] = await c.execute('SELECT id FROM equipamentos WHERE id=? AND proprietario_id=? AND estado=\'ativo\' FOR UPDATE', [equipamentoId, req.usuario.id]);
      if (!eq.length) throw erro(404, 'Equipamento não encontrado.');
      if ((b.estado || 'ativo') === 'ativo') {
        const max = await limiteAtivos(c, req.usuario.id);
        const [counts] = await c.execute("SELECT COUNT(*) total FROM anuncios WHERE proprietario_id=? AND estado='ativo'", [req.usuario.id]);
        if (Number(counts[0].total) >= max) throw erro(409, `Limite do plano atingido: ${max} anúncios ativos.`);
      }
      if (b.estado !== undefined && !['ativo','rascunho'].includes(b.estado)) throw erro(400, 'Estado inválido.');
      const [r] = await c.execute('INSERT INTO anuncios (equipamento_id,proprietario_id,diaria,cidade,uf,condicoes,estado) VALUES (?,?,?,?,?,?,?)', [equipamentoId, req.usuario.id, diaria.toFixed(2), cidade, uf, texto(b.condicoes, 'Condições', 5000, false), b.estado || 'ativo']);
      anuncioId = r.insertId; await c.commit();
    } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
    await auditar(req, 'ANUNCIO_CRIADO', 'anuncio', anuncioId);
    res.status(201).json({ id: anuncioId });
  }));

  /** @openapi
   * /api/anuncios/{id}:
   *   put:
   *     tags: [Anúncios]
   *     summary: Atualizar anúncio próprio
   *     security: [{sessao: []}]
   *     requestBody: {required: true, content: {application/json: {schema: {$ref: '#/components/schemas/AnuncioAlteracao'}}}}
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }]
   *     responses: {'200': {description: Anúncio atualizado}, '400': {description: Dados inválidos}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}, '404': {description: Recurso não encontrado ou de outra conta}}
   */
  router.put('/anuncios/:id', autenticar, exigir('PROPRIETARIO'), executar(async (req, res) => {
    const anuncioId = id(req.params.id), b = req.body || {};
    const permitidos = new Set(['diaria', 'cidade', 'uf', 'condicoes', 'estado']);
    if (!Object.keys(b).length || Object.keys(b).some(k => !permitidos.has(k))) throw erro(400, 'Campos de anúncio inválidos.');
    const sets = [], vals = [];
    if (b.diaria !== undefined) { const n = Number(b.diaria); if (!Number.isFinite(n) || n <= 0 || Math.round(n * 100) !== n * 100) throw erro(400, 'Diária inválida.'); sets.push('diaria=?'); vals.push(n.toFixed(2)); }
    if (b.cidade !== undefined) { sets.push('cidade=?'); vals.push(texto(b.cidade, 'Cidade', 120)); }
    if (b.uf !== undefined) { const uf = texto(b.uf, 'UF', 2).toUpperCase(); if (!/^[A-Z]{2}$/.test(uf)) throw erro(400, 'UF inválida.'); sets.push('uf=?'); vals.push(uf); }
    if (b.condicoes !== undefined) { sets.push('condicoes=?'); vals.push(texto(b.condicoes, 'Condições', 5000, false)); }
    if (b.estado !== undefined) { if (!['rascunho','ativo','inativo'].includes(b.estado)) throw erro(400, 'Estado inválido.'); sets.push('estado=?'); vals.push(b.estado); }
    const c = await db.getConnection();
    try {
      await c.beginTransaction();
      if (b.estado === 'ativo') {
        await c.execute('SELECT id FROM usuarios WHERE id=? FOR UPDATE', [req.usuario.id]);
        const [own] = await c.execute('SELECT a.id,a.estado,e.estado equipamento_estado FROM anuncios a JOIN equipamentos e ON e.id=a.equipamento_id WHERE a.id=? AND a.proprietario_id=? FOR UPDATE', [anuncioId, req.usuario.id]);
        if (!own.length) throw erro(404, 'Anúncio não encontrado.');
        if (own[0].equipamento_estado !== 'ativo') throw erro(409, 'Não é possível ativar anúncio de equipamento inativo.');
        if (own[0].estado !== 'ativo') {
          const max = await limiteAtivos(c, req.usuario.id);
          const [counts] = await c.execute("SELECT COUNT(*) total FROM anuncios WHERE proprietario_id=? AND estado='ativo'", [req.usuario.id]);
          if (Number(counts[0].total) >= max) throw erro(409, `Limite do plano atingido: ${max} anúncios ativos.`);
        }
      }
      const [r] = await c.execute(`UPDATE anuncios SET ${sets.join(',')} WHERE id=? AND proprietario_id=?`, [...vals, anuncioId, req.usuario.id]);
      if (!r.affectedRows) {
        const [own] = await c.execute('SELECT id FROM anuncios WHERE id=? AND proprietario_id=?', [anuncioId, req.usuario.id]);
        if (!own.length) throw erro(404, 'Anúncio não encontrado.');
      }
      await c.commit();
    } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
    await auditar(req, 'ANUNCIO_ATUALIZADO', 'anuncio', anuncioId); res.json({ atualizado: true });
  }));
  /** @openapi
   * /api/anuncios/{id}:
   *   delete:
   *     tags: [Anúncios]
   *     summary: Desativar anúncio próprio
   *     security: [{sessao: []}]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }]
   *     responses: {'204': {description: Anúncio desativado}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}, '404': {description: Recurso não encontrado ou de outra conta}}
   */
  router.delete('/anuncios/:id', autenticar, exigir('PROPRIETARIO'), executar(async (req, res) => {
    const [r] = await db.execute("UPDATE anuncios SET estado='inativo' WHERE id=? AND proprietario_id=?", [id(req.params.id), req.usuario.id]);
    if (!r.affectedRows) throw erro(404, 'Anúncio não encontrado.');
    await auditar(req, 'ANUNCIO_DESATIVADO', 'anuncio', req.params.id); res.status(204).end();
  }));

  /** @openapi
   * /api/reservas:
   *   post:
   *     tags: [Reservas]
   *     summary: Solicitar período em anúncio ativo
   *     security: [{sessao: []}]
   *     requestBody: {required: true, content: {application/json: {schema: {$ref: '#/components/schemas/ReservaNova'}}}}
   *     responses: {'201': {description: Reserva solicitada}, '400': {description: Período inválido}, '401': {description: Sessão ausente}, '403': {description: Requer LOCATARIO}, '404': {description: Anúncio indisponível}, '409': {description: Anúncios demonstrativos fictícios não aceitam reservas}}
   */
  router.post('/reservas', autenticar, exigir('LOCATARIO'), executar(async (req, res) => {
    const anuncioId = id(req.body?.anuncio_id), inicio = dataISO(req.body?.inicio, 'Data inicial'), fim = dataISO(req.body?.fim, 'Data final');
    if (fim < inicio) throw erro(400, 'A data final deve ser igual ou posterior à inicial.');
    const [anuncios] = await db.execute("SELECT a.id,e.descricao FROM anuncios a JOIN equipamentos e ON e.id=a.equipamento_id WHERE a.id=? AND a.estado='ativo' AND e.estado='ativo'", [anuncioId]);
    if (!anuncios.length) throw erro(404, 'Anúncio não encontrado.');
    if (anuncios[0].descricao?.startsWith('[DEMO FICTÍCIO]')) throw erro(409, 'Este anúncio demonstrativo não aceita reservas.');
    const [r] = await db.execute("INSERT INTO reservas (anuncio_id,solicitante_id,inicio,fim,estado) VALUES (?,?,?,?,'solicitada')", [anuncioId, req.usuario.id, inicio, fim]);
    await auditar(req, 'RESERVA_SOLICITADA', 'reserva', r.insertId); res.status(201).json({ id: r.insertId, estado: 'solicitada' });
  }));
  /** @openapi
   * /api/reservas/minhas:
   *   get:
   *     tags: [Reservas]
   *     summary: Listar reservas solicitadas pela sessão
   *     security: [{sessao: []}]
   *     responses: {'200': {description: Reservas próprias}, '401': {description: Sessão ausente}, '403': {description: Requer LOCATARIO}}
   */
  router.get('/reservas/minhas', autenticar, exigir('LOCATARIO'), executar(async (req, res) => {
    const [rows] = await db.execute(`SELECT r.id,r.anuncio_id,e.nome,a.cidade,a.uf,r.inicio,r.fim,r.estado,r.criado_em FROM reservas r JOIN anuncios a ON a.id=r.anuncio_id JOIN equipamentos e ON e.id=a.equipamento_id WHERE r.solicitante_id=? ORDER BY r.id DESC`, [req.usuario.id]);
    res.json({ reservas: rows });
  }));
  /** @openapi
   * /api/reservas/{id}:
   *   get:
   *     tags: [Reservas]
   *     summary: Consultar reserva própria ou recebida pelo proprietário
   *     security: [{sessao: []}]
   *     parameters: [{in: path, name: id, required: true, schema: {type: integer, minimum: 1}}]
   *     responses: {'200': {description: Dados autorizados da reserva}, '401': {description: Sessão ausente}, '404': {description: Reserva privada não encontrada}}
   */
  router.get('/reservas/:id', autenticar, executar(async (req, res) => {
    const [rows] = await db.execute(`SELECT r.id,r.anuncio_id,r.solicitante_id,r.inicio,r.fim,r.estado,r.criado_em,a.proprietario_id FROM reservas r JOIN anuncios a ON a.id=r.anuncio_id WHERE r.id=? AND (r.solicitante_id=? OR a.proprietario_id=?)`, [id(req.params.id), req.usuario.id, req.usuario.id]);
    if (!rows.length) throw erro(404, 'Reserva não encontrada.');
    const { proprietario_id, ...reserva } = rows[0]; res.json({ reserva });
  }));
  /** @openapi
   * /api/reservas/recebidas:
   *   get:
   *     tags: [Reservas]
   *     summary: Listar solicitações recebidas pelo proprietário
   *     security: [{sessao: []}]
   *     responses: {'200': {description: Reservas de anúncios próprios}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}}
   */
  router.get('/reservas/recebidas', autenticar, exigir('PROPRIETARIO'), executar(async (req, res) => {
    const [rows] = await db.execute(`SELECT r.id,r.anuncio_id,e.nome,r.inicio,r.fim,r.estado,r.criado_em FROM reservas r JOIN anuncios a ON a.id=r.anuncio_id JOIN equipamentos e ON e.id=a.equipamento_id WHERE a.proprietario_id=? ORDER BY r.id DESC`, [req.usuario.id]);
    res.json({ reservas: rows });
  }));
  /** @openapi
   * /api/reservas/{id}:
   *   patch:
   *     tags: [Reservas]
   *     summary: Aprovar ou recusar solicitação própria recebida
   *     security: [{sessao: []}]
   *     requestBody: {required: true, content: {application/json: {schema: {$ref: '#/components/schemas/DecisaoReserva'}}}}
   *     parameters: [{in: path, name: id, required: true, schema: {type: integer, minimum: 1}}]
   *     responses: {'200': {description: Estado atualizado}, '400': {description: Estado inválido}, '401': {description: Sessão ausente}, '403': {description: Requer PROPRIETARIO}, '404': {description: Reserva de outra conta}, '409': {description: Transição inválida ou período ocupado}}
   */
  router.patch('/reservas/:id', autenticar, exigir('PROPRIETARIO'), executar(async (req, res) => {
    const reservaId = id(req.params.id), estado = req.body?.estado;
    if (!['confirmada','recusada'].includes(estado)) throw erro(400, 'Estado de reserva inválido.');
    const c = await db.getConnection();
    try {
      await c.beginTransaction();
      const [rows] = await c.execute(`SELECT r.id,r.anuncio_id,r.inicio,r.fim,r.estado FROM reservas r JOIN anuncios a ON a.id=r.anuncio_id WHERE r.id=? AND a.proprietario_id=? FOR UPDATE`, [reservaId, req.usuario.id]);
      if (!rows.length) throw erro(404, 'Reserva não encontrada.');
      if (rows[0].estado !== 'solicitada') throw erro(409, 'A reserva não está aguardando decisão.');
      if (estado === 'confirmada') {
        await c.execute('SELECT id FROM anuncios WHERE id=? FOR UPDATE', [rows[0].anuncio_id]);
        const [overlap] = await c.execute("SELECT id FROM reservas WHERE anuncio_id=? AND estado='confirmada' AND inicio<=? AND fim>=? FOR UPDATE", [rows[0].anuncio_id, rows[0].fim, rows[0].inicio]);
        if (overlap.length) throw erro(409, 'O período já possui uma reserva confirmada.');
      }
      await c.execute('UPDATE reservas SET estado=? WHERE id=?', [estado, reservaId]); await c.commit();
    } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
    await auditar(req, estado === 'confirmada' ? 'RESERVA_APROVADA' : 'RESERVA_RECUSADA', 'reserva', reservaId); res.json({ atualizado: true, estado });
  }));
  /** @openapi
   * /api/reservas/{id}/cancelar:
   *   post:
   *     tags: [Reservas]
   *     summary: Cancelar solicitação própria
   *     security: [{sessao: []}]
   *     parameters: [{in: path, name: id, required: true, schema: {type: integer, minimum: 1}}]
   *     responses: {'200': {description: Reserva cancelada}, '401': {description: Sessão ausente}, '404': {description: Reserva não encontrada ou não cancelável}}
   */
  router.post('/reservas/:id/cancelar', autenticar, executar(async (req, res) => {
    const reservaId = id(req.params.id);
    const [r] = await db.execute("UPDATE reservas SET estado='cancelada' WHERE id=? AND solicitante_id=? AND estado IN ('solicitada','confirmada')", [reservaId, req.usuario.id]);
    if (!r.affectedRows) throw erro(404, 'Reserva não encontrada.');
    await auditar(req, 'RESERVA_CANCELADA', 'reserva', reservaId); res.json({ atualizado: true, estado: 'cancelada' });
  }));
  router.use((e, req, res, next) => {
    if (e instanceof multer.MulterError) return res.status(e.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ mensagem: e.code === 'LIMIT_FILE_SIZE' ? 'A foto deve ter no máximo 5 MB.' : 'Upload inválido.' });
    if (e.status) return res.status(e.status).json({ mensagem: e.message });
    next(e);
  });
  return router;
}

function publico(row) {
  const { id: anuncioId, nome, categoria, marca, modelo, ano, descricao, diaria, cidade, uf, condicoes, imagem_chave } = row;
  const demonstrativo = typeof descricao === 'string' && descricao.startsWith('[DEMO FICTÍCIO]');
  return { id: anuncioId, nome: nome.replace(/^DEMO · /, ''), categoria, marca, modelo, ano,
    descricao: typeof descricao === 'string' ? descricao.replace(/^\[DEMO FICTÍCIO\]\s*/, '') : descricao,
    diaria, cidade, uf, condicoes, demonstrativo,
    proprietario: { ...(demonstrativo ? {} : { id: row.proprietario_id }), nome: row.proprietario_nome || 'Proprietário' },
    foto_url: imagem_chave ? `/api/anuncios/${anuncioId}/foto` : null };
}
async function registrarEvento(dados) {
  const url = process.env.LOG_SERVICE_URL;
  if (!url) throw new Error('log-service indisponível');
  const r = await fetch(`${url}/eventos`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados), signal: AbortSignal.timeout(1500) });
  if (!r.ok) throw new Error('log-service indisponível');
}
module.exports = { criarRotasRural, papel, publico };

const sharp = require('sharp');
const multer = require('multer');
const db = require('./database');
const storage = require('./minio');

const LIMITE = 5 * 1024 * 1024;
const formatos = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
class ErroFoto extends Error { constructor(status, mensagem) { super(mensagem); this.status = status; } }

const receberFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITE, files: 1, fields: 0, parts: 1 },
  fileFilter(req, file, cb) { cb(formatos[file.mimetype] ? null : new ErroFoto(400, 'Use uma imagem JPEG, PNG ou WebP.'), Boolean(formatos[file.mimetype])); }
}).single('foto');

async function validarFoto(file) {
  if (!file || !formatos[file.mimetype]) throw new ErroFoto(400, 'Envie uma foto JPEG, PNG ou WebP.');
  if (file.size > LIMITE) throw new ErroFoto(413, 'A foto deve ter no máximo 5 MB.');
  try {
    const image = sharp(file.buffer, { limitInputPixels: 25000000, failOn: 'warning' });
    const meta = await image.metadata();
    if (meta.format !== formatos[file.mimetype] || (meta.pages || 1) > 1) throw new Error('Formato inválido');
    const buffer = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).toFormat(meta.format).toBuffer();
    return { buffer, formato: meta.format };
  } catch { throw new ErroFoto(400, 'Imagem inválida. Use JPEG, PNG ou WebP estático de até 25 megapixels.'); }
}

async function removerMelhorEsforco(chave) {
  if (!chave) return;
  try { await storage.remover(chave); } catch { console.error('Não foi possível remover foto de perfil obsoleta.'); }
}

async function atualizarFoto(usuarioId, file) {
  const { buffer, formato } = await validarFoto(file);
  let chave;
  try { chave = await storage.enviar(usuarioId, buffer, formato); }
  catch { throw new ErroFoto(503, 'Armazenamento de fotos indisponível. Tente novamente.'); }
  let conn, anterior, commitIniciado = false;
  try {
    conn = await db.getConnection(); await conn.beginTransaction();
    const [users] = await conn.execute('SELECT id FROM usuarios WHERE id=? FOR UPDATE', [usuarioId]);
    if (!users.length) throw new ErroFoto(404, 'Usuário não encontrado.');
    const [rows] = await conn.execute('SELECT foto_chave FROM perfis WHERE usuario_id=? FOR UPDATE', [usuarioId]);
    anterior = rows[0]?.foto_chave;
    await conn.execute('INSERT INTO perfis (usuario_id,foto_chave) VALUES (?,?) ON DUPLICATE KEY UPDATE foto_chave=VALUES(foto_chave)', [usuarioId, chave]);
    commitIniciado = true; await conn.commit();
  } catch (e) {
    try { if (conn) await conn.rollback(); } catch {}
    if (!commitIniciado) await removerMelhorEsforco(chave);
    throw e instanceof ErroFoto ? e : new ErroFoto(503, 'Não foi possível confirmar a foto. Recarregue o perfil antes de tentar novamente.');
  } finally { conn?.release(); }
  await removerMelhorEsforco(anterior);
  return { foto_chave: chave, foto_url: storage.url(chave) };
}

module.exports = { receberFoto, atualizarFoto, validarFoto, ErroFoto, LIMITE };

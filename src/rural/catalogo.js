// Catálogo inicial: garante que o GiroRural suba com máquinas anunciadas, prontas para
// reserva, aprovação e pagamento de teste. Idempotente: só cria o que ainda não existe.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const ARQUIVO = path.join(__dirname, '../../database/catalogo-maquinas.json');
const EMAIL_PADRAO = 'fazendaboavista@girorural.local';

async function garantirCatalogo(db, env = process.env, log = console) {
  if (env.CATALOGO_INICIAL === 'false') return { ignorado: true };
  const maquinas = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  const email = String(env.CATALOGO_PROPRIETARIO_EMAIL || EMAIL_PADRAO).trim().toLowerCase();
  const senha = env.CATALOGO_PROPRIETARIO_SENHA || '';
  const c = await db.getConnection();
  let criados = 0, donoId;
  try {
    await c.beginTransaction();
    const [donos] = await c.execute('SELECT id, role FROM usuarios WHERE email=? FOR UPDATE', [email]);
    if (donos.length) {
      donoId = donos[0].id;
      // Nunca rebaixa nem promove administradores; só ajusta a conta do catálogo.
      if (!['PROPRIETARIO', 'admin', 'ADMIN'].includes(donos[0].role)) await c.execute("UPDATE usuarios SET role='PROPRIETARIO' WHERE id=?", [donoId]);
      if (senha.length >= 6) await c.execute('UPDATE usuarios SET senha_hash=? WHERE id=?', [await bcrypt.hash(senha, 10), donoId]);
    } else {
      // Sem senha configurada a conta existe, mas ninguém consegue entrar até definir CATALOGO_PROPRIETARIO_SENHA.
      const hash = await bcrypt.hash(senha.length >= 6 ? senha : crypto.randomBytes(24).toString('base64url'), 10);
      const [r] = await c.execute("INSERT INTO usuarios (nome,email,senha_hash,role) VALUES (?,?,?,'PROPRIETARIO')", ['Fazenda Boa Vista', email, hash]);
      donoId = r.insertId;
    }
    await c.execute(`INSERT INTO perfis (usuario_id,nome_exibicao,cidade,uf,bio) VALUES (?,?,?,?,?)
      ON DUPLICATE KEY UPDATE nome_exibicao=COALESCE(nome_exibicao,VALUES(nome_exibicao)),cidade=COALESCE(cidade,VALUES(cidade)),uf=COALESCE(uf,VALUES(uf)),bio=COALESCE(bio,VALUES(bio))`,
    [donoId, 'Fazenda Boa Vista', 'Rio Verde', 'GO', 'Locação de tratores, colheitadeiras e implementos para produtores de várias regiões do Brasil. Máquinas revisadas e entregues com orientação de uso.']);
    for (const m of maquinas) {
      const [existe] = await c.execute('SELECT id FROM equipamentos WHERE imagem_chave=? LIMIT 1', [m.imagem_chave]);
      if (existe.length) continue;
      const [eq] = await c.execute(`INSERT INTO equipamentos (proprietario_id,nome,categoria,marca,modelo,ano,descricao,informacoes_adicionais,imagem_chave,estado)
        VALUES (?,?,?,?,?,?,?,?,?,'ativo')`, [donoId, m.nome, m.categoria, m.marca, m.modelo, m.ano, m.descricao, m.informacoes_adicionais, m.imagem_chave]);
      await c.execute(`INSERT INTO anuncios (equipamento_id,proprietario_id,diaria,cidade,uf,condicoes,estado) VALUES (?,?,?,?,?,?,'ativo')`,
        [eq.insertId, donoId, Number(m.diaria).toFixed(2), m.cidade, m.uf, m.condicoes]);
      criados++;
    }
    await c.commit();
  } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
  if (criados) log.log(`Catálogo inicial: ${criados} anúncios criados.`);
  if (!senha) log.log('Catálogo inicial: defina CATALOGO_PROPRIETARIO_SENHA para entrar na conta do proprietário do catálogo.');
  return { criados, proprietario_id: donoId };
}

module.exports = { garantirCatalogo };

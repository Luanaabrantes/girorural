const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const sharp = require('sharp');
const { Readable } = require('node:stream');
const storage = require('../src/minio');
const { criarRotasRural } = require('../src/rural/rotas');

function bancoControlado() {
  const users = new Map([[1, 'PROPRIETARIO'], [2, 'PROPRIETARIO'], [3, 'LOCATARIO'], [4, 'LOCATARIO']]);
  const equipamentos = [{ id: 10, proprietario_id: 1, nome: 'Trator', categoria: 'Tratores', estado: 'ativo', descricao: 'Uso geral', imagem_chave: null }];
  const anuncios = [{ id: 100, equipamento_id: 10, proprietario_id: 1, diaria: '100.00', cidade: 'Ribeirão Preto', uf: 'SP', condicoes: null, estado: 'ativo' }];
  const reservas = [];
  let nextEquipamento = 11, nextAnuncio = 101, nextReserva = 1;
  async function execute(sql, p = []) {
    if (sql.includes('FROM anuncios a JOIN equipamentos e') && sql.includes("a.estado = 'ativo'")) {
      return [anuncios.filter(a => a.estado === 'ativo').map(a => ({ ...equipamentos.find(e => e.id === a.equipamento_id), ...a }))];
    }
    if (sql.includes('SELECT a.id, e.nome') && sql.includes("a.estado='ativo'")) {
      const a = anuncios.find(x => x.id === p[0] && x.estado === 'ativo'); return [a ? [{ ...equipamentos.find(e => e.id === a.equipamento_id), ...a }] : []];
    }
    if (sql.includes('SELECT id FROM usuarios')) return [users.has(Number(p[0])) ? [{ id: Number(p[0]) }] : []];
    if (sql.includes('SELECT id FROM equipamentos WHERE id=? AND proprietario_id=?')) return [equipamentos.filter(e => e.id === Number(p[0]) && e.proprietario_id === Number(p[1]))];
    if (sql.includes('FROM equipamentos WHERE proprietario_id=?')) return [equipamentos.filter(e => e.proprietario_id === Number(p[0]))];
    if (sql.includes('SELECT * FROM premium_assinaturas')) return [[]];
    if (sql.includes('SELECT e.id,e.imagem_chave FROM anuncios a')) return [anuncios.filter(a => a.id === Number(p[0]) && a.proprietario_id === Number(p[1])).map(a => ({ id: a.equipamento_id, imagem_chave: equipamentos.find(e => e.id === a.equipamento_id)?.imagem_chave }))];
    if (sql.startsWith('UPDATE equipamentos SET imagem_chave=')) { const e = equipamentos.find(x => x.id === Number(p[1]) && x.proprietario_id === Number(p[2])); if (e) e.imagem_chave = p[0]; return [{ affectedRows: e ? 1 : 0 }]; }
    if (sql.includes('SELECT e.imagem_chave,a.estado anuncio_estado')) return [anuncios.filter(a => a.id === Number(p[0])).map(a => ({ imagem_chave: equipamentos.find(e => e.id === a.equipamento_id)?.imagem_chave, anuncio_estado: a.estado, equipamento_estado: equipamentos.find(e => e.id === a.equipamento_id)?.estado, proprietario_id: a.proprietario_id }))];
    if (sql.includes('SELECT COUNT(*) total FROM anuncios')) return [[{ total: anuncios.filter(a => a.proprietario_id === Number(p[0]) && a.estado === 'ativo').length }]];
    if (sql.startsWith('INSERT INTO equipamentos')) { const e = { id: nextEquipamento++, proprietario_id: p[6], nome: p[0], categoria: p[1], marca: p[2], modelo: p[3], ano: p[4], descricao: p[5], estado: 'ativo' }; equipamentos.push(e); return [{ insertId: e.id, affectedRows: 1 }]; }
    if (sql.startsWith('SELECT id FROM equipamentos WHERE id=? AND proprietario_id=? AND estado=')) return [equipamentos.filter(e => e.id === Number(p[0]) && e.proprietario_id === Number(p[1]) && e.estado === 'ativo')];
    if (sql.startsWith('INSERT INTO anuncios')) { const a = { id: nextAnuncio++, equipamento_id: p[0], proprietario_id: p[1], diaria: p[2], cidade: p[3], uf: p[4], condicoes: p[5], estado: p[6] }; anuncios.push(a); return [{ insertId: a.id, affectedRows: 1 }]; }
    if (sql.startsWith('SELECT id,estado FROM anuncios WHERE id=? AND proprietario_id=?')) return [anuncios.filter(a => a.id === Number(p[0]) && a.proprietario_id === Number(p[1]))];
    if (sql.includes('SELECT a.id,a.estado,e.estado equipamento_estado')) return [anuncios.filter(a => a.id === Number(p[0]) && a.proprietario_id === Number(p[1])).map(a => ({ id: a.id, estado: a.estado, equipamento_estado: equipamentos.find(e => e.id === a.equipamento_id)?.estado }))];
    if (sql.startsWith('SELECT id FROM anuncios WHERE id=? AND proprietario_id=?')) return [anuncios.filter(a => a.id === Number(p[0]) && a.proprietario_id === Number(p[1]))];
    if (sql.startsWith('UPDATE anuncios SET')) { const id = Number(p.at(-2)), owner = Number(p.at(-1)), a = anuncios.find(x => x.id === id && x.proprietario_id === owner); if (!a) return [{ affectedRows: 0 }]; const cols = sql.match(/SET (.*?) WHERE/)[1].split(','); cols.forEach((col, i) => { a[col.split('=')[0]] = p[i]; }); return [{ affectedRows: 1 }]; }
    if (sql.startsWith('SELECT id FROM anuncios WHERE id=? AND estado=')) return [anuncios.filter(a => a.id === Number(p[0]) && a.estado === 'ativo')];
    if (sql.includes('SELECT a.id FROM anuncios a JOIN equipamentos e')) return [anuncios.filter(a => a.id === Number(p[0]) && a.estado === 'ativo' && equipamentos.find(e => e.id === a.equipamento_id)?.estado === 'ativo').map(a => ({ id: a.id }))];
    if (sql.startsWith('INSERT INTO reservas')) { const r = { id: nextReserva++, anuncio_id: p[0], solicitante_id: p[1], inicio: p[2], fim: p[3], estado: 'solicitada' }; reservas.push(r); return [{ insertId: r.id, affectedRows: 1 }]; }
    if (sql.includes('SELECT r.id,r.anuncio_id,r.solicitante_id')) { const r = reservas.find(x => x.id === Number(p[0]) && (x.solicitante_id === Number(p[1]) || anuncios.find(a => a.id === x.anuncio_id)?.proprietario_id === Number(p[2]))); return [r ? [{ ...r, proprietario_id: anuncios.find(a => a.id === r.anuncio_id).proprietario_id }] : []]; }
    if (sql.includes('WHERE r.solicitante_id=?')) return [reservas.filter(r => r.solicitante_id === Number(p[0]))];
    throw new Error(`SQL de teste sem implementação: ${sql}`);
  }
  const db = { execute, async getConnection() { return { execute, async beginTransaction(){}, async commit(){}, async rollback(){}, release(){} }; } };
  return { db, equipamentos, anuncios, reservas };
}

test('API GiroRural aplica papel, isolamento, projeção pública e registra eventos após gravações', async t => {
  const { db, anuncios, equipamentos, reservas } = bancoControlado(), eventos = [];
  const originalEnviar = storage.enviarFotoAnuncio, originalLer = storage.lerFotoAnuncio;
  storage.enviarFotoAnuncio = async (owner, buffer, formato) => { assert.equal(owner, 1); assert.ok(buffer.length); assert.equal(formato, 'png'); return 'anuncios/1/11111111-1111-4111-8111-111111111111.png'; };
  storage.lerFotoAnuncio = async () => Readable.from([Buffer.from('imagem-validada')]);
  const authenticate = (req, res, next) => {
    const role = { donoA: 'PROPRIETARIO', donoB: 'PROPRIETARIO', locA: 'LOCATARIO', locB: 'LOCATARIO' }[req.cookies.token];
    if (!role) return res.status(401).json({ mensagem: 'Sessão necessária.' });
    req.usuario = { id: { donoA: 1, donoB: 2, locA: 3, locB: 4 }[req.cookies.token], role }; next();
  };
  const app = express(); app.use(express.json()); app.use(cookieParser());
  app.use('/api', criarRotasRural({ db, autenticar: authenticate, evento: async e => eventos.push(e) }));
  app.use((e, req, res, next) => res.status(500).json({ mensagem: 'erro inesperado' }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  t.after(() => { storage.enviarFotoAnuncio = originalEnviar; storage.lerFotoAnuncio = originalLer; });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, token, method = 'GET', body) => {
    const r = await fetch(base + path, { method, headers: { ...(token ? { Cookie: `token=${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const type = r.headers.get('content-type') || '';
    return { status: r.status, body: r.status === 204 ? null : type.includes('application/json') ? await r.json() : await r.arrayBuffer() };
  };
  await t.test('listagem pública não revela proprietário nem equipamento interno', async () => {
    const r = await request('/api/anuncios'); assert.equal(r.status, 200); assert.equal(r.body.anuncios.length, 1);
    const a = r.body.anuncios[0]; assert.equal(a.nome, 'Trator'); assert.equal(a.proprietario_id, undefined); assert.equal(a.equipamento_id, undefined);
  });
  await t.test('cadastro autenticado exige PROPRIETARIO; anúncio recebe a identidade da sessão', async () => {
    assert.equal((await request('/api/equipamentos', 'locA', 'POST', { nome: 'Arado', categoria: 'Solo' })).status, 403);
    const e = await request('/api/equipamentos', 'donoA', 'POST', { nome: 'Arado', categoria: 'Solo', proprietario_id: 2 }); assert.equal(e.status, 201);
    const a = await request('/api/anuncios', 'donoA', 'POST', { equipamento_id: e.body.id, diaria: 55.25, cidade: 'Sertãozinho', uf: 'SP', proprietario_id: 2 });
    assert.equal(a.status, 201); assert.equal(anuncios.find(x => x.id === a.body.id).proprietario_id, 1);
    assert.equal(eventos.filter(x => x.acao === 'EQUIPAMENTO_CADASTRADO').length, 1); assert.equal(eventos.filter(x => x.acao === 'ANUNCIO_CRIADO').length, 1);
  });
  await t.test('Free permite 2 anúncios ativos e impede ativação acima do limite', async () => {
    const eq = await request('/api/equipamentos', 'donoA', 'POST', { nome: 'Colheitadeira', categoria: 'Colheita' });
    const draft = await request('/api/anuncios', 'donoA', 'POST', { equipamento_id: eq.body.id, diaria: 500, cidade: 'Sertãozinho', uf: 'SP', estado: 'rascunho' });
    assert.equal(draft.status, 201);
    assert.equal((await request(`/api/anuncios/${draft.body.id}`, 'donoA', 'PUT', { estado: 'ativo' })).status, 409);
  });
  await t.test('usuário B não edita anúncio A; A pode editar, e detalhes públicos não vazam dono', async () => {
    assert.equal((await request('/api/anuncios/100', 'donoB', 'PUT', { cidade: 'Outra' })).status, 404);
    assert.equal((await request('/api/anuncios/100', 'donoA', 'PUT', { cidade: 'Cravinhos' })).status, 200);
    assert.equal((await request('/api/anuncios/100')).body.anuncio.proprietario_id, undefined);
  });
  await t.test('locatário cria e consulta somente a própria reserva, sem user_id enviado pelo cliente', async () => {
    assert.equal((await request('/api/reservas', 'donoA', 'POST', { anuncio_id: 100, inicio: '2026-11-01', fim: '2026-11-02' })).status, 403);
    const r = await request('/api/reservas', 'locA', 'POST', { anuncio_id: 100, inicio: '2026-11-01', fim: '2026-11-02', solicitante_id: 4 });
    assert.equal(r.status, 201); assert.equal(reservas[0].solicitante_id, 3);
    assert.equal((await request(`/api/reservas/${r.body.id}`, 'locB')).status, 404);
    assert.equal((await request(`/api/reservas/${r.body.id}`, 'locA')).status, 200);
    assert.equal(eventos.filter(x => x.acao === 'RESERVA_SOLICITADA').length, 1);
  });
  await t.test('validação rejeita datas malformadas e sessão ausente retorna 401', async () => {
    assert.equal((await request('/api/reservas', 'locA', 'POST', { anuncio_id: 100, inicio: '0000-00-00', fim: '2026-01-01' })).status, 400);
    assert.equal((await request('/api/equipamentos', null, 'POST', { nome: 'A', categoria: 'B' })).status, 401);
  });
  await t.test('upload processa foto, vincula MinIO ao equipamento e publica foto de anúncio ativo', async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#527a42' } }).png().toBuffer();
    const form = new FormData(); form.append('foto', new Blob([png], { type: 'image/png' }), 'foto.png');
    const upload = await fetch(base + '/api/anuncios/100/foto', { method: 'POST', headers: { Cookie: 'token=donoA' }, body: form });
    assert.equal(upload.status, 201); assert.equal(equipamentos[0].imagem_chave, 'anuncios/1/11111111-1111-4111-8111-111111111111.png');
    assert.equal((await request('/api/anuncios/100/foto', 'donoB')).status, 200);
    const photo = await fetch(base + '/api/anuncios/100/foto'); assert.equal(photo.status, 200); assert.match(photo.headers.get('content-type'), /image\/png/);
  });
});

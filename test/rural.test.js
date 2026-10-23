const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const { criarAcessoRural, ErroAcessoRural } = require('../src/rural/acesso');
const { destinoDev } = require('../scripts/migrar-rural');
const { validarUsuarios, reverterVazio } = require('../src/rural/migracoes');

// Dobro de persistencia para testes HTTP/autorizacao. Nao comprova MariaDB.
function persistenciaControlada() {
    const equipamentos = [{ id: 10, proprietario_id: 1, nome: 'Arado', descricao: 'A', estado: 'ativo' },
        { id: 20, proprietario_id: 2, nome: 'Grade', descricao: 'B', estado: 'ativo' }];
    const anuncios = [{ id: 100, equipamento_id: 10, estado: 'ativo', diaria: '50.00', cidade: 'Piloto', uf: 'SP', condicoes: 'Retirada combinada' },
        { id: 101, equipamento_id: 20, estado: 'rascunho', diaria: '60.00' }];
    const reservas = [{ id: 1000, anuncio_id: 100, solicitante_id: 2, proprietario_id: 1, estado: 'solicitada' }];
    const c = {
        async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
        async execute(sql, params) {
            if (sql.startsWith('UPDATE equipamentos')) {
                assert.match(sql, /WHERE id = \? AND proprietario_id = \?/);
                const e = equipamentos.find(e => e.id === params[1] && e.proprietario_id === params[2]);
                if (e) e.descricao = params[0];
                return [{ affectedRows: e ? 1 : 0 }];
            }
            if (sql.startsWith('UPDATE anuncios')) {
                assert.match(sql, /WHERE a.id = \? AND e.proprietario_id = \?/);
                const a = anuncios.find(a => a.id === params[1]);
                const e = a && equipamentos.find(e => e.id === a.equipamento_id && e.proprietario_id === params[2]);
                if (e) a.condicoes = params[0];
                return [{ affectedRows: e ? 1 : 0 }];
            }
            if (sql.includes('FROM reservas r')) {
                assert.match(sql, /r.solicitante_id = \? OR e.proprietario_id = \?/);
                return [reservas.filter(r => r.id === params[0] && (r.solicitante_id === params[1] || r.proprietario_id === params[2]))];
            }
            if (sql.includes('FROM anuncios a')) {
                if (sql.includes("a.estado = 'ativo'")) {
                    assert.match(sql, /e.estado = 'ativo'/);
                    // Coluna privada extra proposital: deve ser retirada da projeção pública.
                    return [anuncios.filter(a => a.id === params[0] && a.estado === 'ativo')
                        .flatMap(a => equipamentos.filter(e => e.id === a.equipamento_id && e.estado === 'ativo').map(e => ({ ...e, ...a })))];
                }
                assert.match(sql, /WHERE a.id = \? AND e.proprietario_id = \?/);
                return [anuncios.filter(a => a.id === params[0] && equipamentos.some(e => e.id === a.equipamento_id && e.proprietario_id === params[1]))];
            }
            assert.match(sql, /WHERE id = \? AND proprietario_id = \?/);
            return [equipamentos.filter(e => e.id === params[0] && e.proprietario_id === params[1])];
        }
    };
    return { ...c, getConnection: async () => c };
}
test('Issue #1: fronteira HTTP com sessao existente e persistencia controlada', async t => {
    const acesso = criarAcessoRural(persistenciaControlada());
    const app = express(); app.use(express.json()); app.use(cookieParser());
    const autenticar = require('../src/middlewareAuth');
    const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
    // Rotas apenas no harness; nenhum CRUD/endpoints novos sao montados no servidor real.
    app.get('/publico/:id', wrap(async (q, s) => s.json(await acesso.consultarAnuncioPublico(q.params.id))));
    app.get('/equipamentos/:id', autenticar, wrap(async (q, s) => s.json(await acesso.consultarEquipamentoPrivado(q.usuario, q.params.id))));
    app.patch('/equipamentos/:id', autenticar, wrap(async (q, s) => {
        await acesso.alterarDescricaoEquipamento(q.usuario, q.params.id, q.body); s.sendStatus(204);
    }));
    app.get('/anuncios/:id', autenticar, wrap(async (q, s) => s.json(await acesso.consultarAnuncioPrivado(q.usuario, q.params.id))));
    app.patch('/anuncios/:id', autenticar, wrap(async (q, s) => {
        await acesso.alterarCondicoesAnuncio(q.usuario, q.params.id, q.body); s.sendStatus(204);
    }));
    app.get('/reservas/:id', autenticar, wrap(async (q, s) => s.json(await acesso.consultarReservaPrivada(q.usuario, q.params.id))));
    app.use((e, q, s, next) => s.status(e instanceof ErroAcessoRural ? e.status : 503)
        .json({ mensagem: e instanceof ErroAcessoRural ? e.message : 'Serviço indisponível.' }));
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
        const token = options.headers.Authorization.slice(7);
        const usuario = { A: { id: 1, role: 'usuario' }, B: { id: 2, role: 'usuario' },
            ADMIN: { id: 2, role: 'admin' }, C: { id: 3, role: 'admin' } }[token];
        return { ok: !!usuario, status: usuario ? 200 : 401, json: async () => ({ usuario }) };
    };
    const server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    const request = (url, token, body) => originalFetch(`http://127.0.0.1:${server.address().port}${url}`, {
        method: body === undefined ? 'GET' : 'PATCH', headers: {
            ...(token ? { Cookie: `token=${token}` } : {}), 'Content-Type': 'application/json'
        }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    try {
        await t.test('A consulta seu equipamento e anuncio', async () => {
            assert.equal((await request('/equipamentos/10', 'A')).status, 200);
            assert.equal((await request('/anuncios/100', 'A')).status, 200);
        });
        await t.test('B nao distingue equipamento privado de ID inexistente', async () => {
            const alheio = await request('/equipamentos/10', 'B');
            const ausente = await request('/equipamentos/999', 'B');
            assert.equal(alheio.status, 404); assert.equal(ausente.status, 404);
            assert.deepEqual(await alheio.json(), await ausente.json());
            assert.equal((await request('/anuncios/100', 'B')).status, 404);
        });
        await t.test('B nao altera recurso de A, mas altera o proprio', async () => {
            assert.equal((await request('/equipamentos/10', 'B', { descricao: 'Invadido' })).status, 404);
            assert.equal((await request('/equipamentos/20', 'B', { descricao: 'Atualizado' })).status, 204);
            assert.equal((await (await request('/equipamentos/10', 'A')).json()).descricao, 'A');
        });
        await t.test('anonimo recebe 401 em leituras e escritas protegidas', async () => {
            for (const url of ['/equipamentos/10', '/anuncios/100', '/reservas/1000']) assert.equal((await request(url)).status, 401);
            assert.equal((await request('/equipamentos/10', null, { descricao: 'X' })).status, 401);
        });
        await t.test('proprietario_id no corpo nao concede ou transfere propriedade', async () => {
            for (const token of ['A', 'B', 'ADMIN']) {
                assert.equal((await request('/equipamentos/10', token, { descricao: 'X', proprietario_id: 1 })).status, 400);
                assert.equal((await request('/anuncios/100', token, { condicoes: 'X', proprietario_id: 1 })).status, 400);
            }
            assert.equal((await (await request('/equipamentos/10', 'A')).json()).proprietario_id, 1);
        });
        await t.test('admin nao ignora propriedade', async () => {
            assert.equal((await request('/equipamentos/10', 'ADMIN')).status, 404);
            assert.equal((await request('/equipamentos/10', 'ADMIN', { descricao: 'X' })).status, 404);
            assert.equal((await request('/equipamentos/20', 'ADMIN')).status, 200);
            assert.equal((await request('/anuncios/100', 'ADMIN', { condicoes: 'X' })).status, 404);
        });
        await t.test('anuncio privado e alteracao restritos ao dono do equipamento', async () => {
            assert.equal((await request('/anuncios/100', 'B', { condicoes: 'X' })).status, 404);
            assert.equal((await request('/anuncios/100', 'A', { condicoes: 'Combinado' })).status, 204);
        });
        await t.test('publico permite leitura anonima de ativos e remove colunas privadas', async () => {
            const r = await request('/publico/100'); assert.equal(r.status, 200);
            const a = await r.json(); assert.equal(a.nome, 'Arado'); assert.equal(a.diaria, '50.00');
            assert.equal('proprietario_id' in a, false); assert.equal('equipamento_id' in a, false);
            assert.equal('criado_em' in a, false);
            assert.equal((await request('/publico/101')).status, 404);
        });
        await t.test('reserva separa solicitante e proprietario; terceiro admin nao participa', async () => {
            const a = await (await request('/reservas/1000', 'A')).json();
            const b = await (await request('/reservas/1000', 'B')).json();
            assert.equal(a.como_proprietario, true); assert.equal(a.como_solicitante, false);
            assert.equal(b.como_solicitante, true); assert.equal(b.como_proprietario, false);
            assert.equal((await request('/reservas/1000', 'C')).status, 404);
        });
        await t.test('IDs malformados e sessao sem identidade valida falham fechados', async () => {
            assert.equal((await request('/equipamentos/1%20OR%201=1', 'A')).status, 400);
            await assert.rejects(acesso.consultarEquipamentoPrivado({ role: 'admin' }, 10), { status: 401 });
        });
    } finally {
        global.fetch = originalFetch;
        await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    }
});
test('CLI rural recusa configuracao externa e nao reutiliza DB_*', () => {
    assert.throws(() => destinoDev({ DB_HOST: '127.0.0.1', DB_NAME: 'girorural_test_x' }));
    assert.throws(() => destinoDev({ GIRO_DEV_DB_HOST: 'externo.example', GIRO_DEV_DB_NAME: 'girorural_test_x' }));
    assert.throws(() => destinoDev({ GIRO_DEV_DB_HOST: '127.0.0.1', GIRO_DEV_DB_NAME: 'producao' }));
    const env = { GIRO_DEV_DB_HOST: '127.0.0.1', GIRO_DEV_DB_NAME: 'girorural_test_x', GIRO_DEV_DB_USER: 'qa' };
    assert.equal(destinoDev(env).database, 'girorural_test_x');
    assert.throws(() => destinoDev({ ...env, NODE_ENV: 'production' }));
});
test('preflight recusa dependencia desconhecida e reversao recusa dados sem executar DROP', async () => {
    await assert.rejects(validarUsuarios({ execute: async () => [[]] }), /Dependência incompatível/);
    for (const COLUMN_TYPE of ['bigint(20)', 'int(10) unsigned', 'varchar(20)']) {
        await assert.rejects(validarUsuarios({ execute: async () => [[{ COLUMN_TYPE, COLUMN_KEY: 'PRI', ENGINE: 'InnoDB' }]] }));
    }
    let drops = 0;
    await assert.rejects(reverterVazio({
        execute: async () => [[{ TABLE_NAME: 'equipamentos' }]],
        query: async sql => { if (sql.startsWith('DROP')) drops++; return [[{ quantidade: 1 }]]; }
    }), /Reversão recusada/);
    assert.equal(drops, 0);
});

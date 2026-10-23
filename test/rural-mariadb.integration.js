// Executado somente pelo laboratorio isolado, fora do glob npm test.
const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { aplicar, reverterVazio } = require('../src/rural/migracoes');
const { criarAcessoRural } = require('../src/rural/acesso');
if (process.env.GIRO_RURAL_LAB !== '1') throw new Error('Execute node scripts/validar-rural-mariadb.js; nao aponte para o banco da aplicacao.');
test('MariaDB real descartavel: esquema, isolamento e reversao', async t => {
    const pool = mysql.createPool({ host: '127.0.0.1', user: 'root', password: '',
        database: 'girorural_test_issue1', multipleStatements: true, dateStrings: true, connectTimeout: 5000 });
    let c;
    const A = { id: 1, role: 'usuario' }, B = { id: 2, role: 'usuario' }, C = { id: 3, role: 'admin' };
    const acesso = criarAcessoRural(pool);
    try {
        c = await pool.getConnection();
        await t.test('preflight recusa usuarios.id unsigned antes de criar tabelas', async () => {
            await c.query('CREATE TABLE usuarios (id INT UNSIGNED NOT NULL PRIMARY KEY) ENGINE=InnoDB');
            await assert.rejects(aplicar(c), /Dependência incompatível/);
            const [rows] = await c.query("SHOW TABLES LIKE 'equipamentos'"); assert.equal(rows.length, 0);
            await c.query('DROP TABLE usuarios'); // Apenas fixture vazia deste laboratorio.
        });
        // Contrato minimo de dependencia para teste, NAO DDL original reconstruido.
        await c.query('CREATE TABLE usuarios (id INT NOT NULL PRIMARY KEY) ENGINE=InnoDB; INSERT INTO usuarios VALUES (1),(2),(3);');
        await t.test('migração aplicavel e reexecutavel preserva usuarios', async () => {
            await aplicar(c); await aplicar(c);
            const [users] = await c.query('SELECT COUNT(*) AS n FROM usuarios'); assert.equal(users[0].n, 3);
        });
        await t.test('PKs, FKs RESTRICT e indices declarados existem no MariaDB', async () => {
            const [pks] = await c.query(`SELECT TABLE_NAME FROM information_schema.TABLE_CONSTRAINTS
                WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_TYPE='PRIMARY KEY'
                AND TABLE_NAME IN ('equipamentos','anuncios','reservas')`);
            assert.equal(pks.length, 3);
            const [fks] = await c.query(`SELECT DELETE_RULE, UPDATE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
                WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME IN ('equipamentos','anuncios','reservas')`);
            assert.equal(fks.length, 4);
            for (const fk of fks) { assert.equal(fk.DELETE_RULE, 'RESTRICT'); assert.equal(fk.UPDATE_RULE, 'RESTRICT'); }
            for (const [tabela, indice, colunas] of [
                ['equipamentos', 'idx_equipamento_proprietario', 'proprietario_id,estado'],
                ['anuncios', 'uq_anuncio_equipamento', 'equipamento_id'],
                ['reservas', 'idx_reserva_solicitante', 'solicitante_id,id'],
                ['reservas', 'idx_reserva_anuncio_periodo', 'anuncio_id,inicio,fim,estado']
            ]) {
                const [indices] = await c.execute(`SELECT COLUMN_NAME, NON_UNIQUE FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=? ORDER BY SEQ_IN_INDEX`, [tabela, indice]);
                assert.equal(indices.map(i => i.COLUMN_NAME).join(','), colunas);
                if (tabela === 'anuncios') assert.equal(indices[0].NON_UNIQUE, 0);
            }
        });
        await c.query(`INSERT INTO equipamentos (id,proprietario_id,nome,categoria) VALUES (10,1,'Arado','Solo'),(20,2,'Grade','Solo');
            INSERT INTO anuncios (id,equipamento_id,diaria,cidade,uf,estado) VALUES (100,10,50.00,'Piloto','SP','ativo'),(101,20,60.00,'Piloto','SP','rascunho');
            INSERT INTO reservas (id,anuncio_id,solicitante_id,inicio,fim) VALUES (1000,100,2,'2026-11-01','2026-11-03');`);
        await t.test('FKs, nulidade, unicidade, dinheiro e periodo', async () => {
            for (const sql of [
                "INSERT INTO equipamentos (proprietario_id,nome,categoria) VALUES (999,'X','Solo')",
                "INSERT INTO equipamentos (proprietario_id,nome,categoria) VALUES (NULL,'X','Solo')",
                "INSERT INTO anuncios (equipamento_id,diaria,cidade,uf) VALUES (999,1,'Piloto','SP')",
                "INSERT INTO anuncios (equipamento_id,diaria,cidade,uf) VALUES (10,1,'Piloto','SP')",
                "INSERT INTO reservas (anuncio_id,solicitante_id,inicio,fim) VALUES (999,2,'2026-11-01','2026-11-02')",
                "INSERT INTO reservas (anuncio_id,solicitante_id,inicio,fim) VALUES (100,999,'2026-11-01','2026-11-02')",
                "INSERT INTO reservas (anuncio_id,solicitante_id,inicio,fim) VALUES (100,2,'2026-11-03','2026-11-01')",
                "UPDATE anuncios SET diaria=-1 WHERE id=100", "UPDATE anuncios SET diaria=0 WHERE id=100",
                "UPDATE anuncios SET uf='ZZ' WHERE id=100", "UPDATE anuncios SET uf='sp' WHERE id=100",
                "UPDATE equipamentos SET estado='desconhecido' WHERE id=10",
                "UPDATE anuncios SET estado='desconhecido' WHERE id=100",
                "UPDATE reservas SET estado='desconhecido' WHERE id=1000",
                "UPDATE equipamentos SET nome=' ' WHERE id=10", "UPDATE anuncios SET cidade=' ' WHERE id=100",
                "DELETE FROM usuarios WHERE id=1", "DELETE FROM usuarios WHERE id=2",
                "DELETE FROM equipamentos WHERE id=10", "DELETE FROM anuncios WHERE id=100"
            ]) await assert.rejects(c.query(sql), sql);
            const [cols] = await c.query("SHOW COLUMNS FROM anuncios LIKE 'diaria'");
            assert.match(cols[0].Type, /^decimal\(10,2\)$/);
        });
        await t.test('proprietario, terceiro e admin com SQL real', async () => {
            assert.equal((await acesso.consultarEquipamentoPrivado(A, 10)).proprietario_id, 1);
            for (const user of [B, C]) {
                await assert.rejects(acesso.consultarEquipamentoPrivado(user, 10), { status: 404 });
                await assert.rejects(acesso.alterarDescricaoEquipamento(user, 10, { descricao: 'X' }), { status: 404 });
                await assert.rejects(acesso.consultarAnuncioPrivado(user, 100), { status: 404 });
                await assert.rejects(acesso.alterarCondicoesAnuncio(user, 100, { condicoes: 'X' }), { status: 404 });
            }
            await acesso.alterarDescricaoEquipamento(A, 10, { descricao: 'Validado' });
            await acesso.alterarCondicoesAnuncio(A, 100, { condicoes: 'Combinado' });
            assert.equal((await acesso.consultarEquipamentoPrivado(A, 10)).descricao, 'Validado');
            assert.equal((await acesso.consultarAnuncioPrivado(A, 100)).condicoes, 'Combinado');
            await assert.rejects(acesso.alterarDescricaoEquipamento(A, 10, { descricao: 'X', proprietario_id: 2 }), { status: 400 });
            await assert.rejects(acesso.consultarEquipamentoPrivado(null, 10), { status: 401 });
        });
        await t.test('falha de UPDATE desfaz transacao e permite uso posterior da conexao', async () => {
            await c.query("CREATE TRIGGER falhar_update BEFORE UPDATE ON equipamentos FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='falha intencional do laboratorio'");
            try { await assert.rejects(acesso.alterarDescricaoEquipamento(A, 10, { descricao: 'Nao persistir' }), /falha intencional/); }
            finally { await c.query('DROP TRIGGER falhar_update'); }
            assert.equal((await acesso.consultarEquipamentoPrivado(A, 10)).descricao, 'Validado');
            await acesso.alterarDescricaoEquipamento(A, 10, { descricao: 'Apos rollback' });
            assert.equal((await acesso.consultarEquipamentoPrivado(A, 10)).descricao, 'Apos rollback');
        });
        await t.test('publico difere do privado; papeis de reserva distintos', async () => {
            const publico = await acesso.consultarAnuncioPublico(100);
            assert.equal(publico.diaria, '50.00');
            assert.deepEqual(Object.keys(publico).sort(), ['id', 'nome', 'categoria', 'descricao', 'diaria', 'cidade', 'uf', 'condicoes'].sort());
            await assert.rejects(acesso.consultarAnuncioPublico(101), { status: 404 });
            await c.query("UPDATE equipamentos SET estado='inativo' WHERE id=10");
            await assert.rejects(acesso.consultarAnuncioPublico(100), { status: 404 });
            assert.equal((await acesso.consultarReservaPrivada(A, 1000)).como_proprietario, true);
            assert.equal((await acesso.consultarReservaPrivada(B, 1000)).como_solicitante, true);
            await assert.rejects(acesso.consultarReservaPrivada(C, 1000), { status: 404 });
        });
        await t.test('reversao recusa dados e preserva todas as tabelas', async () => {
            await assert.rejects(reverterVazio(c), /Reversão recusada/);
            const [rows] = await c.query('SELECT COUNT(*) AS n FROM reservas'); assert.equal(rows[0].n, 1);
        });
        // Exclusoes intencionais somente das fixtures DESTE banco descartavel.
        await c.query('DELETE FROM reservas; DELETE FROM anuncios; DELETE FROM equipamentos;');
        await t.test('reversao vazia, reexecucao e reaplicacao', async () => {
            await reverterVazio(c); await reverterVazio(c);
            const [rows] = await c.query('SELECT COUNT(*) AS n FROM usuarios'); assert.equal(rows[0].n, 3);
            await aplicar(c); await reverterVazio(c);
        });
    } finally { if (c) c.release(); await pool.end(); }
});

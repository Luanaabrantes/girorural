const fs = require('node:fs');
const path = require('node:path');
const tabelas = ['reservas', 'anuncios', 'equipamentos'];
async function validarUsuarios(c) {
    const [rows] = await c.execute(`SELECT c.COLUMN_TYPE, c.COLUMN_KEY, t.ENGINE,
        (SELECT COUNT(*) FROM information_schema.STATISTICS s WHERE s.TABLE_SCHEMA = DATABASE()
            AND s.TABLE_NAME = 'usuarios' AND s.INDEX_NAME = 'PRIMARY') AS PRIMARY_COLUMNS
        FROM information_schema.COLUMNS c JOIN information_schema.TABLES t
          ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
        WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = 'usuarios' AND c.COLUMN_NAME = 'id'`);
    if (rows.length !== 1 || !/^int(?:\(\d+\))?$/i.test(rows[0].COLUMN_TYPE)
        || rows[0].COLUMN_KEY !== 'PRI' || Number(rows[0].PRIMARY_COLUMNS) !== 1 || rows[0].ENGINE !== 'InnoDB') {
        throw new Error('Dependência incompatível: confirme usuarios.id INT assinado, PK e InnoDB. Nenhum DDL de usuarios será criado ou alterado.');
    }
}
async function aplicar(c) {
    await validarUsuarios(c);
    const sql = fs.readFileSync(path.join(__dirname, '../../database/migracao-girorural-issue1.sql'), 'utf8');
    // Arquivo estático do repositório, sem parâmetros externos/interpolação.
    // mysql2 deve ser configurado com multipleStatements para esta conexão CLI.
    await c.query(sql);
}
async function reverterVazio(c) {
    // Exige exclusividade de manutenção: DDL MariaDB faz commit implícito.
    // Não desativa FKs e nunca apaga registros para permitir a reversão.
    const [existentes] = await c.execute(`SELECT TABLE_NAME FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('reservas', 'anuncios', 'equipamentos')`);
    const nomes = new Set(existentes.map(t => t.TABLE_NAME));
    for (const tabela of tabelas.filter(t => nomes.has(t))) {
        const [rows] = await c.query(`SELECT COUNT(*) AS quantidade FROM ${tabela}`);
        if (Number(rows[0].quantidade) !== 0) throw new Error('Reversão recusada: existem dados GiroRural. Preserve o esquema e prepare migração compensatória.');
    }
    // Um dependente externo também deve recusar a reversão antes do primeiro DROP.
    const [dependentes] = await c.execute(`SELECT TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IN ('equipamentos', 'anuncios', 'reservas')
        AND (TABLE_SCHEMA <> DATABASE() OR TABLE_NAME NOT IN ('equipamentos', 'anuncios', 'reservas'))`);
    if (dependentes.length) throw new Error('Reversão recusada: há dependências externas ao domínio GiroRural.');
    for (const tabela of tabelas.filter(t => nomes.has(t))) await c.query(`DROP TABLE ${tabela}`);
}
module.exports = { validarUsuarios, aplicar, reverterVazio };

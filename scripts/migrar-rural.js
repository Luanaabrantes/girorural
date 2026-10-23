// CLI de desenvolvimento: nao carrega .env nem utiliza DB_* da aplicacao.
const mysql = require('mysql2/promise');
const { aplicar, reverterVazio, validarUsuarios } = require('../src/rural/migracoes');
function destinoDev(env) {
    const host = env.GIRO_DEV_DB_HOST;
    const database = env.GIRO_DEV_DB_NAME;
    if (!['127.0.0.1', 'localhost', '::1'].includes(host)
        || !/^girorural_(dev|test)_[a-zA-Z0-9_]+$/.test(database || '')
        || env.NODE_ENV === 'production') {
        throw new Error('Use somente banco local girorural_dev_* ou girorural_test_* e variáveis GIRO_DEV_DB_*. Banco externo/produção não é permitido.');
    }
    if (!env.GIRO_DEV_DB_USER) throw new Error('Informe GIRO_DEV_DB_USER.');
    const port = Number(env.GIRO_DEV_DB_PORT || 3306);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida.');
    return { host, database, port, user: env.GIRO_DEV_DB_USER,
        password: env.GIRO_DEV_DB_PASSWORD, multipleStatements: true };
}
async function executar(args = process.argv.slice(2), env = process.env) {
    if (args.some(a => !['--aplicar', '--reverter', '--manutencao-exclusiva'].includes(a))
        || (args.includes('--aplicar') && args.includes('--reverter'))) throw new Error('Opções inválidas.');
    if (args.includes('--reverter') && !args.includes('--manutencao-exclusiva')) {
        throw new Error('Pare os escritores locais e confirme --manutencao-exclusiva para reverter.');
    }
    const c = await mysql.createConnection(destinoDev(env));
    try {
        if (args.includes('--aplicar')) { await aplicar(c); console.log('Migração GiroRural aplicada no desenvolvimento local.'); }
        else if (args.includes('--reverter')) { await reverterVazio(c); console.log('Tabelas GiroRural vazias removidas; usuarios preservada.'); }
        else { await validarUsuarios(c); console.log('Prévia: dependência usuarios compatível. Nenhum DDL executado.'); }
    } finally { await c.end(); }
}
if (require.main === module) executar().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { destinoDev };

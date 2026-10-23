// Testes da orquestracao com Docker simulado; NAO executam MariaDB.
const test = require('node:test');
const assert = require('node:assert/strict');
const { executarLaboratorio } = require('../scripts/validar-rural-mariadb');
function dockerSimulado(falhar) {
    const chamadas = [], containers = new Set(), volumes = new Set();
    const spawn = (cmd, args) => {
        assert.equal(cmd, 'docker'); chamadas.push(args);
        let stdout = '';
        if (args[0] === 'run') containers.add(args[args.indexOf('--name') + 1]);
        if (falhar?.(args)) return { status: 1, stderr: 'falha simulada', stdout: 'diagnostico do teste' };
        if (args[0] === 'volume' && args[1] === 'create') volumes.add(args[2]);
        if (args[0] === 'volume' && args[1] === 'rm') volumes.delete(args[2]);
        if (args[0] === 'ps') {
            const nome = args[args.indexOf('--filter') + 1].slice(7, -1);
            stdout = containers.has(nome) ? nome : '';
        }
        if (args[0] === 'rm') containers.delete(args.at(-1));
        return { status: 0, stdout, stderr: '' };
    };
    return { spawn, chamadas, containers, volumes };
}
test('laboratorio: dependencias Linux, fontes sem node_modules e rede descartavel; limpa sucesso', async () => {
    const fake = dockerSimulado();
    await executarLaboratorio({ spawn: fake.spawn, esperar: async () => {}, escrever: () => {} });
    const runs = fake.chamadas.filter(a => a[0] === 'run');
    assert.equal(runs.length, 3);
    assert.match(runs[0].at(-1), /npm ci .*--ignore-scripts/);
    assert.equal(runs[1][runs[1].indexOf('--network') + 1], 'none');
    assert.match(runs[2][runs[2].indexOf('--network') + 1], /^container:girorural-issue1-/);
    assert.ok(runs[2].includes('NODE_PATH=/deps/node_modules'));
    assert.ok(runs[2].some(a => a.includes('target=/deps,readonly')));
    assert.ok(!runs[2].some(a => /target=\/app,/.test(a)));
    assert.ok(fake.chamadas.some(a => a.includes('--protocol=TCP') && a.includes('SELECT 1')));
    assert.ok(!runs.some(a => a.includes('-p') || a.includes('--env-file')));
    assert.equal(fake.containers.size, 0); assert.equal(fake.volumes.size, 0);
});
test('laboratorio: falha no teste preserva erro e remove inclusive container parcialmente criado', async () => {
    const fake = dockerSimulado(a => a.includes('test/rural-mariadb.integration.js'));
    await assert.rejects(executarLaboratorio({ spawn: fake.spawn, esperar: async () => {}, escrever: () => {} }), /falha simulada/);
    assert.equal(fake.containers.size, 0); assert.equal(fake.volumes.size, 0);
});
test('laboratorio: daemon negado encerra antes de downloads ou criacao de recursos', async () => {
    const fake = dockerSimulado(a => a[0] === 'version');
    await assert.rejects(executarLaboratorio({ spawn: fake.spawn }), /Docker version falhou/);
    assert.equal(fake.chamadas.length, 1);
});

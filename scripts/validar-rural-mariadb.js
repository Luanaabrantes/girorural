// Laboratorio independente: sem .env, portas publicadas, volumes ou stack existentes.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const name = `girorural-issue1-${process.pid}-${Date.now()}`;
const root = path.resolve(__dirname, '..');
let created = false;
function docker(args) {
    const r = spawnSync('docker', args, { encoding: 'utf8', timeout: 120000 });
    if (r.status !== 0) throw new Error(`Laboratório Docker indisponível ou falhou: ${(r.stderr || r.error?.message || '').trim()}`);
    return r.stdout;
}
(async () => {
    docker(['version', '--format', '{{.Server.Version}}']);
    // Baixar imagens antes de isolar a rede do laboratorio.
    docker(['pull', 'mariadb:11.4']); docker(['pull', 'node:20-alpine']);
    docker(['run', '--rm', '-d', '--name', name, '--network', 'none',
        '-e', 'MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1', '-e', 'MARIADB_DATABASE=girorural_test_issue1', 'mariadb:11.4']);
    created = true;
    let ready = false;
    for (let i = 0; i < 60; i++) {
        try { docker(['exec', name, 'mariadb-admin', '-uroot', 'ping', '--silent']); ready = true; break; }
        catch { await new Promise(r => setTimeout(r, 500)); }
    }
    if (!ready) throw new Error('MariaDB descartável não ficou pronto.');
    process.stdout.write(docker(['run', '--rm', '--network', `container:${name}`,
        '--mount', `type=bind,source=${root},target=/app,readonly`, '-w', '/app',
        '-e', 'GIRO_RURAL_LAB=1', 'node:20-alpine', 'node', '--test', 'test/rural-mariadb.integration.js']));
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => {
    if (created) { try { docker(['stop', '-t', '2', name]); } catch (e) { console.error(e.message); process.exitCode = 1; } }
});

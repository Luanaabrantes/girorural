// Laboratorio independente: nunca le .env/DB_* nem publica portas.
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
async function executarLaboratorio({ spawn = spawnSync, esperar = ms => new Promise(r => setTimeout(r, ms)),
    escrever = texto => process.stdout.write(texto) } = {}) {
    const name = `girorural-issue1-${randomUUID()}`;
    const banco = `${name}-db`, preparo = `${name}-deps`, teste = `${name}-test`, volume = `${name}-deps`;
    const root = path.resolve(__dirname, '..');
    const recursos = [];
    let volumeCriado = false;
    function docker(args, timeout = 60000) {
        const r = spawn('docker', args, { encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024 });
        if (r.status !== 0) throw new Error(`Docker ${args[0]} falhou: ${[r.stdout, r.stderr, r.error?.message].filter(Boolean).join('\n').trim() || `status ${r.status}`}`);
        return r.stdout;
    }
    function executarContainer(nome, args, timeout) {
        // Registrar ANTES de run: timeout/falha pode deixar container criado.
        recursos.push(nome);
        return docker(['run', '--rm', '--name', nome, ...args], timeout);
    }
    const checkout = ['--mount', `type=bind,source=${root},target=/app,readonly`, '-w', '/app'];
    const fontesTeste = ['src/rural', 'database/migracao-girorural-issue1.sql', 'test/rural-mariadb.integration.js']
        .flatMap(arquivo => ['--mount', `type=bind,source=${path.join(root, arquivo)},target=/app/${arquivo},readonly`]);
    let falha;
    try {
        docker(['version', '--format', '{{.Server.Version}}']);
        docker(['pull', 'mariadb:11.4']); docker(['pull', 'node:20-alpine']);
        docker(['volume', 'create', volume]); volumeCriado = true;
        // Dependencias Linux do lockfile, sem scripts e sem node_modules do host.
        // Somente o preparo usa rede de saida; nao recebe dados/credenciais do banco.
        escrever(executarContainer(preparo, [...checkout, '--mount', `type=volume,source=${volume},target=/deps`,
            'node:20-alpine', 'sh', '-c',
            'cp /app/package.json /app/package-lock.json /deps/ && npm ci --prefix /deps --ignore-scripts --no-audit --no-fund']));
        executarContainer(banco, ['-d', '--network', 'none', '-e', 'MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1',
            '-e', 'MARIADB_DATABASE=girorural_test_issue1', 'mariadb:11.4']);
        let ready = false;
        for (let i = 0; i < 60; i++) {
            try {
                // TCP + SELECT no banco definitivo; socket pode atingir o servidor temporario de init.
                docker(['exec', banco, 'mariadb', '--protocol=TCP', '-h127.0.0.1', '-uroot',
                    '-Dgirorural_test_issue1', '-Nse', 'SELECT 1'], 2000);
                ready = true; break;
            } catch { await esperar(500); }
        }
        if (!ready) throw new Error('MariaDB descartavel nao aceitou SELECT por TCP apos 60 tentativas.');
        escrever(executarContainer(teste, ['--network', `container:${banco}`, ...fontesTeste, '-w', '/app',
            '--mount', `type=volume,source=${volume},target=/deps,readonly`,
            '-e', 'NODE_PATH=/deps/node_modules', '-e', 'GIRO_RURAL_LAB=1',
            'node:20-alpine', 'node', '--test', 'test/rural-mariadb.integration.js']));
    } catch (e) { falha = e; }
    finally {
        const erros = [];
        // Somente nomes aleatorios DESTA execucao. -v remove volumes anonimos do MariaDB.
        for (const nome of recursos.reverse()) {
            try {
                const existentes = docker(['ps', '-a', '--filter', `name=^/${nome}$`, '--format', '{{.Names}}']);
                if (existentes.trim() === nome) docker(['rm', '-f', '-v', nome]);
            } catch (e) { erros.push(e.message); }
        }
        if (volumeCriado) { try { docker(['volume', 'rm', volume]); } catch (e) { erros.push(e.message); } }
        if (erros.length) falha = new Error(`${falha ? `${falha.message}\n` : ''}Limpeza incompleta: ${erros.join('\n')}`);
    }
    if (falha) throw falha;
}
if (require.main === module) executarLaboratorio().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { executarLaboratorio };

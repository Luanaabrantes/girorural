const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { gerar } = require('../src/openapi');

const rotas = {
  girorural: {
    'src/server.js': '', 'src/auth.js': '/api/auth', 'src/perfil.js': '/api', 'src/logs.js': '/api/logs',
    'src/admin.js': '/api/admin', 'src/premium.js': '/api/premium', 'src/locacao.js': '/api/locacao', 'src/rural/rotas.js': '/api'
  },
  auth: {
    'auth-service/src/auth.js': '/auth', 'auth-service/src/admin.js': '/auth/admin',
    'auth-service/src/recuperacaoSenha.js': '/auth', 'auth-service/src/server.js': ''
  }
};

for (const servico of ['girorural', 'auth']) {
  test(`${servico}: OpenAPI válido, exportação atual e cobertura exata das rotas`, async () => {
    const spec = gerar(servico);
    await SwaggerParser.validate(structuredClone(spec));
    const salvo = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/openapi', `${servico}.json`)));
    assert.deepEqual(spec, salvo, 'Execute npm run docs:generate após editar as anotações');
    const reais = [];
    for (const [arquivo, base] of Object.entries(rotas[servico])) {
      const codigo = fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const match of codigo.matchAll(/(?:router|app)\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)) {
        const rota = (base + (match[2] === '/' ? '' : match[2])).replace(/:([\w]+)/g, '{$1}');
        reais.push(`${match[1]} ${rota}`);
      }
    }
    const documentadas = Object.entries(spec.paths).flatMap(([rota, item]) => Object.keys(item).map(m => `${m} ${rota}`));
    assert.deepEqual(documentadas.sort(), reais.sort());
    for (const [rota, item] of Object.entries(spec.paths)) for (const op of Object.values(item)) {
      const parametros = (op.parameters || []).filter(p => p.in === 'path');
      assert.deepEqual(parametros.map(p => p.name).sort(), [...rota.matchAll(/\{([^}]+)\}/g)].map(m => m[1]).sort());
      assert.ok(parametros.every(p => p.required)); assert.ok(Object.keys(op.responses).some(c => c.startsWith('2')));
      for (const security of op.security || []) for (const name of Object.keys(security)) assert.ok(spec.components.securitySchemes[name]);
    }
  });
}

test('Swagger público documenta os fluxos GiroRural', async t => {
  const app = express(); require('../src/documentacao')(app);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const rural = await (await fetch(`${origin}/openapi/girorural.json`)).json();
  const auth = await (await fetch(`${origin}/openapi/auth.json`)).json();
  assert.equal(rural.components.securitySchemes.sessao.name, 'token');
  assert.ok(rural.paths['/api/anuncios'].get); assert.ok(rural.paths['/api/anuncios'].post);
  assert.ok(rural.paths['/api/perfil/me'].get); assert.ok(rural.paths['/api/perfil/me'].patch);
  assert.ok(rural.paths['/api/proprietarios/{id}'].get);
  assert.ok(rural.paths['/api/reservas/{id}'].patch); assert.ok(rural.paths['/api/anuncios/{id}/foto'].post);
  assert.equal(auth.paths['/auth/validar'].get['x-public-proxy'], 'GET /api/auth/me');
  for (const route of ['/apidocs/', '/apidocs/auth/']) assert.equal((await fetch(origin + route)).status, 200);
  const internal = await (await fetch(`${origin}/apidocs/auth/swagger-ui-init.js`)).text();
  const publicUi = await (await fetch(`${origin}/apidocs/swagger-ui-init.js`)).text();
  assert.match(internal, /Auth-service — API interna/); assert.match(internal, /"supportedSubmitMethods": \[\]/);
  assert.match(publicUi, /GiroRural — API pública/); assert.doesNotMatch(publicUi, /"supportedSubmitMethods": \[\]/);
});

const path = require('node:path');
const swaggerJsdoc = require('swagger-jsdoc');
const components = require('../docs/openapi/components');
const root = path.resolve(__dirname, '..');

function gerar(servico) {
  const publico = servico === 'girorural';
  const pasta = publico ? 'src' : 'auth-service/src';
    const esquemas = publico ? components.schemas : Object.fromEntries(
        Object.entries(components.schemas).filter(([nome]) => !['ProprietarioPublico','AnuncioPublico'].includes(nome))
    );
  return swaggerJsdoc({
    failOnErrors: true,
    definition: {
      openapi: '3.0.3',
      info: {
        title: publico ? 'GiroRural — API pública' : 'Auth-service — API interna',
        version: '1.0.0',
        description: publico
          ? 'API do GiroRural para equipamentos, anúncios e reservas. Papéis do negócio: ADMIN, PROPRIETARIO e LOCATARIO. A identidade é determinada pela sessão; registros privados são filtrados pelo usuário autenticado.'
          : 'Rotas internas reais, acessíveis somente pela rede Docker. As rotas públicas correspondentes estão documentadas em /apidocs e usam sessão por cookie. Para acesso direto, use Bearer JWT apenas dentro da rede de serviços.'
      },
      ...(publico ? { servers: [{ url: '/', description: 'Mesma origem do GiroRural local ou publicado' }] }
        : { servers: [{ url: 'http://auth-service:3001', description: 'Somente rede interna Docker' }] }),
      components: { schemas: esquemas, securitySchemes: publico
        ? { sessao: components.securitySchemes.sessao }
        : { bearerAuth: components.securitySchemes.bearerAuth } }
    },
    apis: [path.join(root, pasta, '*.js'), ...(publico ? [path.join(root, 'src/rural/*.js')] : [])].map(p => p.replace(/\\/g, '/'))
  });
}
module.exports = { gerar };

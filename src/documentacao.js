const swaggerUi = require('swagger-ui-express');
const { gerar } = require('./openapi');

function instalarDocumentacao(app) {
    const girorural = gerar('girorural');
    const auth = gerar('auth');
    app.get('/openapi/girorural.json', (req, res) => res.json(girorural));
    app.get('/openapi/auth.json', (req, res) => res.json(auth));
    // serveFiles evita compartilhar a configuração entre as duas instâncias.
    const opcoes = {
        customSiteTitle: 'GiroRural — Swagger/OpenAPI',
        swaggerOptions: { validatorUrl: null, persistAuthorization: false, withCredentials: true },
    };
    const opcoesAuth = {
        customSiteTitle: 'Auth-service — documentação interna',
        swaggerOptions: { validatorUrl: null, supportedSubmitMethods: [], persistAuthorization: false },
    };
    // A rota mais específica precisa preceder /apidocs.
    app.use('/apidocs/auth', swaggerUi.serveFiles(auth, opcoesAuth), swaggerUi.setup(auth, opcoesAuth));
    app.use('/apidocs', swaggerUi.serveFiles(girorural, opcoes), swaggerUi.setup(girorural, opcoes));
}

module.exports = instalarDocumentacao;

require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

// ========================================
// ROTAS
// ========================================
const authRoutes = require('./auth');
const logsRoutes = require('./logs');
const adminRoutes = require('./admin');


// ========================================
// CONFIGURAÇÃO DO EXPRESS
// ========================================

const app = express();
const rotasDocumentadas = Object.entries(require('./openapi').gerar('girorural').paths)
    .flatMap(([rota, metodos]) => Object.keys(metodos).map(metodo => [metodo, rota]));
const metricas = require('./metricas').criarMetricas({ rotas: rotasDocumentadas });
app.use(metricas.middleware);

const PORT = process.env.PORT || 3000;


// ========================================
// MIDDLEWARES
// ========================================

const premium = require('./premium').criarPremium();
app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), premium.webhook);

// Permite receber JSON
app.use(express.json());

// Permite receber dados de formulários
app.use(
    express.urlencoded({
        extended: true
    })
);

// Permite trabalhar com cookies
app.use(cookieParser());
app.use('/api/premium', premium.router);

// Documentação de leitura; os serviços internos continuam privados.
const { readiness, http } = require('./saude');
/**
 * @openapi
 * /live:
 *   get:
 *     tags: [Observabilidade]
 *     summary: "Liveness do processo"
 *     operationId: get_live
 *     security: []
 *     responses:
 *       '200':
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Saude'
 */
app.get('/live', (req, res) => res.json({ servico: 'girorural-api', status: 'ok' }));
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Observabilidade]
 *     summary: "Readiness: MariaDB, autenticacao e MinIO"
 *     operationId: get_health
 *     security: []
 *     responses:
 *       '200':
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Saude'
 *       '503':
 *         description: Dependencia indisponivel ou timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Saude'
 */
app.get('/health', readiness('girorural-api', {
    mariadb: require('./saudeBanco'),
    autenticacao: () => http(`${process.env.AUTH_SERVICE_URL}/health`),
    logService: () => http(`${process.env.LOG_SERVICE_URL}/health`),
    minio: () => http(`${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT || 'minio'}:${process.env.MINIO_PORT || 9000}/minio/health/ready`)
}));
/**
 * @openapi
 * /metrics:
 *   get:
 *     tags: [Observabilidade]
 *     summary: "Metricas HTTP Prometheus"
 *     operationId: get_metrics
 *     security: []
 *     responses:
 *       '200':
 *         description: Sucesso
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
app.get('/metrics', metricas.endpoint);

require('./documentacao')(app);

// Disponibiliza os arquivos da pasta public
app.use(
    express.static(
        path.join(__dirname, '../public')
    )
);


// ========================================
// ROTAS DA API
// ========================================

// Cadastro, login, logout e usuário logado
app.use(
    '/api/auth',
    authRoutes
);

// API de equipamentos, anúncios e reservas
app.use('/api', require('./rural/rotas').criarRotasRural());

app.use('/api/logs', logsRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));
app.use((erro, req, res, next) => {
    if (erro.type === 'entity.parse.failed') return res.status(400).json({ mensagem: 'JSON inválido.' });
    if (erro.type === 'entity.too.large') return res.status(413).json({ mensagem: 'Corpo da requisição excede o limite.' });
    console.error('Erro não tratado na API.');
    return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});


// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, () => {

    console.log(
        `Servidor rodando na porta ${PORT}`
    );

});

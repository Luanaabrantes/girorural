// Modelo de receita do README (seção "SaaS: planos, limites e assinatura").
// Fonte única dos nomes, preços e limites usados pela API, pelas telas e pelo painel admin.
const { acessoValido } = require('./premiumPeriodo');

const PLANOS = {
    free: { codigo: 'free', nome: 'Gratuito', preco_centavos: 0, anuncios_por_mes: 3 },
    pro: { codigo: 'pro', nome: 'Pro', preco_centavos: 3990, anuncios_por_mes: null }
};

const erroLimite = (mensagem) => Object.assign(new Error(mensagem), { status: 402, codigo: 'LIMITE_DO_PLANO' });
const reais = centavos => (centavos / 100).toFixed(2).replace('.', ',');

// O plano é lido do banco a cada requisição; quem mantém essa cópia em dia é o webhook do Stripe.
async function planoDoUsuario(c, usuarioId, price = process.env.STRIPE_PRICE_ID, now = Math.floor(Date.now() / 1000)) {
    const [rows] = await c.execute('SELECT * FROM premium_assinaturas WHERE usuario_id=?', [usuarioId]);
    return acessoValido(rows[0], price, now) ? PLANOS.pro : PLANOS.free;
}

// Anúncios do catálogo de demonstração (fotos em /imagens/catalogo) não contam para o limite.
const SQL_ANUNCIOS_MES = "SELECT COUNT(*) total FROM anuncios a JOIN equipamentos e ON e.id=a.equipamento_id WHERE a.proprietario_id=? AND a.criado_em >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND (e.imagem_chave IS NULL OR e.imagem_chave NOT LIKE 'catalogo/maquinas/%')";

async function usoDoMes(c, usuarioId, opcoes) {
    const plano = await planoDoUsuario(c, usuarioId, opcoes?.price, opcoes?.now);
    const [counts] = await c.execute(SQL_ANUNCIOS_MES, [usuarioId]);
    const usados = Number(counts[0]?.total || 0);
    return { plano: plano.codigo, plano_nome: plano.nome, anuncios_criados_mes: usados, limite_anuncios_mes: plano.anuncios_por_mes,
        restantes: plano.anuncios_por_mes == null ? null : Math.max(0, plano.anuncios_por_mes - usados) };
}

// Barra a criação no backend: vale para a tela e para quem chama a API direto.
async function exigirLimiteAnuncios(c, usuarioId, opcoes) {
    const uso = await usoDoMes(c, usuarioId, opcoes);
    if (uso.limite_anuncios_mes != null && uso.anuncios_criados_mes >= uso.limite_anuncios_mes) {
        throw erroLimite(`Limite do plano Gratuito atingido: ${uso.limite_anuncios_mes} anúncios por mês (você já criou ${uso.anuncios_criados_mes} neste mês). ` +
            `Assine o Pro por R$ ${reais(PLANOS.pro.preco_centavos)}/mês em Minha garagem > Plano para anunciar sem limite, ou aguarde o próximo mês.`);
    }
    return uso;
}

module.exports = { PLANOS, planoDoUsuario, usoDoMes, exigirLimiteAnuncios, reais };

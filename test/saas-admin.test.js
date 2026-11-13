const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { criarRotasAdminRural } = require('../src/rural/admin');

test('painel admin do SaaS: usuários por plano, assinaturas ativas, MRR de teste e eventos', async t => {
    const price = 'price_pro_teste', agora = 1_800_000_000;
    const pro = (usuario_id, status = 'active', extra = {}) => ({ usuario_id, nome: `U${usuario_id}`, email: `u${usuario_id}@teste.local`, stripe_customer_id: `cus_${usuario_id}`,
        stripe_subscription_id: `sub_${usuario_id}`, stripe_paid_invoice_id: `in_${usuario_id}`, stripe_price_id: price, paid_period_start: agora - 100,
        paid_period_end: agora + 86400, cancel_at: null, cancel_at_period_end: false, payment_problem: false, next_renewal_at: agora + 86400, status, ...extra });
    const assinaturas = [
        pro(1), pro(2),
        pro(3, 'past_due', { payment_problem: true }),
        pro(4, 'canceled', { paid_period_end: agora - 10 })
    ];
    const db = {
        async execute(sql) {
            if (sql.startsWith('SELECT COUNT(*) total FROM usuarios')) return [[{ total: 10 }]];
            if (sql.includes('FROM premium_assinaturas')) return [assinaturas];
            if (sql.includes('FROM stripe_eventos')) return [[{ id: 'evt_2', tipo: 'customer.subscription.deleted', processado_em: new Date(agora * 1000) }, { id: 'evt_1', tipo: 'checkout.session.completed', processado_em: new Date(agora * 1000 - 1000) }]];
            throw new Error('SQL inesperado');
        }
    };
    let role = 'ADMIN';
    const negados = [];
    const app = express();
    app.use('/api/admin', criarRotasAdminRural({ db, env: { STRIPE_PRICE_ID: price }, now: () => agora,
        autenticar: (req, res, next) => { req.usuario = { id: 99, role }; next(); }, evento: async e => { negados.push(e); } }));
    const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
    t.after(() => server.close());
    const url = `http://127.0.0.1:${server.address().port}/api/admin/assinaturas`;

    const r = await fetch(url); assert.equal(r.status, 200);
    const body = await r.json();
    // Pro = acesso pago e válido (ativas + past_due ainda dentro do período pago); a cancelada já voltou para o Free.
    assert.deepEqual(body.planos.map(p => [p.plano, p.usuarios]), [['Gratuito', 7], ['Pro', 3]]);
    assert.equal(body.assinaturas_ativas, 2);
    assert.equal(body.mrr_centavos, 7980); assert.equal(body.mrr, '79.80');
    assert.equal(body.inadimplentes, 1);
    assert.deepEqual(body.assinaturas_por_status, { active: 2, past_due: 1, canceled: 1 });
    assert.equal(body.eventos[0].tipo, 'customer.subscription.deleted');
    assert.ok(!JSON.stringify(body).includes('cus_'), 'ids do Stripe não saem para a tela');

    role = 'PROPRIETARIO';
    assert.equal((await fetch(url)).status, 403);
    assert.equal(negados.at(-1).acao, 'ACAO_NEGADA');
});

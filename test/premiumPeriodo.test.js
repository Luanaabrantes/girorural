const test = require('node:test');
const assert = require('node:assert/strict');
const { acessoValido, estadoPublico, periodoPago } = require('../src/premiumPeriodo');
const now = 1700000000, price = 'price_girorural_pro';
const row = { premium: false, stripe_customer_id: 'cus_fixture', stripe_subscription_id: 'sub_fixture', stripe_paid_invoice_id: 'in_fixture', stripe_price_id: price, paid_period_start: now - 100, paid_period_end: now + 1000, status: 'active' };
test('Pro exige período pago vigente e preço configurado; estado antigo não concede acesso', () => {
  assert.equal(acessoValido(row, price, now), true);
  for (const changed of [{ paid_period_start: now + 1 }, { paid_period_end: now }, { stripe_paid_invoice_id: null }, { stripe_price_id: 'price_antigo_990' }, { status: 'canceled' }, { status: 'paused' }])
    assert.equal(acessoValido({ ...row, premium: true, ...changed }, price, now), false);
  const publicStatus = estadoPublico(row, price, now);
  assert.equal(publicStatus.plano, 'Pro'); assert.equal(publicStatus.valor_centavos, 3990);
  assert.equal(estadoPublico(row, 'price_antigo_990', now).premium, false);
});
test('fatura de teste só libera Pro para assinatura, usuário, preço e valor mensal corretos', () => {
  const sub = { id: 'sub_fixture', customer: 'cus_fixture', items: { data: [{ id: 'si_fixture' }] } };
  const line = { livemode: false, currency: 'brl', quantity: 1, pricing: { price_details: { price } }, period: { start: now - 100, end: now + 1000 }, parent: { type: 'subscription_item_details', subscription_item_details: { subscription: sub.id, subscription_item: 'si_fixture', proration: false } } };
  const invoice = { id: 'in_fixture', livemode: false, status: 'paid', currency: 'brl', amount_paid: 3990, customer: sub.customer, parent: { subscription_details: { subscription: sub.id } }, lines: { data: [line], has_more: false } };
  assert.ok(periodoPago(invoice, sub, price));
  assert.equal(periodoPago({ ...invoice, amount_paid: 990 }, sub, price), null);
  assert.equal(periodoPago(invoice, sub, 'price_antigo_990'), null);
  for (const bad of [{ period: {} }, { parent: null }, { quantity: 2 }, { livemode: true }, { parent: { ...line.parent, subscription_item_details: { ...line.parent.subscription_item_details, proration: true } } }])
    assert.equal(periodoPago({ ...invoice, lines: { data: [{ ...line, ...bad }], has_more: false } }, sub, price), null);
});

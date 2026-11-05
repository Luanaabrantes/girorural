const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const {calcularDiarias,valorEmCentavos,configurar,criarLocacao}=require('../src/locacao');

test('datas de locação: devolução é exclusiva e as diárias têm limites',()=>{
  assert.equal(calcularDiarias('2027-04-10','2027-04-11'),1);
  assert.equal(calcularDiarias('2027-04-10','2027-04-13'),3);
  for(const [start,end] of [['2027-02-29','2027-03-01'],['2027-04-10','2027-04-10'],['2027-04-13','2027-04-10'],['2027-04-10','2027-07-10']])assert.throws(()=>calcularDiarias(start,end),/Data|período/);
});

test('valor financeiro converte decimal para centavos sem erro de ponto flutuante',()=>{
  assert.equal(valorEmCentavos('0.29'),29);assert.equal(valorEmCentavos('125.50'),12550);assert.throws(()=>valorEmCentavos('-1'),/diária/);
});

test('configuração de locação só aceita chave Stripe de teste',()=>{
  assert.throws(()=>configurar({STRIPE_SECRET_KEY:'sk_live_no',APP_BASE_URL:'http://localhost:3000'}),/chaves Stripe de teste/);
  assert.throws(()=>configurar({STRIPE_SECRET_KEY:'sk_test_no',APP_BASE_URL:'http://user:pass@localhost:3000'}),/origem/);
});

function harness({reservationState='confirmada',userId=2,role='LOCATARIO',paymentStatus=null,sessionStatus='open',paymentStatusStripe='unpaid'}={}){
  const state={reservation:{id:3,estado:reservationState,valor_total:'251.00',moeda:'BRL',aprovacao_expira_em:new Date(Date.now()+3600_000),solicitante_id:2,proprietario_id:1,anuncio_estado:'ativo',inicio:'2027-04-10',fim:'2027-04-12',diarias:2},payments:[],events:new Set(),executions:[],nextPaymentId:9};
  if(paymentStatus)state.payments.push({id:7,reserva_id:3,stripe_checkout_id:'cs_existing',stripe_payment_intent_id:null,valor_total:'251.00',moeda:'BRL',status:paymentStatus,checkout_expira_em:new Date(Date.now()+1200_000)});
  const db={
    async getConnection(){return {beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(sql,args=[])=>execute(sql,args)}},
    async execute(sql,args=[]){return execute(sql,args)}
  };
  function execute(sql,args){state.executions.push({sql,args});
    if(sql.includes('SELECT r.id,r.estado,r.valor_total,r.moeda,r.aprovacao_expira_em'))return Number(args[1])===state.reservation.solicitante_id?[[{...state.reservation}]]:[[]];
    if(sql.startsWith('SELECT id,estado FROM reservas WHERE id='))return Number(args[1])===state.reservation.solicitante_id?[[{id:state.reservation.id,estado:state.reservation.estado}]]:[[]];
    if(sql.startsWith('SELECT * FROM locacao_pagamentos WHERE reserva_id='))return [state.payments.length?[{...state.payments.at(-1)}]:[]];
    if(sql.startsWith('INSERT INTO locacao_pagamentos')){const p={id:state.nextPaymentId++,reserva_id:args[0],valor_total:args[1],moeda:args[2],status:'criando',checkout_expira_em:new Date(args[3]*1000),stripe_checkout_id:null,stripe_payment_intent_id:null};state.payments.push(p);return [{insertId:p.id,affectedRows:1}];}
    if(sql.startsWith('UPDATE locacao_pagamentos SET stripe_checkout_id=COALESCE')){const p=state.payments.find(x=>x.id===Number(args[3]));Object.assign(p,{stripe_checkout_id:p.stripe_checkout_id||args[0],stripe_payment_intent_id:p.stripe_payment_intent_id||args[1],status:args[2]});return [{affectedRows:1}];}
    if(sql.startsWith('UPDATE locacao_pagamentos SET stripe_checkout_id=')){const p=state.payments.find(x=>x.id===args[1]);Object.assign(p,{stripe_checkout_id:args[0],status:'checkout_aberto'});return [{affectedRows:1}];}
    if(sql.startsWith('UPDATE reservas SET aprovacao_expira_em=')){state.reservation.aprovacao_expira_em=new Date(args[0]*1000);return [{affectedRows:1}];}
    if(sql.startsWith('UPDATE locacao_pagamentos SET status=')){const p=state.payments.find(x=>x.id===args[1]);if(p&&p.status!=='pago')p.status=args[0];return [{affectedRows:1}];}
    if(sql.startsWith('UPDATE reservas SET estado=')){state.reservation.estado=args[0];return [{affectedRows:1}];}
    if(sql.startsWith('SELECT id,status FROM locacao_pagamentos WHERE id=')){return [state.payments.filter(x=>x.id===Number(args[0])&&x.reserva_id===Number(args[1])).map(x=>({id:x.id,status:x.status}))];}
    if(sql.startsWith('SELECT id,estado FROM reservas WHERE id=')){return state.reservation.id===Number(args[0])?[[{id:state.reservation.id,estado:state.reservation.estado}]]:[[]];}
    if(sql.startsWith('INSERT IGNORE INTO stripe_locacao_eventos')){if(state.events.has(args[0]))return [{affectedRows:0}];state.events.add(args[0]);return [{affectedRows:1}];}
    if(sql.startsWith('SELECT * FROM locacao_pagamentos WHERE id='))return [state.payments.filter(x=>x.id===Number(args[0])&&x.reserva_id===Number(args[1])).map(x=>({...x}))];
    if(sql.startsWith('SELECT r.id,r.estado,r.solicitante_id'))return [[{...state.reservation}]];
    if(sql.startsWith('SELECT r.id,r.estado,r.inicio,r.fim,r.diarias'))return Number(args[0])===state.reservation.id&&(Number(args[1])===state.reservation.solicitante_id||Number(args[2])===state.reservation.proprietario_id)?[[{...state.reservation,pagamento_status:state.payments.at(-1)?.status||null,checkout_expira_em:state.payments.at(-1)?.checkout_expira_em||null}]]:[[]];
    if(sql.startsWith('UPDATE reservas SET estado=\'cancelada\'')){state.reservation.estado='cancelada';return [{affectedRows:1}];}
    return [[],{}];
  }
  const calls=[];
  const stripe={checkout:{sessions:{async create(data,options){calls.push({data,options});return {id:'cs_new',url:'https://checkout.stripe.test/cs_new',livemode:false,mode:'payment',amount_total:25100,currency:'brl',expires_at:data.expires_at,status:'open'}},async retrieve(id){return {id,status:sessionStatus,url:'https://checkout.stripe.test/'+id,livemode:false,payment_status:paymentStatusStripe,mode:'payment',amount_total:25100,currency:'brl',client_reference_id:'2',metadata:{tipo:'locacao',reserva_id:'3',pagamento_id:String(state.payments.at(-1)?.id||7),usuario_id:'2'},payment_intent:'pi_7'}}}},webhooks:{constructEvent(_body,signature){if(signature!=='valid')throw Error('signature invalid');return state.webhookEvent}}};
  const env={STRIPE_LOCACAO_WEBHOOK_SECRET:'whsec_test'};const config=()=>({stripe,base:'http://localhost:3000'});
  const evento=async data=>{state.audit=(state.audit||[]).concat([data])};
  const api=criarLocacao({db,env,config,evento,autenticar:(req,res,next)=>{req.usuario={id:userId,role};next()}});
  const app=express();app.post('/api/locacao/stripe/webhook',express.raw({type:'application/json'}),api.webhook);app.use(express.json());app.use('/api/locacao',api.router);
  return {app,state,calls};
}
async function withServer(t,app){const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections()}));return `http://127.0.0.1:${server.address().port}`}

test('checkout usa modo payment, preço do banco, metadata vinculada e reusa uma sessão aberta',async t=>{
  const h=harness(),base=await withServer(t,h.app),url=base+'/api/locacao/reservas/3/checkout';
  const first=await fetch(url,{method:'POST'});const firstBody=await first.json();assert.equal(first.status,200,JSON.stringify(firstBody));assert.equal(firstBody.url,'https://checkout.stripe.test/cs_new');
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].data.mode,'payment');assert.equal(h.calls[0].data.line_items[0].price_data.unit_amount,25100);assert.equal(h.calls[0].data.metadata.usuario_id,'2');assert.match(h.calls[0].options.idempotencyKey,/^giro-locacao-checkout-/);
  const second=await fetch(url,{method:'POST'});assert.equal(second.status,200);assert.equal((await second.json()).url,'https://checkout.stripe.test/cs_new');assert.equal(h.calls.length,1);
});

test('checkout bloqueia aprovação ausente e nega sessão de outro locatário',async t=>{
  const pending=harness({reservationState:'solicitada'}),base1=await withServer(t,pending.app);assert.equal((await fetch(base1+'/api/locacao/reservas/3/checkout',{method:'POST'})).status,409);
  const other=harness({userId:99}),base2=await withServer(t,other.app);assert.equal((await fetch(base2+'/api/locacao/reservas/3/checkout',{method:'POST'})).status,404);
  const owner=harness({role:'PROPRIETARIO'}),base3=await withServer(t,owner.app);assert.equal((await fetch(base3+'/api/locacao/reservas/3/checkout',{method:'POST'})).status,403);
});

test('status financeiro fica restrito às partes e expiração Stripe libera o período',async t=>{
  const h=harness({paymentStatus:'checkout_aberto'}),base=await withServer(t,h.app);
  const own=await fetch(base+'/api/locacao/reservas/3/pagamento');assert.equal(own.status,200);assert.equal((await own.json()).reserva.valor_total,'251.00');
  const other=harness({userId:99}),otherBase=await withServer(t,other.app);assert.equal((await fetch(otherBase+'/api/locacao/reservas/3/pagamento')).status,404);
  h.state.webhookEvent={id:'evt_expire',type:'checkout.session.expired',livemode:false,data:{object:{id:'cs_existing',livemode:false,mode:'payment',currency:'brl',amount_total:25100,payment_status:'unpaid',client_reference_id:'2',metadata:{tipo:'locacao',reserva_id:'3',pagamento_id:'7',usuario_id:'2'}}}};
  const expired=await fetch(base+'/api/locacao/stripe/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':'valid'},body:'{}'});assert.equal(expired.status,200);assert.equal(h.state.reservation.estado,'cancelada');assert.equal(h.state.payments[0].status,'expirado');
});

test('webhook assinado confirma pagamento, grava evento e repetição é idempotente',async t=>{
  const h=harness({paymentStatus:'checkout_aberto'}),base=await withServer(t,h.app),url=base+'/api/locacao/stripe/webhook';
  const event={id:'evt_paid',type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_existing',livemode:false,mode:'payment',currency:'brl',amount_total:25100,payment_status:'paid',payment_intent:'pi_7',client_reference_id:'2',metadata:{tipo:'locacao',reserva_id:'3',pagamento_id:'7',usuario_id:'2'}}}};h.state.webhookEvent=event;
  const send=()=>fetch(url,{method:'POST',headers:{'content-type':'application/json','stripe-signature':'valid'},body:JSON.stringify(event)});
  const first=await send();const body=await first.json();assert.equal(first.status,200,JSON.stringify(body));assert.equal(h.state.payments[0].status,'pago');assert.equal(h.state.payments[0].stripe_payment_intent_id,'pi_7');
  const repeated=await send();assert.equal(repeated.status,200);assert.equal((await repeated.json()).repetido,true);assert.equal(h.state.audit.length,1);
});

test('webhook trata pagamento pendente, falho e sessão expirada e rejeita outro valor',async t=>{
  for(const [type,paymentStatus,expected,reservation] of [['checkout.session.completed','unpaid','pendente','confirmada'],['checkout.session.async_payment_failed','unpaid','falho','cancelada'],['checkout.session.expired','unpaid','expirado','cancelada']]){
    const h=harness({paymentStatus:'checkout_aberto'}),base=await withServer(t,h.app);h.state.webhookEvent={id:`evt_${expected}`,type,livemode:false,data:{object:{id:'cs_existing',livemode:false,mode:'payment',currency:'brl',amount_total:25100,payment_status:paymentStatus,client_reference_id:'2',metadata:{tipo:'locacao',reserva_id:'3',pagamento_id:'7',usuario_id:'2'}}}};
    const response=await fetch(base+'/api/locacao/stripe/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':'valid'},body:'{}'});assert.equal(response.status,200);assert.equal(h.state.payments[0].status,expected);assert.equal(h.state.reservation.estado,reservation);
  }
  const mismatch=harness({paymentStatus:'checkout_aberto'}),base=await withServer(t,mismatch.app);mismatch.state.webhookEvent={id:'evt_bad_total',type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_existing',livemode:false,mode:'payment',currency:'brl',amount_total:1,payment_status:'paid',client_reference_id:'2',metadata:{tipo:'locacao',reserva_id:'3',pagamento_id:'7',usuario_id:'2'}}}};
  const response=await fetch(base+'/api/locacao/stripe/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':'valid'},body:'{}'});assert.equal(response.status,200);assert.equal(mismatch.state.payments[0].status,'checkout_aberto');
});

test('falha de cartão mantém a reserva retida e permite retomar a sessão aberta',async t=>{
  const h=harness({paymentStatus:'checkout_aberto'}),base=await withServer(t,h.app);
  h.state.webhookEvent={id:'evt_pi_failed',type:'payment_intent.payment_failed',livemode:false,data:{object:{id:'pi_7',object:'payment_intent',livemode:false,currency:'brl',amount:25100,metadata:{tipo:'locacao',reserva_id:'3',pagamento_id:'7',usuario_id:'2'}}}};
  const webhook=await fetch(base+'/api/locacao/stripe/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':'valid'},body:'{}'});assert.equal(webhook.status,200);assert.equal(h.state.payments[0].status,'falho');assert.equal(h.state.reservation.estado,'confirmada');
  const retry=await fetch(base+'/api/locacao/reservas/3/checkout',{method:'POST'});assert.equal(retry.status,200);assert.equal((await retry.json()).url,'https://checkout.stripe.test/cs_existing');assert.equal(h.calls.length,0);
});

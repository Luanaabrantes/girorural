const statusEl=document.querySelector('#status'),root=document.querySelector('#detalhe');
const h=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};

function galeria(a){
  const root=h('section','equipment-gallery'),frame=h('div','detail-image'),thumbs=h('div','gallery-thumbnails');
  const fotos=Array.isArray(a.fotos)?a.fotos:[],choices=fotos.length?fotos:(a.foto_url?[{foto_url:a.foto_url,principal:true}]:[]);
  const mostrar=foto=>{frame.replaceChildren();if(!foto?.foto_url)return;const image=h('img','equipment-photo');image.src=foto.foto_url;image.alt=`${a.nome} em contexto agrícola`;image.onerror=()=>{frame.setAttribute('aria-label','Foto indisponível');image.hidden=true};frame.append(image);for(const button of thumbs.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.url===foto.foto_url))};
  for(const foto of choices){const button=h('button','gallery-thumb'),image=h('img');button.type='button';button.dataset.url=foto.foto_url;button.setAttribute('aria-label',`${foto.principal?'Foto principal':'Ver foto'} de ${a.nome}`);button.setAttribute('aria-pressed','false');image.src=foto.foto_url;image.alt='';button.append(image);button.onclick=()=>mostrar(foto);thumbs.append(button)}
  mostrar(choices.find(f=>f.principal)||choices[0]);root.append(frame);if(choices.length>1)root.append(thumbs);return root;
}
function informacao(label,value){const item=h('div','detail-fact');item.append(h('dt','',label),h('dd','',value||'Não informado'));return item}
function formatarDiaria(value){return `${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value))} / dia`}
function hoje(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}

async function montarReserva(anuncio,container){
  let usuario=null;
  try{const response=await fetch('/api/auth/me',{cache:'no-store'});if(response.ok)usuario=(await response.json()).usuario}catch{}
  const form=h('form','booking-form'),start=h('input'),end=h('input'),days=h('output','booking-value','—'),unit=h('output','booking-value',formatarDiaria(anuncio.diaria)),total=h('output','booking-value','—');
  start.type=end.type='date';start.required=end.required=true;start.min=end.min=hoje();
  const first=h('label','','Data inicial'),last=h('label','','Data final'),dayLabel=h('label','','Quantidade de diárias'),unitLabel=h('label','','Valor unitário'),totalLabel=h('label','','Valor total');
  first.append(start);last.append(end);dayLabel.append(days);unitLabel.append(unit);totalLabel.append(total);form.append(first,last,dayLabel,unitLabel,totalLabel);
  const demo=Boolean(anuncio.demonstrativo),submit=h('button','button',demo?'Prévia de locação':'Solicitar locação');submit.type='submit';form.append(submit);
  const message=h('p','booking-message');message.setAttribute('role','status');
  function update(){const valid=start.value&&end.value&&new Date(`${end.value}T00:00:00Z`)>new Date(`${start.value}T00:00:00Z`),count=valid?(Date.parse(`${end.value}T00:00:00Z`)-Date.parse(`${start.value}T00:00:00Z`))/86400000:0;days.textContent=count?`${count} ${count===1?'diária':'diárias'}`:'—';total.textContent=count?formatarDiaria(Number(anuncio.diaria)*count).replace(' / dia',''):'—';if(start.value){const next=new Date(`${start.value}T00:00:00Z`);next.setUTCDate(next.getUTCDate()+1);end.min=next.toISOString().slice(0,10)}}
  start.addEventListener('change',update);end.addEventListener('change',update);
  if(demo){message.classList.add('notice');message.textContent='Exemplo de catálogo. Esta prévia não cria pedido nem processa pagamento.'}
  else if(!usuario){const link=h('a','','Fazer login');link.href='/login.html';message.append('Entre com uma conta de locatário para solicitar a locação. ',link)}
  else if(usuario.role!=='LOCATARIO'&&usuario.role!=='usuario'){message.classList.add('notice');message.textContent='A solicitação de locação está disponível para contas de locatário.'}
  form.onsubmit=async event=>{event.preventDefault();if(demo){message.textContent='Prévia calculada. Este exemplo de catálogo não cria pedido nem processa pagamento.';return}if(!usuario||!['LOCATARIO','usuario'].includes(usuario.role)){message.textContent='Entre com uma conta de locatário para solicitar a locação.';return}submit.disabled=true;message.className='booking-message';message.textContent='Enviando solicitação...';try{const response=await fetch('/api/reservas',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({anuncio_id:anuncio.id,inicio:start.value,fim:end.value})}),data=await response.json();if(!response.ok)throw Error(data.mensagem||'Não foi possível solicitar a locação.');message.classList.add('notice');message.textContent=`Solicitação enviada ao proprietário: ${data.diarias} diárias, ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(data.valor_total))}. A data final é o dia da devolução. Acompanhe em Minhas reservas.`;form.reset();update()}catch(error){message.classList.add('error');message.textContent=error.message}finally{submit.disabled=false}};
  container.append(form,message);
}

async function carregar(){
  const id=new URLSearchParams(location.search).get('id');
  if(!id||!/^[1-9]\d*$/.test(id)){statusEl.classList.add('error');statusEl.textContent='Identificador de anúncio inválido.';return}
  try{
    const response=await fetch(`/api/anuncios/${encodeURIComponent(id)}`,{cache:'no-store'}),data=await response.json();
    if(!response.ok)throw Error(data.mensagem||'Este anúncio não está disponível.');
    const a=data.anuncio,layout=h('div','detail-layout'),content=h('div','detail-content'),title=h('h1','',a.nome),owner=h('section','owner-summary'),booking=h('section','booking-panel');
    document.title=`${a.nome} · GiroRural`;layout.append(galeria(a));
    content.append(title,h('p','machine-model',[a.marca,a.modelo].filter(Boolean).join(' · ')||'Fabricante e modelo a combinar'),h('p','category',a.categoria));
    const facts=h('dl','detail-facts');facts.append(informacao('Localização',`${a.cidade} · ${a.uf}`),informacao('Diária',formatarDiaria(a.diaria)),informacao('Ano',a.ano||'Não informado'));content.append(facts);
    content.append(h('h2','','Sobre o equipamento'),h('p','detail-copy',a.descricao||'Descrição não informada.'),h('h2','','Condições de locação'),h('p','detail-copy',a.condicoes||'Condições a combinar com o proprietário.'));
    if(a.informacoes_adicionais)content.append(h('h2','','Informações úteis'),h('p','detail-copy',a.informacoes_adicionais));
    if(!a.demonstrativo){owner.append(h('p','eyebrow','PROPRIETÁRIO'),h('p','owner-name',a.proprietario?.nome||'Proprietário'));
      if(a.proprietario?.id){const profile=h('a','button small outline','Ver perfil do proprietário');profile.href=`/proprietario.html?id=${encodeURIComponent(a.proprietario.id)}`;owner.append(profile)}
      content.append(owner);booking.append(h('h2','','Solicitar locação'));await montarReserva(a,booking);content.append(booking)
    }else{booking.append(h('h2','','Prévia de locação'));await montarReserva(a,booking);content.append(booking)}
    layout.append(content);root.replaceChildren(layout);root.hidden=false;statusEl.hidden=true;
  }catch(error){statusEl.classList.add('error');statusEl.textContent=error.message}
}
carregar();

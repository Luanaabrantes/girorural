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
  if(anuncio.demonstrativo)return;
  let usuario=null;
  try{const response=await fetch('/api/auth/me',{cache:'no-store'});if(response.ok)usuario=(await response.json()).usuario}catch{}
  if(!usuario){const note=h('p','notice','Entre com uma conta de locatário para solicitar um período. '),link=h('a','','Fazer login');link.href='/login.html';note.append(link);container.append(note);return}
  if(usuario.role!=='LOCATARIO'&&usuario.role!=='usuario'){container.append(h('p','notice','A solicitação de reserva está disponível para contas de locatário.'));return}
  const form=h('form','booking-form'),start=h('input'),end=h('input'),submit=h('button','button','Solicitar período');
  start.type=end.type='date';start.required=end.required=true;start.min=end.min=hoje();
  const first=h('label','','Data inicial'),last=h('label','','Data final');first.append(start);last.append(end);submit.type='submit';form.append(first,last,submit);
  const message=h('p','booking-message');message.setAttribute('role','status');
  form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;message.className='booking-message';message.textContent='Enviando solicitação...';try{const response=await fetch('/api/reservas',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({anuncio_id:anuncio.id,inicio:start.value,fim:end.value})}),data=await response.json();if(!response.ok)throw Error(data.mensagem||'Não foi possível solicitar a reserva.');message.classList.add('notice');message.textContent='Solicitação enviada ao proprietário. Acompanhe o pedido no seu painel.';form.reset()}catch(error){message.classList.add('error');message.textContent=error.message;submit.disabled=false}};
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
      content.append(owner);booking.append(h('h2','','Solicitar reserva'));await montarReserva(a,booking);content.append(booking)}
    layout.append(content);root.replaceChildren(layout);root.hidden=false;statusEl.hidden=true;
  }catch(error){statusEl.classList.add('error');statusEl.textContent=error.message}
}
carregar();

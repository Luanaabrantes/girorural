const $=selector=>document.querySelector(selector);
const status=$('#status'),feedback=$('#feedback');
const CATEGORIAS=['Tratores','Colheitadeiras','Plantadeiras','Pulverizadores','Preparo do solo','Transporte','Distribuidores'];
const api=async(url,options={})=>{const response=await fetch(url,{cache:'no-store',...options}),data=response.status===204?{}:await response.json();if(!response.ok)throw Error(data.mensagem||'Não foi possível concluir.');return data};
const formData=form=>Object.fromEntries(new FormData(form));
function avisar(texto,erro=false){feedback.textContent=texto;feedback.classList.toggle('error',erro);feedback.classList.toggle('success',!erro)}

async function carregar(){
  try{
    const {usuario}=await api('/api/auth/me');
    if(['LOCATARIO','usuario'].includes(usuario.role)){location.replace('/anunciante.html');return}if(!['PROPRIETARIO','admin','ADMIN'].includes(usuario.role))throw Error('Acesso permitido somente a proprietários.');
    $('#area').hidden=false;status.hidden=true;
    await Promise.all([carregarAnuncios(),carregarReservas(),carregarPlano()]);
  }catch(error){status.textContent=error.message;status.classList.add('error');if(/sessão|autenticad/i.test(error.message)){const link=document.createElement('a');link.href='/login.html';link.textContent=' Entrar';status.append(link)}}
}


async function carregarAnuncios(){
  const resultado=await api('/api/anuncios/meus');
  const box=$('#meus');box.replaceChildren();
  for(const anuncio of resultado.anuncios)box.append(renderAnuncio(anuncio));
  if(!resultado.anuncios.length){const p=document.createElement('p');p.textContent='Você ainda não tem anúncios. ';const a=document.createElement('a');a.href='/anunciar.html';a.textContent='Anunciar minha primeira máquina';p.append(a);box.append(p)}
}

function renderAnuncio(anuncio){
  const article=document.createElement('article');article.className='panel listing-manage';
  const title=document.createElement('h3');title.textContent=anuncio.nome;
  const summary=document.createElement('p');summary.textContent=`${anuncio.marca||''} ${anuncio.modelo||''} · ${anuncio.cidade}/${anuncio.uf} · ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(anuncio.diaria))} por dia `;{const rot={ativo:'Publicado',rascunho:'Rascunho',inativo:'Pausado',arquivado:'Arquivado'};const b=document.createElement('span');b.className=`badge ${anuncio.estado}`;b.textContent=rot[anuncio.estado]||anuncio.estado;summary.append(b);if(anuncio.moderacao==='suspenso'){const m=document.createElement('span');m.className='badge suspenso';m.textContent='Suspenso pela moderação';m.style.marginLeft='6px';summary.append(m);if(anuncio.moderacao_motivo){const w=document.createElement('small');w.style.display='block';w.textContent=`Motivo: ${anuncio.moderacao_motivo}`;summary.append(w)}}};
  if(anuncio.demonstrativo){const note=document.createElement('p');note.className='notice';note.textContent='Este anúncio não está disponível para edição.';article.append(title,summary,note);return article}
  const actions=document.createElement('div');actions.className='listing-actions';
  const detail=document.createElement('details'),summaryEdit=document.createElement('summary');summaryEdit.textContent='Editar anúncio';detail.append(summaryEdit,formEditar(anuncio));
  actions.append(detail,criarGaleria(anuncio));
  if(anuncio.estado==='ativo'){const disable=document.createElement('button');disable.type='button';disable.className='button small outline';disable.textContent='Desativar anúncio';disable.onclick=async()=>{disable.disabled=true;try{await api(`/api/anuncios/${anuncio.id}`,{method:'DELETE'});avisar('Anúncio desativado.');await Promise.all([carregarAnuncios(),carregarPlano()])}catch(error){avisar(error.message,true);disable.disabled=false}};actions.append(disable)}
  const topo=document.createElement('div');topo.className='listing-top';const thumb=document.createElement('div');thumb.className='listing-thumb';if(anuncio.foto_url){const img=document.createElement('img');img.src=anuncio.foto_url;img.alt='';img.loading='lazy';thumb.append(img)}else thumb.textContent='Sem foto';const txt=document.createElement('div');txt.append(title,summary);if(anuncio.estado==='ativo'){const ver=document.createElement('a');ver.href=`/anuncio.html?id=${anuncio.id}`;ver.textContent='Ver como os clientes veem →';ver.style.fontWeight='600';txt.append(ver)}topo.append(thumb,txt);
  article.append(topo,actions);return article;
}

function criarGaleria(anuncio){
  const section=document.createElement('section');section.className='manage-gallery';
  const heading=document.createElement('h4');heading.textContent='Fotos do anúncio';
  const picker=document.createElement('label');picker.className='button small outline';picker.textContent='Adicionar fotos';
  const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.multiple=true;input.hidden=true;input.setAttribute('aria-label',`Adicionar fotos para ${anuncio.nome}`);picker.append(input);
  const items=document.createElement('div');items.className='manage-gallery-items';const message=document.createElement('p');message.className='gallery-status';message.setAttribute('role','status');
  async function refresh(){try{const {fotos}=await api(`/api/anuncios/${anuncio.id}/fotos`);items.replaceChildren();for(const foto of fotos){const card=document.createElement('div');card.className='manage-gallery-item';const image=document.createElement('img');image.src=foto.foto_url;image.alt=`Foto de ${anuncio.nome}`;image.loading='lazy';const controls=document.createElement('div');controls.className='gallery-controls';if(foto.principal){const badge=document.createElement('span');badge.className='photo-badge';badge.textContent='Principal';controls.append(badge)}else{const make=document.createElement('button');make.type='button';make.className='button small outline';make.textContent='Definir como principal';make.onclick=async()=>{make.disabled=true;try{await api(`/api/anuncios/${anuncio.id}/fotos/${foto.id}/principal`,{method:'PATCH'});message.textContent='Imagem principal atualizada.';await refresh()}catch(error){message.textContent=error.message;message.classList.add('error');make.disabled=false}};controls.append(make)}const remove=document.createElement('button');remove.type='button';remove.className='button small outline';remove.textContent='Remover';remove.onclick=async()=>{remove.disabled=true;try{await api(`/api/anuncios/${anuncio.id}/fotos/${foto.id}`,{method:'DELETE'});message.textContent='Foto removida.';await refresh()}catch(error){message.textContent=error.message;message.classList.add('error');remove.disabled=false}};controls.append(remove);card.append(image,controls);items.append(card)}if(!fotos.length)items.textContent='Nenhuma foto adicionada.'}catch(error){items.textContent=error.message;items.classList.add('error')}}
  input.onchange=async()=>{const files=[...input.files];if(!files.length)return;if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){message.textContent='Use imagens JPEG, PNG ou WebP de até 5 MB cada.';message.classList.add('error');input.value='';return}const body=new FormData();for(const file of files)body.append('fotos',file);input.disabled=true;message.textContent='Enviando fotos...';message.classList.remove('error');try{await api(`/api/anuncios/${anuncio.id}/fotos`,{method:'POST',body});message.textContent='Fotos adicionadas. A primeira passa a ser principal quando o anúncio ainda não tem foto.';await refresh()}catch(error){message.textContent=error.message;message.classList.add('error')}finally{input.disabled=false;input.value=''}};
  section.append(heading,picker,items,message);refresh();return section;
}

function formEditar(anuncio){
  const form=document.createElement('form');form.className='form-grid listing-edit';
  const text=(label,name,value,max,required=false)=>{const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.name=name;input.maxLength=max;input.value=value??'';input.required=required;wrap.append(input);form.append(wrap);return input};
  text('Nome do equipamento','nome',anuncio.nome,150,true);{const w=document.createElement('label');w.textContent='Categoria';const sel=document.createElement('select');sel.name='categoria';sel.required=true;const lista=CATEGORIAS.includes(anuncio.categoria)?CATEGORIAS:[anuncio.categoria,...CATEGORIAS];for(const c of lista){const o=document.createElement('option');o.value=c;o.textContent=c;sel.append(o)}sel.value=anuncio.categoria;w.append(sel);form.append(w)}text('Marca','marca',anuncio.marca,100);text('Modelo','modelo',anuncio.modelo,120);
  const year=text('Ano (opcional)','ano',anuncio.ano,4);year.type='number';year.min='1800';year.max=String(new Date().getFullYear()+1);
  const description=document.createElement('label');description.textContent='Descrição';const descriptionInput=document.createElement('textarea');descriptionInput.name='descricao';descriptionInput.maxLength=5000;descriptionInput.value=anuncio.descricao||'';description.append(descriptionInput);form.append(description);
  const info=document.createElement('label');info.textContent='Informações úteis para a categoria (opcional)';const infoInput=document.createElement('textarea');infoInput.name='informacoes_adicionais';infoInput.maxLength=3000;infoInput.value=anuncio.informacoes_adicionais||'';info.append(infoInput);form.append(info);
  const price=text('Diária (R$)','diaria',anuncio.diaria,20,true);price.type='number';price.min='0.01';price.step='0.01';text('Cidade','cidade',anuncio.cidade,120,true);const uf=text('Estado (UF)','uf',anuncio.uf,2,true);uf.minLength=2;uf.pattern='[A-Za-z]{2}';
  const conditions=document.createElement('label');conditions.textContent='Condições de locação';const conditionsInput=document.createElement('textarea');conditionsInput.name='condicoes';conditionsInput.maxLength=5000;conditionsInput.value=anuncio.condicoes||'';conditions.append(conditionsInput);form.append(conditions);
  const stateWrap=document.createElement('label');stateWrap.textContent='Status';const state=document.createElement('select');state.name='estado';for(const [value,label]of [['ativo','Ativo'],['rascunho','Rascunho'],['inativo','Inativo']]){const option=document.createElement('option');option.value=value;option.textContent=label;state.append(option)}state.value=anuncio.estado;stateWrap.append(state);form.append(stateWrap);
  const button=document.createElement('button');button.className='button';button.textContent='Salvar alterações';form.append(button);
  form.onsubmit=async event=>{event.preventDefault();button.disabled=true;try{const values=formData(form);const equipamento={nome:values.nome,categoria:values.categoria,marca:values.marca,modelo:values.modelo,ano:values.ano?Number(values.ano):null,descricao:values.descricao,informacoes_adicionais:values.informacoes_adicionais};await api(`/api/equipamentos/${anuncio.equipamento_id}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(equipamento)});await api(`/api/anuncios/${anuncio.id}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({diaria:Number(values.diaria),cidade:values.cidade,uf:values.uf,condicoes:values.condicoes,estado:values.estado})});avisar('Equipamento e anúncio atualizados.');await Promise.all([carregarAnuncios(),carregarPlano()])}catch(error){avisar(`Não foi possível concluir a edição: ${error.message}`,true)}finally{button.disabled=false}};
  return form;
}

async function carregarReservas(){
  const {reservas}=await api('/api/reservas/recebidas'),box=$('#reservas');box.replaceChildren();
  const statusPagamento={criando:'Checkout sendo preparado',checkout_aberto:'Checkout aberto',pendente:'Pagamento pendente',pago:'Pago',falho:'Pagamento não concluído',expirado:'Checkout expirado'};
  for(const reserva of reservas){const row=document.createElement('div');row.className='row reservation-row';const info=document.createElement('div');info.className='reservation-info';const title=document.createElement('strong');title.textContent=reserva.nome;const detail=document.createElement('span');const amount=reserva.valor_total==null?'Valor a consultar':new Intl.NumberFormat('pt-BR',{style:'currency',currency:reserva.moeda||'BRL'}).format(Number(reserva.valor_total));const br=v=>String(v).slice(0,10).split('-').reverse().join('/');const rotulo={solicitada:'Aguardando sua aprovação',confirmada:'Aprovada',recusada:'Recusada',cancelada:'Cancelada',concluida:'Concluída'};detail.textContent=`${reserva.solicitante_nome?reserva.solicitante_nome+' · ':''}${br(reserva.inicio)} a ${br(reserva.fim)} · ${reserva.diarias||'—'} diárias · ${amount}`;const selos=document.createElement('span');selos.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:6px';const b1=document.createElement('span');b1.className=`badge ${reserva.estado}`;b1.textContent=rotulo[reserva.estado]||reserva.estado;selos.append(b1);if(reserva.pagamento_status){const b2=document.createElement('span');b2.className=`badge ${reserva.pagamento_status}`;b2.textContent=statusPagamento[reserva.pagamento_status];selos.append(b2)}info.append(title,detail,selos);if(reserva.observacao){const o=document.createElement('small');o.style.cssText='display:block;margin-top:6px;color:var(--gr-cinza)';o.textContent=`“${reserva.observacao}”`;info.append(o)}row.append(info);const ver=document.createElement('a');ver.className='button small outline';ver.href=`/reserva.html?id=${reserva.id}`;ver.textContent=reserva.estado==='solicitada'?'Analisar':'Ver detalhes';row.append(ver);if(reserva.estado==='solicitada')for(const [estado,label]of [['confirmada','Aprovar']]){const button=document.createElement('button');button.className='button small';button.textContent=label;button.onclick=()=>decidir(reserva.id,estado);row.append(button)}box.append(row)}
  if(!reservas.length)box.textContent='Nenhuma solicitação recebida ainda. Quando um produtor pedir seu equipamento, ela aparece aqui.';const pend=reservas.filter(r=>r.estado==='solicitada').length;const cnt=document.querySelector('#pendentes');if(cnt){cnt.textContent=pend?String(pend):'';cnt.hidden=!pend};
}

// O plano exibido vem do banco (atualizado pelo webhook), nunca do retorno do checkout.
async function carregarPlano(){
  const info=$('#plano'),aviso=$('#planoAviso'),checkout=$('#checkoutStatus');
  try{
    const [plano,uso]=await Promise.all([api('/api/premium/status'),api('/api/premium/uso')]);
    const limite=uso.limite_anuncios_mes==null?'anúncios sem limite':`${uso.anuncios_criados_mes} de ${uso.limite_anuncios_mes} anúncios criados este mês`;
    info.textContent=`Plano ${plano.plano} · ${limite}${plano.premium?' · R$ 39,90/mês':''} · ${plano.situacao}`;
    const datas=plano.termina_em?`O Pro termina em ${new Date(plano.termina_em).toLocaleDateString('pt-BR')}.`:plano.renovacao_em?`Renova em ${new Date(plano.renovacao_em).toLocaleDateString('pt-BR')}.`:'';
    if(plano.pagamento_pendente){aviso.textContent='A cobrança da renovação falhou. Atualize o cartão em Gerenciar assinatura; sem pagamento, a conta volta para o plano Gratuito no fim do período pago.';aviso.className='notice error';aviso.hidden=false}
    else if(!plano.premium&&uso.restantes===0){aviso.textContent='Você usou os 3 anúncios do plano Gratuito neste mês. Assine o Pro para anunciar sem limite.';aviso.className='notice';aviso.hidden=false}
    else{aviso.textContent=datas;aviso.className='notice';aviso.hidden=!datas}
    $('#assinar').hidden=plano.premium||!plano.pode_assinar;
    $('#gerenciar').hidden=!plano.pode_gerenciar;
    return plano;
  }catch(error){info.textContent=error.message}
}
// Depois do checkout, espera o webhook confirmar (até ~40 s) consultando o banco.
async function aguardarWebhook(){
  const checkout=$('#checkoutStatus');checkout.className='notice';
  checkout.textContent='Pagamento enviado ao Stripe. Aguardando o webhook confirmar a assinatura...';
  for(let i=0;i<20;i++){const plano=await carregarPlano();if(plano?.premium){checkout.textContent='Assinatura Pro confirmada pelo webhook. O limite de anúncios foi removido.';checkout.className='success';return}await new Promise(r=>setTimeout(r,2000))}
  checkout.textContent='O webhook ainda não chegou. O plano muda para Pro assim que o Stripe confirmar; recarregue a página em instantes.';
}

async function decidir(id,estado){try{await api(`/api/reservas/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({estado})});avisar('Solicitação atualizada.');await carregarReservas()}catch(error){avisar(error.message,true)}}
$('#assinar').onclick=async()=>{try{const {url}=await api('/api/premium/checkout',{method:'POST'});location.assign(url)}catch(error){$('#checkoutStatus').textContent=error.message;$('#checkoutStatus').className='error'}};
$('#gerenciar').onclick=async()=>{try{const {url}=await api('/api/premium/portal',{method:'POST'});location.assign(url)}catch(error){$('#checkoutStatus').textContent=error.message;$('#checkoutStatus').className='error'}};
{const retorno=new URLSearchParams(location.search).get('plano');if(retorno==='sucesso')aguardarWebhook();else if(retorno==='cancelado'){$('#checkoutStatus').textContent='Checkout cancelado. Nada foi cobrado e o plano continua o mesmo.';$('#checkoutStatus').className='notice'}else if(retorno==='portal'){$('#checkoutStatus').textContent='Alterações feitas no portal chegam pelo webhook do Stripe e aparecem aqui em instantes.';$('#checkoutStatus').className='notice';setTimeout(carregarPlano,4000)}}
carregar();

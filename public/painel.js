const $=selector=>document.querySelector(selector);
const status=$('#status'),feedback=$('#feedback'),equipForm=$('#equipamento'),adForm=$('#anuncio');
const api=async(url,options={})=>{const response=await fetch(url,{cache:'no-store',...options}),data=response.status===204?{}:await response.json();if(!response.ok)throw Error(data.mensagem||'Não foi possível concluir.');return data};
const formData=form=>Object.fromEntries(new FormData(form));
function avisar(texto,erro=false){feedback.textContent=texto;feedback.classList.toggle('error',erro);feedback.classList.toggle('success',!erro)}

async function carregar(){
  try{
    const {usuario}=await api('/api/auth/me');
    if(!['PROPRIETARIO','admin','ADMIN'].includes(usuario.role))throw Error(usuario.role==='LOCATARIO'||usuario.role==='usuario'?'Sua conta é de locatário. Você pode acompanhar suas solicitações em Minhas reservas.':'Acesso permitido somente a proprietários.');
    $('#area').hidden=false;status.hidden=true;
    await Promise.all([carregarAnuncios(),carregarReservas(),carregarPlano()]);
  }catch(error){status.textContent=error.message;status.classList.add('error');if(/sessão|autenticad/i.test(error.message)){const link=document.createElement('a');link.href='/login.html';link.textContent=' Entrar';status.append(link)}}
}

function dicaCategoria(){
  const value=equipForm.elements.categoria.value.toLocaleLowerCase('pt-BR'),dica=$('#dicaCategoria'),campo=$('#informacoesAdicionais');
  const contexto=value.includes('trator')?'Informe detalhes confirmados sobre uso, itens inclusos e condições de operação.':value.includes('plant')||value.includes('semead')?'Informe detalhes confirmados sobre uso, compatibilidade e itens inclusos.':value.includes('pulver')?'Informe detalhes confirmados sobre itens inclusos e condições de operação.':value.includes('solo')||value.includes('grade')||value.includes('subsol')?'Informe detalhes confirmados sobre uso, compatibilidade e condições do implemento.':value.includes('colheit')?'Informe detalhes confirmados sobre uso e condições de operação.':'Informe apenas detalhes confirmados que ajudem a avaliar o equipamento.';
  dica.textContent='Opcional. '+contexto+' Não inclua especificações que não confirmou.';campo.placeholder=contexto;
}

async function carregarAnuncios(){
  const [equipamentos,resultado]=await Promise.all([api('/api/equipamentos/meus'),api('/api/anuncios/meus')]);
  const equipamentoBox=$('#equipamentosMeus');equipamentoBox.replaceChildren();
  for(const item of equipamentos.equipamentos){const row=document.createElement('div');row.className='row';row.textContent=`${item.nome} · ${item.categoria}${item.marca?' · '+item.marca:''}${item.modelo?' '+item.modelo:''} · ${item.estado}`;equipamentoBox.append(row)}
  if(!equipamentos.equipamentos.length)equipamentoBox.textContent='Seus equipamentos cadastrados aparecerão aqui.';
  const options=resultado.anuncios.filter(a=>equipamentos.equipamentos.some(e=>e.id===a.equipamento_id&&e.estado==='ativo'));
  const select=adForm.elements.equipamento_id;select.replaceChildren();
  for(const item of options){const option=document.createElement('option');option.value=item.equipamento_id;option.textContent=`${item.nome} · ${item.categoria}`;select.append(option)}
  const box=$('#meus');box.replaceChildren();
  for(const anuncio of resultado.anuncios)box.append(renderAnuncio(anuncio));
  if(!resultado.anuncios.length)box.textContent='Cadastre seu equipamento e publique o primeiro anúncio.';
}

function renderAnuncio(anuncio){
  const article=document.createElement('article');article.className='panel listing-manage';
  const title=document.createElement('h3');title.textContent=anuncio.nome;
  const summary=document.createElement('p');summary.textContent=`${anuncio.marca||''} ${anuncio.modelo||''} · ${anuncio.cidade}/${anuncio.uf} · R$ ${Number(anuncio.diaria).toFixed(2)} por dia · ${anuncio.estado}`;
  if(anuncio.demonstrativo){const note=document.createElement('p');note.className='notice';note.textContent='Anúncio demonstrativo fictício. Ele é somente para consulta e não pode ser editado.';article.append(title,summary,note);return article}
  const actions=document.createElement('div');actions.className='listing-actions';
  const detail=document.createElement('details'),summaryEdit=document.createElement('summary');summaryEdit.textContent='Editar anúncio';detail.append(summaryEdit,formEditar(anuncio));
  actions.append(detail,criarGaleria(anuncio));
  if(anuncio.estado==='ativo'){const disable=document.createElement('button');disable.type='button';disable.className='button small outline';disable.textContent='Desativar anúncio';disable.onclick=async()=>{disable.disabled=true;try{await api(`/api/anuncios/${anuncio.id}`,{method:'DELETE'});avisar('Anúncio desativado.');await Promise.all([carregarAnuncios(),carregarPlano()])}catch(error){avisar(error.message,true);disable.disabled=false}};actions.append(disable)}
  article.append(title,summary,actions);return article;
}

function criarGaleria(anuncio){
  const section=document.createElement('section');section.className='manage-gallery';
  const heading=document.createElement('h4');heading.textContent='Fotos do anúncio';
  const picker=document.createElement('label');picker.className='button small outline';picker.textContent='Adicionar fotos';
  const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.multiple=true;input.hidden=true;input.setAttribute('aria-label',`Adicionar fotos para ${anuncio.nome}`);picker.append(input);
  const items=document.createElement('div');items.className='manage-gallery-items';const message=document.createElement('p');message.className='gallery-status';message.setAttribute('role','status');
  async function refresh(){try{const {fotos}=await api(`/api/anuncios/${anuncio.id}/fotos`);items.replaceChildren();for(const foto of fotos){const card=document.createElement('div');card.className='manage-gallery-item';const image=document.createElement('img');image.src=foto.foto_url;image.alt=`Foto de ${anuncio.nome}`;image.loading='lazy';const controls=document.createElement('div');controls.className='gallery-controls';if(foto.principal){const badge=document.createElement('span');badge.className='demo-badge';badge.textContent='Principal';controls.append(badge)}else{const make=document.createElement('button');make.type='button';make.className='button small outline';make.textContent='Definir como principal';make.onclick=async()=>{make.disabled=true;try{await api(`/api/anuncios/${anuncio.id}/fotos/${foto.id}/principal`,{method:'PATCH'});message.textContent='Imagem principal atualizada.';await refresh()}catch(error){message.textContent=error.message;message.classList.add('error');make.disabled=false}};controls.append(make)}const remove=document.createElement('button');remove.type='button';remove.className='button small outline';remove.textContent='Remover';remove.onclick=async()=>{remove.disabled=true;try{await api(`/api/anuncios/${anuncio.id}/fotos/${foto.id}`,{method:'DELETE'});message.textContent='Foto removida.';await refresh()}catch(error){message.textContent=error.message;message.classList.add('error');remove.disabled=false}};controls.append(remove);card.append(image,controls);items.append(card)}if(!fotos.length)items.textContent='Nenhuma foto adicionada.'}catch(error){items.textContent=error.message;items.classList.add('error')}}
  input.onchange=async()=>{const files=[...input.files];if(!files.length)return;if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){message.textContent='Use imagens JPEG, PNG ou WebP de até 5 MB cada.';message.classList.add('error');input.value='';return}const body=new FormData();for(const file of files)body.append('fotos',file);input.disabled=true;message.textContent='Enviando fotos...';message.classList.remove('error');try{await api(`/api/anuncios/${anuncio.id}/fotos`,{method:'POST',body});message.textContent='Fotos adicionadas. A primeira passa a ser principal quando o anúncio ainda não tem foto.';await refresh()}catch(error){message.textContent=error.message;message.classList.add('error')}finally{input.disabled=false;input.value=''}};
  section.append(heading,picker,items,message);refresh();return section;
}

function formEditar(anuncio){
  const form=document.createElement('form');form.className='form-grid listing-edit';
  const text=(label,name,value,max,required=false)=>{const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.name=name;input.maxLength=max;input.value=value??'';input.required=required;wrap.append(input);form.append(wrap);return input};
  text('Nome do equipamento','nome',anuncio.nome,150,true);text('Categoria','categoria',anuncio.categoria,80,true);text('Marca','marca',anuncio.marca,100);text('Modelo','modelo',anuncio.modelo,120);
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
  for(const reserva of reservas){const row=document.createElement('div');row.className='row';const info=document.createElement('span');info.textContent=`${reserva.nome} · ${reserva.inicio} a ${reserva.fim} · ${reserva.estado}`;row.append(info);if(reserva.estado==='solicitada')for(const [estado,label]of [['confirmada','Aprovar'],['recusada','Recusar']]){const button=document.createElement('button');button.className='button small';button.textContent=label;button.onclick=()=>decidir(reserva.id,estado);row.append(button)}box.append(row)}
  if(!reservas.length)box.textContent='Nenhuma solicitação recebida.';
}

async function carregarPlano(){try{const plano=await api('/api/premium/status'),ads=await api('/api/anuncios/meus'),count=ads.anuncios.filter(a=>a.estado==='ativo').length,limit=plano.premium?20:2;$('#plano').textContent=`Plano ${plano.premium?'Pro':'Gratuito'} · ${count} de ${limit} anúncios ativos${plano.premium?' · R$ 39,90/mês':''}`;$('#assinar').hidden=plano.premium||!plano.pode_assinar}catch(error){$('#plano').textContent=error.message}}

equipForm.onsubmit=async event=>{event.preventDefault();const button=equipForm.querySelector('button[type=submit],button:not([type])');button.disabled=true;try{const data=formData(equipForm);data.ano=data.ano?Number(data.ano):null;await api('/api/equipamentos',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});equipForm.reset();dicaCategoria();avisar('Equipamento cadastrado. Agora selecione-o para publicar um anúncio.');await carregarAnuncios()}catch(error){avisar(error.message,true)}finally{button.disabled=false}};
adForm.onsubmit=async event=>{event.preventDefault();const button=adForm.querySelector('button');button.disabled=true;try{const data=formData(adForm);data.equipamento_id=Number(data.equipamento_id);data.diaria=Number(data.diaria);const created=await api('/api/anuncios',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});adForm.reset();avisar(`Anúncio ${created.id} publicado.`);await Promise.all([carregarAnuncios(),carregarPlano()])}catch(error){avisar(error.message,true)}finally{button.disabled=false}};
async function decidir(id,estado){try{await api(`/api/reservas/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({estado})});avisar('Solicitação atualizada.');await carregarReservas()}catch(error){avisar(error.message,true)}}
$('#assinar').onclick=async()=>{try{const {url}=await api('/api/premium/checkout',{method:'POST'});location.assign(url)}catch(error){$('#checkoutStatus').textContent=error.message;$('#checkoutStatus').className='error'}};
equipForm.elements.categoria.addEventListener('input',dicaCategoria);
carregar();

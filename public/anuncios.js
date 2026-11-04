const lista=document.querySelector('#anuncios'),statusEl=document.querySelector('#status'),form=document.querySelector('#filtros');
const h=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};

function imagem(a){
  const moldura=h('div','card-image');
  if(a.foto_url){const foto=h('img','equipment-photo');foto.src=a.foto_url;foto.alt=`${a.nome} em contexto agrícola`;foto.loading='lazy';foto.onerror=()=>{foto.hidden=true;moldura.setAttribute('aria-label','Foto indisponível')};moldura.append(foto)}
  else moldura.hidden=true;
  return moldura;
}
async function carregar(event){
  event?.preventDefault();lista.replaceChildren();statusEl.hidden=false;statusEl.classList.remove('error');statusEl.textContent='Buscando equipamentos...';
  const q=new URLSearchParams(new FormData(form));for(const [k,v] of [...q])if(!v.trim())q.delete(k);
  try{
    const r=await fetch('/api/anuncios?'+q,{cache:'no-store'}),d=await r.json();
    if(!r.ok)throw Error(d.mensagem||'Não foi possível carregar os anúncios.');
    if(!d.anuncios.length){statusEl.textContent='Nenhum anúncio ativo encontrado com esses filtros.';return}
    statusEl.hidden=true;
    for(const a of d.anuncios){
      const card=h('article','card'),heading=h('div','card-heading'),title=h('h2','',a.nome);
      const model=h('p','machine-model',[a.marca,a.modelo].filter(Boolean).join(' · ')||'Fabricante e modelo a combinar');
      const category=h('p','category',a.categoria),city=h('p','location',`${a.cidade} · ${a.uf}`);
      const value=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(a.diaria));
      const price=h('div','price',`${value} / dia`),link=h('a','button small','Ver detalhes');
      heading.append(title);link.href=`/anuncio.html?id=${encodeURIComponent(a.id)}`;
      card.append(imagem(a),heading,model,category,city,price,link);lista.append(card);
    }
  }catch(e){statusEl.classList.add('error');statusEl.textContent=e.message}
}

form.addEventListener('submit',carregar);form.addEventListener('reset',()=>setTimeout(carregar,0));carregar();

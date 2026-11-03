const lista=document.querySelector('#anuncios'),statusEl=document.querySelector('#status'),form=document.querySelector('#filtros');
const h=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};

function ilustracao(a){
  const figura=document.createElementNS('http://www.w3.org/2000/svg','svg');
  figura.classList.add('machine-art'); figura.setAttribute('viewBox','0 0 240 140'); figura.setAttribute('role','img');
  figura.setAttribute('aria-label',`Ilustração local de ${a.nome}`);
  const use=document.createElementNS('http://www.w3.org/2000/svg','use');
  const text=`${a.categoria} ${a.nome}`.toLocaleLowerCase('pt-BR');
  const symbol=text.includes('colheit')?'colheitadeira':text.includes('pulver')?'pulverizador':text.includes('fertiliz')||text.includes('aduba')?'distribuidor':text.includes('carreta')||text.includes('transporte')?'carreta':text.includes('grade')?'grade':text.includes('trator')?'trator':text.includes('plantio')||text.includes('semead')?'plantadeira':'implemento';
  use.setAttribute('href',`/imagens/equipamentos.svg#${symbol}`); figura.append(use); return figura;
}
function imagem(a){
  const moldura=h('div','card-image');
  if(a.foto_url){const foto=h('img','equipment-photo');foto.src=a.foto_url;foto.alt=`Foto de ${a.nome}`;foto.onerror=()=>moldura.replaceChildren(ilustracao(a));moldura.append(foto)}
  else moldura.append(ilustracao(a));
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
      const card=h('article','card'),heading=h('div','card-heading'),title=h('h2','',a.nome),badge=a.demonstrativo?h('span','demo-badge','Demonstração fictícia'):null;
      const model=h('p','machine-model',[a.marca,a.modelo].filter(Boolean).join(' · ')||'Fabricante e modelo a combinar');
      const category=h('p','category',a.categoria),city=h('p','location',`${a.cidade} · ${a.uf}`);
      const value=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(a.diaria));
      const price=h('div','price',`${value} / dia`),link=h('a','button small','Ver detalhes');
      if(badge)heading.append(badge);heading.append(title);link.href=`/anuncio.html?id=${encodeURIComponent(a.id)}`;
      card.append(imagem(a),heading,model,category,city,price,link);lista.append(card);
    }
  }catch(e){statusEl.classList.add('error');statusEl.textContent=e.message}
}

form.addEventListener('submit',carregar);form.addEventListener('reset',()=>setTimeout(carregar,0));carregar();

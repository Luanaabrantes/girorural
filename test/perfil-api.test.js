const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { criarRotasPerfil } = require('../src/perfil');

function bancoPerfil() {
  const user = { id: 7, nome: 'Nome Completo', email: 'privado@example.invalid', role: 'PROPRIETARIO', nome_exibicao: 'Nome Público', telefone: '11999990000', cidade: 'Campinas', uf: 'SP', bio: 'Descrição pública', foto_chave: null };
  const sql = [];
  const db = {
    async execute(q, p = []) {
      sql.push(q);
      if (q.includes('FROM usuarios u LEFT JOIN perfis p') && q.includes('WHERE u.id=?')) return [[{ ...user }]];
      if (q.includes("WHERE u.id=? AND u.role IN")) return [[{ ...user }]];
      if (q.includes('FROM anuncios a JOIN equipamentos e') && q.includes('a.proprietario_id=?')) return [[{ id: 22, nome: 'Trator', categoria: 'Tratores', marca: 'Marca', modelo: 'Modelo', ano: null, descricao: 'Descrição', diaria: '90.00', cidade: 'Campinas', uf: 'SP', condicoes: 'Com operador', imagem_chave: null }]];
      throw new Error(`SQL inesperado no teste de perfil: ${q}`);
    },
    async getConnection() {
      return { async beginTransaction(){}, async commit(){}, async rollback(){}, release(){}, async execute(q,p=[]) { sql.push(q); if(q.startsWith('UPDATE usuarios SET nome=')) user.nome=p[0]; if(q.startsWith('INSERT INTO perfis')) { const all=['nome_exibicao','telefone','cidade','uf','bio']; const updated=q.split('ON DUPLICATE KEY UPDATE ')[1].split(',').map(x=>x.split('=')[0]); for(const k of updated) user[k]=p[all.indexOf(k)+1]; } return [{ affectedRows: 1 }]; } };
    }
  };
  return { db, user, sql };
}

test('perfil identifica o usuário pela sessão, protege campos de papel/e-mail e restringe resposta pública', async t => {
  const { db, user, sql } = bancoPerfil();
  const autenticar = (req,res,next) => { if(req.cookies.token !== 'sessao-7') return res.status(401).json({mensagem:'Sessão necessária.'}); req.usuario={id:7,role:'PROPRIETARIO'}; next(); };
  const storage = { url: chave => chave ? `/foto/${chave}` : null };
  const app=express();app.use(express.json());app.use(require('cookie-parser')());app.use('/api',criarRotasPerfil({db,autenticar,storage,atualizarFotoFn:async()=>{},receberFotoFn:(req,res,next)=>next(),auditar:async()=>{}}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections()}));
  const base=`http://127.0.0.1:${server.address().port}`;
  const req=(url,method='GET',body,auth=true)=>fetch(base+url,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(auth?{cookie:'token=sessao-7'}:{})},body:body?JSON.stringify(body):undefined});
  const own=await (await req('/api/perfil/me')).json();assert.equal(own.perfil.email,'privado@example.invalid');assert.equal(own.perfil.telefone,'11999990000');
  assert.equal((await req('/api/perfil/me','PATCH',{role:'ADMIN'})).status,400);
  assert.equal((await req('/api/perfil/me','PATCH',{email:'attacker@example.invalid'})).status,400);
  assert.equal((await req('/api/perfil/me','PATCH',{id:99,nome:'Invadido'})).status,400);
  const saved=await req('/api/perfil/me','PATCH',{nome:'Nome Atualizado',telefone:'',bio:'Nova descrição'});assert.equal(saved.status,200);assert.equal(user.nome,'Nome Atualizado');assert.equal(user.telefone,null);assert.equal(user.bio,'Nova descrição');assert.equal(user.role,'PROPRIETARIO');
  const pub=await (await req('/api/proprietarios/7','GET',undefined,false)).json();assert.equal(pub.proprietario.nome,'Nome Público');assert.equal(pub.anuncios.length,1);assert.equal(JSON.stringify(pub).includes('privado@example.invalid'),false);assert.equal(JSON.stringify(pub).includes('11999990000'),false);
  assert.equal(sql.some(q=>q.includes('role=')),false);
});

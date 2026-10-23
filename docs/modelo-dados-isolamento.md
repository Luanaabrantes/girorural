# Issue #1 — modelo de dados e isolamento entre contas

Entrega da etapa 2 limitada à [Issue #1](https://github.com/Luanaabrantes/girorural/issues/1).
Uma conta individual corresponde a `usuarios.id`. Não há organizações ou propriedades
multiusuário. Identidade, papel (`usuario`/`admin`), propriedade comercial e assinatura
são conceitos independentes. Nenhum benefício Free/Pro foi implementado nesta entrega.

## Modelo entidade-relacionamento

```mermaid
erDiagram
    usuarios ||--o{ equipamentos : possui
    usuarios ||--o{ reservas : solicita
    equipamentos ||--o| anuncios : oferece
    anuncios ||--o{ reservas : recebe
    usuarios {
        INT id PK "contrato da dependencia existente"
    }
    equipamentos {
        INT id PK
        INT proprietario_id FK
        VARCHAR nome
        VARCHAR categoria
        TEXT descricao
        ENUM estado
        TIMESTAMP criado_em
        TIMESTAMP atualizado_em
    }
    anuncios {
        INT id PK
        INT equipamento_id FK,UK
        DECIMAL diaria "10,2"
        VARCHAR cidade
        CHAR uf "2"
        TEXT condicoes
        ENUM estado
        TIMESTAMP criado_em
        TIMESTAMP atualizado_em
    }
    reservas {
        INT id PK
        INT anuncio_id FK
        INT solicitante_id FK
        DATE inicio
        DATE fim
        ENUM estado
        TIMESTAMP criado_em
        TIMESTAMP atualizado_em
    }
```

A migração [migracao-girorural-issue1.sql](../database/migracao-girorural-issue1.sql)
é aditiva e não modifica as tabelas do catálogo. As novas tabelas usam InnoDB e
utf8mb4. Todas as FKs usam `RESTRICT`, tanto para exclusão como para atualização,
evitando apagar histórico por cascata. Desativação/arquivamento deve substituir
exclusões de recursos referenciados nas entregas futuras.

### Contrato de usuarios e limitação do DDL original

O repositório contém FKs antigas com `usuario_id INT`, mas não o `CREATE TABLE`
original completo de `usuarios`. Portanto, não foi reconstruído um esquema real
suposto. A dependência exigida pela migração é explicitamente `usuarios.id INT`
**assinado**, chave primária de uma única coluna, em InnoDB. O preflight em
`src/rural/migracoes.js` consulta `information_schema` e recusa ausência, tipo,
signedness, PK composta ou engine incompatível **antes** de executar o DDL.
O banco externo não foi consultado e sua compatibilidade não está certificada.

A fixture de integração cria apenas esse contrato mínimo, exclusivamente no banco
descartável. Ela não representa o DDL original nem deve ser aplicada ao banco da
aplicação. Para um desenvolvimento local já existente, conferir `SHOW CREATE TABLE
usuarios` e resolver divergências de contrato em revisão própria; nunca converter
a tabela real automaticamente.

### Restrições e índices

- Equipamento exige dono, nome e categoria não vazios. `descricao` é opcional.
  O índice `(proprietario_id, estado)` atende consultas do proprietário.
- Anúncio não duplica `proprietario_id`: o dono vem do equipamento. A unicidade de
  `equipamento_id` limita o MVP a uma oferta por bem físico, inclusive arquivada.
  Uma futura republicação reutiliza o anúncio; múltiplas ofertas concorrentes
  exigirão decisão e migração próprias. A FK e a chave única dão suporte ao join.
- Diária usa `DECIMAL(10,2)` positivo. O acesso a dados mantém a representação
  decimal textual padrão do mysql2; não converte dinheiro em `Number`/`FLOAT`.
  Cidade não pode ser vazia e UF deve ser uma das 27 siglas brasileiras em maiúsculas.
- Reserva exige anúncio, solicitante e datas. O período é de diárias **inclusivas**:
  `inicio = fim` representa um dia. A restrição verifica `inicio >= 1000-01-01`
  e `fim >= inicio`; não aceita datas zero. Usar modo SQL estrito no desenvolvimento.
  Não há horário/fuso na coluna `DATE`; regras de retirada e virada da diária
  deverão ser definidas antes da Issue #5.
- Os índices de reserva por solicitante e por `(anuncio_id, inicio, fim, estado)`
  suportam a vinculação e consultas futuras. Eles **não impedem sobreposição**.
- Datas de criação/atualização são geridas pelo banco. Não há transferência de
  proprietário, exclusão de recursos ou criação de reservas na API desta entrega.

### Estados

| Entidade | Estado | Significado reservado para o domínio |
| --- | --- | --- |
| Equipamento | `ativo` | Cadastro válido para uma oferta futura; padrão inicial |
| Equipamento | `inativo` | Indisponível para publicação pública |
| Anúncio | `rascunho` | Ainda não publicável; padrão inicial |
| Anúncio | `ativo` | Publicável somente se o equipamento também estiver ativo |
| Anúncio | `inativo` | Oferta temporariamente retirada |
| Anúncio | `arquivado` | Oferta encerrada, mantendo vínculos históricos |
| Reserva | `solicitada` | Pedido pendente; padrão inicial |
| Reserva | `confirmada` | Futura aprovação pelo proprietário |
| Reserva | `recusada` | Futuro pedido recusado |
| Reserva | `cancelada` | Futuro cancelamento autorizado |
| Reserva | `concluida` | Futura conclusão da locação |

Os ENUMs e CHECKs definem o vocabulário, **não um motor de transições**. A Issue #5
implementará autorização por ação, prevenção transacional de sobreposição com
concorrência real, idempotência, regras de cancelamento e snapshots das condições
acordadas. Atualmente alterações diretas por SQL podem criar períodos sobrepostos;
isso não deve ser apresentado como reserva operacional pronta.

## Política de acesso e integração

`src/rural/acesso.js` exporta `criarAcessoRural(db)` com pool/conexão mysql2 injetável.
Não monta rotas, não executa consultas no carregamento e não modifica `src/server.js`.
As rotas HTTP usadas nos testes são somente um harness local.

| Operação interna | Política |
| --- | --- |
| `consultarEquipamentoPrivado(usuario, id)` | Somente proprietário da sessão |
| `consultarAnuncioPrivado(usuario, id)` | Somente proprietário do equipamento vinculado |
| `alterarDescricaoEquipamento(usuario, id, body)` | Somente dono; aceita exclusivamente `descricao` |
| `alterarCondicoesAnuncio(usuario, id, body)` | Somente dono; aceita exclusivamente `condicoes` |
| `consultarReservaPrivada(usuario, id)` | Solicitante ou dono do equipamento; sinaliza as duas relações separadamente |
| `consultarAnuncioPublico(id)` | Projeção explicitamente pública, apenas anúncio e equipamento ativos |

As duas escritas estreitas verificam a propriedade com `SELECT ... FOR UPDATE`
e atualizam no mesmo contexto transacional, repetindo o predicado do proprietário
no UPDATE. Não formam um CRUD: não criam recursos, não ativam anúncios, não
transferem dono e não alteram reservas. São pontos reutilizáveis para a Issue #2.

O argumento `usuario` deve vir **exclusivamente de `req.usuario`**, preenchido pelo
middleware de sessão existente após validação no auth-service. Nunca preencher
esse argumento com `req.body`, query ou parâmetros da URL. A camada de domínio
não valida JWT por conta própria e não substitui a fronteira HTTP de autenticação.
Um `proprietario_id` no corpo é rejeitado como campo não permitido e jamais prova
propriedade. O papel `admin` não cria exceção em nenhuma consulta ou escrita.

Todos os IDs são positivos e seguros, e os valores SQL são parametrizados. Acesso
privado a recurso inexistente e a recurso alheio resulta na mesma mensagem e
status `404`. Falta de identidade válida gera `401`; entrada malformada gera `400`.
Uma futura rota deve mapear `ErroAcessoRural.status` e não expor erros internos do
banco. Não há endpoints novos expostos nesta entrega.

### Dados públicos e privados

A projeção pública contém somente ID do anúncio, nome, categoria, descrição,
diária, cidade, UF e condições. Descrição e condições são conteúdo **publicável**;
não devem receber notas privadas. Equipamentos inativos e anúncios em rascunho,
inativos ou arquivados não são públicos. IDs de usuários, referência interna do
equipamento, datas internas e reservas não integram a resposta pública.

O cadastro privado completo é acessível somente ao dono. A consulta de uma reserva
é restrita às duas partes e inclui seus IDs e flags de relação, sem e-mail, telefone,
JWT, assinatura ou demais dados da tabela de usuários. Não há listagem de reservas
de terceiros. A assinatura Free/Pro não participa da autorização de propriedade.

## Migração e reversão no desenvolvimento

O executor `scripts/migrar-rural.js` **não carrega `.env` e não usa `DB_*`** da
aplicação. Só aceita host loopback, banco `girorural_dev_*` ou `girorural_test_*`
e recusa `NODE_ENV=production`. Usar um banco local isolado com a dependência
`usuarios` previamente validada. Não apontar túnel local para banco externo.

Exemplo PowerShell, após instalar as dependências com os lockfiles existentes:

```powershell
npm ci
npm ci --prefix auth-service
npm ci --prefix log-service
$env:GIRO_DEV_DB_HOST = '127.0.0.1'
$env:GIRO_DEV_DB_PORT = '3306'
$env:GIRO_DEV_DB_NAME = 'girorural_dev_local'
$env:GIRO_DEV_DB_USER = 'usuario_local'
# Fornecer GIRO_DEV_DB_PASSWORD de forma privada, quando necessário.
node scripts/migrar-rural.js            # prévia: valida somente a dependência
node scripts/migrar-rural.js --aplicar  # DDL aditivo nas três tabelas novas
```

O SQL usa `CREATE TABLE IF NOT EXISTS`. Reexecutar não substitui tabelas ou
conserta divergências de estrutura existentes. Inspecionar DDL/índices antes de
reutilizar um banco local. MariaDB faz commit implícito em DDL: uma falha pode
deixar aplicação parcial, exigindo inspeção, nunca remoção automática de dados.

Para reverter, **parar todos os escritores locais e manter acesso exclusivo**:

```powershell
node scripts/migrar-rural.js --reverter --manutencao-exclusiva
```

`reverterVazio` verifica a ausência de dados em **todas** as tabelas do domínio e de
dependentes externos antes do primeiro DROP. Recusa se qualquer uma contiver
registros. Remove somente tabelas vazias, na ordem reservas → anúncios →
equipamentos, sem desativar FKs e preservando `usuarios` e o catálogo.
Se existirem dados, manter o esquema e preparar migração compensatória específica
com backup/restauração verificados. Não apagar dados para forçar a reversão.
O bloqueio de manutenção é um pré-requisito operacional: o script não consegue
impedir um outro cliente SQL de escrever enquanto o DDL é executado.

## Testes e resultados desta execução

```powershell
npm test
npm run docs:validate
node scripts/validar-rural-mariadb.js
```

| Verificação | Resultado em 23/10/2026 |
| --- | --- |
| Sintaxe dos sete arquivos JavaScript da Issue #1 | Aprovada com `node --check` |
| Testes novos HTTP/domínio e guardas de migração | 13 aprovados, zero falhas |
| Orquestração do laboratório, com Docker simulado | 3 aprovados, zero falhas; não executam MariaDB |
| Suíte completa, incluindo as atividades anteriores | 100 aprovados, zero falhas |
| OpenAPI catálogo/auth | Válido; nenhuma rota pública nova |
| Integração real MariaDB / aplicação / reversão | **Não executada**: acesso ao Docker engine negado antes da criação do laboratório |

Os testes HTTP usam o middleware real do catálogo e respostas controladas do
auth-service e da persistência. Validam A/B, anônimo, spoof de dono, admin sem
exceção, projeção pública, escrita alheia negada e papéis distintos de reserva.
Não comprovam SQL, locks ou integridade referencial reais. A instalação das
dependências na raiz encontrou uma restrição local EPERM; a suíte foi executada
com as mesmas versões do lockfile instaladas em diretório de apoio e `NODE_PATH`,
sem alterar os manifests versionados.

### Laboratório MariaDB reproduzível

`scripts/validar-rural-mariadb.js` prepara as dependências **Linux** do lockfile em
volume exclusivo usando Node 20 e `npm ci --ignore-scripts`, sem depender do
`node_modules` do Windows. Somente essa preparação e os pulls usam acesso de saída.
Nenhum segredo ou configuração do banco da aplicação é fornecido aos containers.
Não é preciso instalar dependências no host para executar este laboratório.

Em seguida cria MariaDB 11.4 com nome aleatório, `--network none`, sem portas
publicadas, sem `.env` e sem volumes da aplicação. A prontidão exige `SELECT 1`
por TCP no banco `girorural_test_issue1`, evitando o servidor temporário de
inicialização que atende por socket. O container Node dos testes compartilha apenas
o namespace de rede desse banco. Monta somente as fontes necessárias e o volume de
dependências para leitura (`NODE_PATH=/deps/node_modules`); não monta os
`node_modules` ou `.env` do host. O mysql2 usará conexão real quando o teste executar.

Em sucesso ou erro tratado, incluindo timeout de um processo Docker, o `finally`
consulta e remove somente os containers com os nomes aleatórios desta execução,
em ordem inversa, com `rm -f -v`, e remove o volume exclusivo de dependências.
Não limpa recursos de outros projetos. A falha de limpeza gera erro explícito,
sem ocultar a falha original nem o TAP. Interrupção forçada do Node ou queda do
daemon pode impedir o `finally`; nesse caso inspecionar os nomes
`girorural-issue1-<UUID>-db`, `-test`, `-deps` antes de remover apenas esses recursos.
As imagens baixadas ficam no cache Docker; o script não executa prune.

Em um terminal **autorizado a acessar o Docker Desktop**, na raiz desta branch:

```powershell
docker context show
docker version                         # deve mostrar Client e Server
docker image inspect mariadb:11.4 node:20-alpine # opcional: ausência dispara pull no script
node scripts/validar-rural-mariadb.js
```

Requer Docker com containers Linux, compartilhamento de arquivos do checkout e
rede de saída para Docker Hub/npm na preparação. Cada processo Docker tem timeout
de até 60 s (sondagem TCP: 2 s, até 60 tentativas). Falha de download ou timeout
permite nova tentativa após resolver a disponibilidade; não é sucesso de teste.
Não executar o arquivo de integração manualmente com credenciais externas.

O arquivo `test/rural-mariadb.integration.js`, fora do glob de `npm test`, valida:
aplicação e reexecução da migração; FKs; unicidade; nulidade; CHECKs; `DECIMAL`;
exclusões restritas; consultas/escritas por proprietário; tentativa de spoof;
projeção pública; participantes de reserva; recusa da reversão com dados;
reversão vazia, reaplicação e preservação dos usuários. A revisão adicional inclui
inspeção real de PKs/FKs RESTRICT/índices, contrato `usuarios.id` unsigned recusado,
estados inválidos, projeção pública exata e falha intencional por trigger para
verificar rollback e escrita posterior. Esses casos **ainda não foram executados**.
O arquivo de integração recusa iniciar sem a marca de ambiente descartável e
fecha o pool mesmo se a primeira conexão falhar.

### Diagnóstico final do Docker e revisão da Issue #1 (23/10/2026)

- Repositório e branch conferidos; referências atualizadas. A base publicada do
  PR #9 era `e05f548`, com a mesma árvore do commit local testado. Nenhuma alteração
  local foi descartada; a branch foi alinhada à história publicada antes do ajuste.
- Docker CLI 29.2.1 disponível em `C:\Program Files\Docker\Docker\resources\bin\docker.exe`;
  contexto selecionado `desktop-linux`. Os pipes do Desktop estão presentes.
- `docker version` e `docker image ls` falharam com `permission denied` em
  `npipe:////./pipe/dockerDesktopLinuxEngine`. A consulta pontual ao contexto
  `default`, sem trocar a configuração global, recebeu a mesma recusa em
  `npipe:////./pipe/docker_engine`.
- Causa observável: o processo desta sessão não tem acesso à API Docker pelos
  named pipes do Windows. A recusa ocorre antes de qualquer container do laboratório.
  Não foi possível determinar daqui se a origem é a restrição da sessão ou a ACL
  do host, nem certificar a saúde do Engine. Consultar o serviço
  `com.docker.service` não o encontrou nesta sessão; isso isoladamente não prova
  que o Desktop esteja parado. Não foram alteradas ACLs, grupos, serviços ou contextos.
- A listagem/inspeção de imagens depende da mesma API e ficou bloqueada. Portanto
  não foi possível confirmar a presença de `mariadb:11.4` ou `node:20-alpine`.
- Ajustes restritos ao laboratório: dependências Linux isoladas, prontidão TCP,
  limpeza dos recursos parcialmente criados, preservação da saída de falha,
  fechamento do pool e ampliação dos testes de integração descritos acima.
- A revisão pontual de autorização, IDs, SQL parametrizado, campos públicos,
  transações e reversão não identificou defeito demonstrável que exigisse alterar
  `src/rural/acesso.js`, `src/rural/migracoes.js`, `scripts/migrar-rural.js` ou o SQL.
  A reversão continua exigindo exclusividade; DDL faz commit implícito e não se
  apresenta como reversão transacional de um esquema com dados.
- Suíte executada novamente: **100 aprovados / 0 falhas**; 13 de HTTP/domínio/guardas
  e 3 de orquestração simulada fazem parte desse total. Sintaxe dos sete JS,
  contratos OpenAPI catálogo/auth e `git diff --check` aprovados. As dependências
  locais continuam vindo do mesmo lockfile, via diretório de apoio e `NODE_PATH`.
- Tentativa real do script corrigido: **exit 1 em `docker version`**, por acesso
  negado. **Zero casos de integração MariaDB executados**, nenhuma imagem baixada
  pelo laboratório e nenhum recurso temporário criado nesta tentativa.

Recomendação: **não aprovar o merge da Issue #1 ainda**. Executar o comando acima
em ambiente autorizado, exigir exit 0 e revisar o TAP real antes da aprovação.
O laboratório e seus casos adicionais estão preparados, mas testes simulados não
certificam compatibilidade do DDL, constraints, locks ou rollback no MariaDB.

**A aplicação e a reversão em MariaDB permanecem pendentes de execução real antes
de aprovar a migração.** Não há evidência positiva inventada. Nenhuma migração foi
executada no banco externo e não houve deploy, alteração no Stripe ou no Portainer.

## Próximas entregas

Issue #2: cadastro e interface; #3: fotos; #4: busca; #5: motor de reservas e
conflitos; #6: painel/histórico operacional; #7: assinatura e limites.
Esta branch implementa somente a fundação da Issue #1 e aguarda revisão por PR,
sem merge automático.

# GiroRural

Plataforma web para aproximar produtores rurais que oferecem máquinas e implementos daqueles que precisam alugá-los. O GiroRural apresenta anúncios, organiza pedidos de locação e, nos anúncios reais aprovados, recebe o pagamento de teste pelo Stripe Checkout.

Esta branch prepara a Atividade 10 de Computação em Nuvem. **O sistema não está publicado pelo GiroRural nesta entrega.**

## Funcionalidades implementadas

- Landing page pública, catálogo vindo da API, pesquisa por nome/marca/modelo, filtros por categoria, cidade e faixa de diária, e ordenação por preço.
- Detalhes públicos com informações do equipamento, galeria de até 12 fotos, condições da locação e link para o perfil público do proprietário.
- Cadastro/login. Cadastro público sempre recebe `LOCATARIO`; enviar `role=ADMIN` ou `role=PROPRIETARIO` no corpo não concede privilégio.
- Meu perfil: edição de nome, nome de exibição, telefone, cidade, UF e descrição; upload, substituição e remoção da foto no MinIO. E-mail não é editável por esse fluxo.
- Proprietários cadastram e editam equipamentos/anúncios, alteram seu estado, gerenciam fotos e consultam/aprovam/recusam solicitações.
- Locatários solicitam, consultam e cancelam pedidos próprios antes da aprovação. O sistema calcula as diárias e o total no servidor; proprietários aprovam/recusam e locatários pagam locações aprovadas no Stripe Checkout de teste.
- Checkout de assinatura Pro (`mode=subscription`) e checkout de locação (`mode=payment`) são rotas, metadados, eventos e estados financeiros separados. O redirecionamento do navegador nunca confirma pagamento; somente webhook assinado em modo de teste.
- `ADMIN`, `PROPRIETARIO` e `LOCATARIO` são papéis separados. A API aplica propriedade no backend; acesso sem sessão retorna 401, papel inadequado 403 e recurso privado de outra conta 404.
- Eventos de negócio são enviados ao `log-service` e persistidos em Redis Streams. Administradores consultam os eventos pelo painel/API administrativos.
- Catálogo demonstrativo de 12 anúncios fictícios. O seed é manual, reexecutável e destinado a desenvolvimento; anúncios demonstrativos não aceitam reserva nem edição.
- Plano gratuito limita a 2 anúncios ativos; plano Pro permite até 20 por assinatura Stripe em modo de teste. Checkout de locação não inclui Stripe Connect, repasse ao proprietário, cancelamento após pagamento ou reembolso automático.

## Estado da revisão — 04/11/2026

Branch local: `atividade-10-girorural-no-ar`. O histórico existente tinha 94 commits antes desta revisão; o checkout não tem remote Git configurado. A branch não foi enviada, integrada à `main` nem publicada no Portainer.

Na última validação integrada local, a stack isolada ficou saudável; `/health` reportou MariaDB, autenticação, log-service e MinIO como `ok`. Foram observados 12 anúncios demonstrativos e um anúncio real de teste local com duas fotos no MinIO e uma reserva pendente. Esses dados pertencem ao banco e aos volumes locais ignorados e não fazem parte do seed versionado. Não use o anúncio de teste como oferta comercial.

`npm test` e OpenAPI são verificações automatizadas; a validação de interface visual por automação de navegador não foi concluída nesta revisão. A ferramenta de UI não conseguiu determinar com segurança o URL da janela. Os passos manuais e as evidências restantes estão em [Evidências da Atividade 10](docs/evidencias/atividade-10/README.md).

## Evolução para produto (atividade 10)

Fluxo central completo e testado ponta a ponta em banco MariaDB local (38 verificações via API, além de `npm test`):

- **Papéis:** a conta nasce `LOCATARIO`. Em `/anunciante.html` a própria pessoa habilita o modo anunciante (`POST /api/auth/anunciante`) após aceitar os termos e completar telefone, cidade e UF; vira `PROPRIETARIO` sem intervenção do admin. O proprietário continua podendo alugar equipamentos de terceiros, nunca o próprio.
- **Reserva:** observação opcional ao proprietário; recusa com motivo; `POST /api/reservas/:id/concluir` após pagamento confirmado; `/reserva.html?id=` mostra linha do tempo, resumo, ações por papel e libera telefone/e-mail das partes somente depois da aprovação.
- **Administração (`/admin.html`):** indicadores (`GET /api/admin/resumo`), moderação de anúncios com motivo (`GET /api/admin/anuncios`, `PATCH /api/admin/anuncios/:id/moderacao`), consulta de reservas (`GET /api/admin/reservas`), usuários e auditoria com alerta de contas com várias ações negadas. Anúncio suspenso sai do catálogo e o dono não consegue reativá-lo até a liberação.
- **Interface:** `public/tema.css` aplica a identidade do design (Inter, verde #1F6B3A, amarelo-colheita, selos de status com texto, foco visível) e `public/nav.js` monta o cabeçalho conforme o papel, com menu móvel.
- **Migração:** `database/migracao-girorural-produto.sql` (aditiva, reexecutável), já incluída no Compose local como `11-girorural-produto.sql`. Em bancos existentes, aplique-a manualmente seguindo o procedimento seguro abaixo.

Pagamento: com `STRIPE_SECRET_KEY` de teste e `STRIPE_LOCACAO_WEBHOOK_SECRET` configurados, o botão "Pagar" abre o Checkout de teste (cartão 4242 4242 4242 4242). Sem as chaves, a API responde 503 com orientação.

## Arquitetura

O diagrama atualizado está em [docs/arquitetura-girorural.md](docs/arquitetura-girorural.md). A API Express também serve o frontend estático. A stack Portainer usa MariaDB externo; MinIO e Redis têm volumes persistentes. O nome de rede `catalogo-network` foi conservado no template para compatibilidade com a stack antiga; sua associação real no servidor ainda precisa ser conferida antes de redeploy.

## Banco de dados e migrações

O domínio principal tem três tabelas, todas InnoDB e ligadas à tabela existente `usuarios`:

| Tabela | Conteúdo |
| --- | --- |
| `equipamentos` | Proprietário, nome, categoria, marca/modelo/ano opcionais, descrição e chave da foto principal. |
| `anuncios` | Equipamento, proprietário, diária, cidade/UF, condições e estado. |
| `reservas` | Anúncio, solicitante, período, estado e datas. |

`locacao_pagamentos` mantém tentativas de Checkout, valor/moeda, PaymentIntent e estado financeiro; `stripe_locacao_eventos` guarda apenas IDs/tipos para idempotência. Não armazena dados de cartão. O fim do período é exclusivo: representa o dia da devolução e não é cobrado; `DATEDIFF(fim,inicio)` produz a quantidade de diárias.

`anuncio_imagens` acrescenta a galeria na Etapa 3, preservando `equipamentos.imagem_chave` como referência compatível com anúncio de foto única. `perfis` pertence à funcionalidade anterior de perfil.

### Ordem para uma instalação do zero

Primeiro confirme que a tabela `usuarios` e sua chave `id` já existem. O DDL original de `usuarios` não está neste repositório. A aplicação completa também pressupõe as tabelas/campos legados de autenticação, perfil e assinatura:

1. `database/migracao-atividade3.sql` — papel e tokens de recuperação, somente se ainda ausentes.
2. `database/migracao-atividade6.sql` — tabela base `perfis`, somente se ainda ausente.
3. `database/migracao-atividade7.sql` e `database/migracao-atividade7-periodo.sql` — tabelas/campos de assinatura Stripe, somente se a instalação os utiliza e ainda não os tem.
4. `database/migracao-girorural-issue1.sql` — cria `equipamentos`, `anuncios` e `reservas`.
5. `database/migracao-girorural-atividade10.sql` — acrescenta colunas, índices, backfill e FK do proprietário do anúncio.
6. `database/migracao-perfil-usuarios.sql` — acrescenta campos de apresentação/contato à tabela existente `perfis`.
7. `database/migracao-anuncios-informacoes.sql` — acrescenta o campo opcional de informações por categoria.
8. `database/migracao-anuncios-galeria.sql` — cria `anuncio_imagens`.
9. `database/migracao-locacao-stripe.sql` — acrescenta os snapshots financeiros das reservas e cria as tabelas de tentativa de pagamento e idempotência de webhook.

As migrações novas são aditivas, mas não há tabela central de histórico de migrações. Antes de cada execução, verifique a estrutura com `SHOW CREATE TABLE` e compare-a com a versão esperada. `IF NOT EXISTS` torna partes reexecutáveis; não corrige uma tabela existente com estrutura divergente. `scripts/migrar-rural.js` aplica apenas as migrações 4 e 5 e recusa bancos externos: ele é uma ferramenta local, **não** um executor de produção. No Compose, os mounts de inicialização do MariaDB só rodam na criação de um volume vazio.

`database/seed-girorural.sql` exige `@giro_owner_id` de um proprietário existente e pode criar/atualizar demonstrações marcadas como fictícias. Execute-o apenas em desenvolvimento. **Não aplique o seed em produção.**

### Procedimento seguro para produção — ainda não executado

1. Obtenha aprovação e agende manutenção; suspenda escritores de aplicação.
2. Confirme o servidor/schema corretos, engine InnoDB, versão MariaDB compatível e `SHOW CREATE TABLE usuarios`, `perfis`, `premium_assinaturas`, `equipamentos`, `anuncios` e `reservas`. Confirme `usuarios.id` como `INT` assinado, PK única e referenciada pelos FKs.
3. Faça e verifique backup completo antes de alterar. Use um arquivo de opções com permissões restritas para credenciais, não argumentos de senha visíveis na linha de comando. Exemplo, substituindo placeholders localmente:

   ```powershell
   mariadb-dump --defaults-extra-file="<arquivo-seguro>" --single-transaction --routines --triggers --events <banco> > <caminho-seguro>\girorural-pre-migracao.sql
   ```

4. Aplique, uma por vez e na ordem acima, somente as migrações cuja pré-condição ainda não esteja satisfeita. Registre versão, checksum, operador e resultado em controle de mudança. Não execute o seed.
5. Valide tabelas, colunas, índices, FKs e contagens; faça leitura de saúde e smoke tests antes de reabrir gravações.
6. Em rollback de código, retorne à imagem anterior e mantenha as estruturas aditivas. Não remova tabelas nem use `DROP` como rollback. Restaure o backup somente com manutenção aprovada e serviços escritores parados.

## Rotas principais

| Área | Rotas | Acesso |
| --- | --- | --- |
| Catálogo | `GET /api/anuncios`, `GET /api/anuncios/:id` | Público; filtros `busca`, `cidade`, `categoria`, `diaria_min`, `diaria_max`, `ordenar`, paginação. |
| Equipamentos | `POST /api/equipamentos`, `GET /api/equipamentos/meus`, `PUT/DELETE /api/equipamentos/:id` | `PROPRIETARIO`; exclusão é desativação lógica. |
| Anúncios | `POST /api/anuncios`, `GET /api/anuncios/meus`, `PUT/DELETE /api/anuncios/:id` | `PROPRIETARIO`; DELETE desativa. |
| Fotos | `POST /api/anuncios/:id/fotos`, `GET /api/anuncios/:id/fotos`, `GET/DELETE /api/anuncios/:id/fotos/:fotoId`, `PATCH /api/anuncios/:id/fotos/:fotoId/principal` | Leitura pública do ativo; alteração pelo dono. JPEG/PNG/WebP, até 5 MB por arquivo. |
| Reservas | `POST /api/reservas`, `GET /api/reservas/minhas`, `GET /api/reservas/:id`, `POST /api/reservas/:id/cancelar` | `LOCATARIO`; consulta restrita às partes autorizadas. |
| Reservas do proprietário | `GET /api/reservas/recebidas`, `PATCH /api/reservas/:id` | `PROPRIETARIO`. |
| Pagamento de locação | `POST /api/locacao/reservas/:id/checkout`, `GET /api/locacao/reservas/:id/pagamento`, `POST /api/locacao/stripe/webhook` | Checkout `payment` de teste; pagamento só confirma por webhook assinado. Aprovação sem Checkout expira em 24 h; Checkout aberto fica retido até a expiração Stripe (35 min configurados). |
| Perfil | `GET/PATCH /api/perfil/me`, `POST/DELETE /api/perfil/me/foto`, `GET /api/proprietarios/:id` | Perfil próprio autenticado; perfil público não devolve e-mail/telefone privado. |
| Administração | `GET /api/admin/usuarios`, `PATCH /api/admin/usuarios/:id/role`, `GET /api/logs` | `ADMIN`. |

OpenAPI público: `/apidocs/` e `/openapi/girorural.json`. Auth-service interno: `/apidocs/auth/`.

## Execução e validação local

Consulte `.env.example`, `auth-service/.env.example` e `log-service/.env.example`; copie para arquivos locais e preencha **somente credenciais de desenvolvimento**. Não comite `.env`, contas locais, backups ou dados de teste. A stack local usa `docker-compose.yml` com `docker-compose.local-dev.yml` e o projeto Compose `girorural-local-dev`, incluindo MariaDB isolado. Não use o banco externo/produção para testes.

```powershell
npm ci
npm ci --prefix auth-service
npm ci --prefix log-service
npm test
npm run docs:validate
```

O laboratório MariaDB/Redis/MinIO é uma validação separada; testes unitários/mocks não a substituem. Status atual da publicação: pendente. A existência de health checks locais não equivale a deploy.

### Teste manual do Stripe de locação

1. Configure apenas uma chave `sk_test_` local em `STRIPE_SECRET_KEY`, `APP_BASE_URL=http://localhost:3000` e um segredo de webhook independente em `STRIPE_LOCACAO_WEBHOOK_SECRET`. Preserve `STRIPE_WEBHOOK_SECRET` para o endpoint de assinaturas Pro.
2. Aponte um endpoint de webhook Stripe de teste para `http://localhost:3000/api/locacao/stripe/webhook` e assine pelo menos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` e `checkout.session.expired`. Stripe Checkout e os webhooks precisam de credenciais autorizadas da própria conta de teste; não copie os exemplos publicados de chaves.
3. Com contas locais separadas de proprietário e locatário, use um anúncio real local (não o catálogo de exemplos). O proprietário aprova o pedido; o locatário abre “Minhas reservas” e seleciona “Pagar com Stripe”.
4. Use os dados de cartão de teste que a documentação oficial Stripe indica para sua conta. Stripe informa que testes automatizados não devem substituir a verificação manual da interface Checkout e oferece cartões de teste para simular resultados; consulte [testes automatizados Stripe](https://docs.stripe.com/automated-testing). A página de retorno consulta o backend e não é evidência de pagamento.
5. Verifique o evento no Stripe em modo de teste, o webhook validado, o estado financeiro em Minhas reservas e a trilha de auditoria. A aplicação não transfere fundos: uma futura liquidação ao proprietário exige desenho separado de Stripe Connect, obrigações financeiras, política de cancelamento e reembolso.

## Portainer — configuração encontrada e preparação

Foi inspecionado somente o arquivo versionado `docker-compose.portainer.yml` e o workflow `.github/workflows/cicd.yml`; a configuração viva do Portainer não foi consultada nem alterada. O template descreve uma stack com API em `8216:3000`, auth-service em `3001` interno, log-service em `3002` interno, MinIO em `9000`, Redis em `6379` e MariaDB externo. Os volumes nomeados são `minio-data` e `audit-redis-data`. A rede declarada ainda se chama `catalogo-network`, com subnet `10.88.0.0/24`; preserve-a somente depois de confirmar a rede realmente associada à stack e ausência de conflito. O subdomínio documentado é `https://luana-abrantes-isw055.lapps.studio`; Compose não contém regra/proxy para esse host, então o encaminhamento do proxy para a porta 8216 precisa ser verificado na configuração viva.

Imagens referenciadas pelo template:

- `ghcr.io/luanaabrantes/girorural-api:${IMAGE_TAG}`
- `ghcr.io/luanaabrantes/girorural-auth-service:${IMAGE_TAG}`
- `ghcr.io/luanaabrantes/girorural-log-service:${IMAGE_TAG}`
- `ghcr.io/luanaabrantes/girorural-minio:${IMAGE_TAG}`

O valor esperado é `IMAGE_TAG=sha-<SHA completo do commit>`. O workflow constrói quatro imagens, mas só publica em push para `atividade-extra-cicd` e `atividade-7-stripe-premium`; a branch `atividade-10-girorural-no-ar` está fora dessas condições e não tem imagens confirmadas no GHCR. Portanto, o fluxo de publicação precisa ser aprovado e preparado para gerar as quatro tags desta entrega antes de o Portainer poder utilizá-las. `latest` é publicado apenas para `atividade-extra-cicd`; não use `latest` para esta entrega.

O template não define `mem_limit` nem `deploy.resources.limits.memory`. O limite de **1 GB por container** precisa ser confirmado na stack viva e representado/aplicado no formato que essa instalação do Portainer usa antes de atualizar. A configuração real de limite, nome da stack, repositório/branch configurados e credenciais do registry não são verificáveis por este checkout.

### Procedimento após os bloqueios e aprovação

1. Confirmar no Portainer, em modo de leitura, o nome da stack original, Git URL/branch/Compose path, porta/proxy/subdomínio, rede/subnet, volumes, limites de memória e variáveis atuais. Não criar stack nova.
2. Aprovar e executar backup/ordem de migrações acima no banco externo; seed permanece desativado.
3. Aprovar a publicação de imagens. Atualizar o workflow ou usar um fluxo de release aprovado para construir e publicar as quatro imagens a partir do commit revisado. Verificar os SHA labels e o acesso GHCR. Este workflow não está pronto para publicar a branch atual.
4. Na stack original, selecionar o repositório `https://github.com/Luanaabrantes/girorural.git`, a branch/commit aprovado e `docker-compose.portainer.yml`; isso pressupõe que a branch tenha sido enviada ao repositório, o que não ocorreu nesta etapa.
5. Definir `IMAGE_TAG=sha-<SHA>` igual para os quatro serviços. Preservar os valores existentes das variáveis DB (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`), sessão (`JWT_SECRET`), MinIO (`MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`), correio (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`) e Stripe (`STRIPE_*`, quando habilitado). Não imprimir nem copiar secrets para documentação.
6. Manter o mapeamento 8216:3000, proxy/subdomínio, mesma stack, rede confirmada, volumes e limite 1 GB. Atualizar/redeploy somente após aprovação; nunca usar `down -v` nem remover volumes.
7. Conferir health checks de API/auth/log/MinIO/Redis, acesso ao DB, catálogo, login, permissões, reserva, auditoria, MinIO e o subdomínio. Capturar a sétima evidência somente após esses checks reais.

## Pendências e limites

- Revisão visual manual no navegador e captura dos sete prints ainda necessárias; ver checklist de evidências.
- Configuração viva do Portainer, subdomínio/proxy, branch/repositório, limites de 1 GB, rede e GHCR ainda precisam de confirmação manual.
- Workflow não publica a branch atual; imagens SHA desta branch não foram confirmadas.
- A stack local tem MariaDB integrado; Portainer mantém MariaDB externo. As migrações de produção ainda não foram executadas.
- Relatórios Pro de locações não fazem parte do escopo implementado.
- `catalogo-network` permanece como nome operacional legado para compatibilidade com a stack, embora telas, rotas e serviços de domínio tenham sido substituídos pelo GiroRural. Não renomeie sem verificar a configuração viva.

URL publicada do GiroRural: **não publicada nesta etapa**.

// ============================================================
//  P2 — Relatório consolidado: arquitetura e atividades (INDIVIDUAL)
//  ISW055 · Introdução à Computação em Nuvem · Fatec Pompeia · 2026.2
//
//  COMO USAR
//  1. Preencha a seção DADOS DO ALUNO logo abaixo.
//  2. Escreva a seção "Arquitetura do SaaS" seguindo os subtítulos-guia.
//  3. Em cada #atividade(...), preencha "realizada", "situacao" e "url"
//     e escreva o corpo: o que você fez, prints e dificuldades.
//  4. Salve os prints numa pasta "prints/" ao lado deste arquivo e troque
//     `arquivo: none` por `arquivo: "prints/nome-do-print.png"`.
//  5. Compile em https://typst.app (Novo projeto → envie este arquivo e a
//     pasta prints) ou no terminal: typst compile P2_ISW055.typ
//  6. Apague os blocos cinza de orientação quando terminar.
//
//  Entrega: 13/11/2026 · PDF nomeado P2_ISW055_Nome_Sobrenome.pdf,
//  em docs/ do repositório do produto, com link no README e uma issue
//  "Entrega — P2" mencionando @siriani
// ============================================================

// ---------- DADOS DO ALUNO (edite aqui) ----------
#let aluno = "Luana Beatriz Ribeiro Abrantes"
#let turma = "161_SIST. INTELIGENTES_N"
#let produto = "GiroRural"
#let repositorio = "https://github.com/Luanaabrantes/girorural"
#let site = "https://luana-abrantes-isw055.lapps.studio"
#let data-relatorio = "13/11/2026"

// ---------- daqui pra baixo, só mexa nas seções e nas fichas ----------
#let disciplina = "Introdução à Computação em Nuvem"
#let codigo = "ISW055"
#let professor = "Prof. Allan Lincoln Rodrigues Siriani"
#let accent = rgb("#b96f1f")

#set document(title: "P2 — " + codigo + " — " + aluno, author: aluno)
#set page(paper: "a4", margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2cm))
#set text(size: 11pt, lang: "pt", region: "BR")
#set par(justify: true, leading: 0.7em)
#set heading(numbering: "1.1")
#show heading.where(level: 1): it => { v(0.6em); text(size: 16pt, it); v(0.2em) }
#show heading.where(level: 2): it => { v(0.5em); text(size: 13pt, it); v(0.1em) }
#show link: set text(fill: accent)
#show figure.caption: set text(size: 9pt, fill: luma(90))
#set table(stroke: 0.5pt + luma(200), inset: 6pt)
#show table: set text(hyphenate: false)
#show table: set par(justify: false)

// ---------- ajudantes ----------
#let orientacao(body) = block(
  width: 100%, fill: luma(245), inset: 9pt, radius: 4pt,
  stroke: (left: 2pt + luma(180)),
  text(size: 9.5pt, fill: luma(90), body),
)

#let evidencia(legenda, arquivo: none) = figure(
  if arquivo == none {
    rect(width: 100%, height: 5.5cm, radius: 4pt, stroke: (paint: luma(170), dash: "dashed"))[
      #align(center + horizon)[
        #text(fill: luma(130), size: 9.5pt)[
          cole o print ou o diagrama aqui \
          troque `arquivo: none` por `arquivo: "prints/nome.png"`
        ]
      ]
    ]
  } else {
    image(arquivo, width: 100%)
  },
  kind: image,
  supplement: [Figura],
  caption: legenda,
)

// Prints altos (página do GitHub + resposta da API): mesma figura, limitada à altura da página.
#let evidencia-alta(legenda, arquivo) = figure(
  image(arquivo, height: 19cm, fit: "contain"),
  kind: image,
  supplement: [Figura],
  caption: legenda,
)

#let registro = state("registro", ())

#let registrar(numero, titulo, planejada, realizada, situacao) = registro.update(l => l + ((
  numero: numero, titulo: titulo,
  planejada: planejada, realizada: realizada, situacao: situacao,
),))

#let atividade(
  numero, titulo,
  descricao: "",
  planejada: "",
  realizada: "—",
  situacao: "entregue",   // entregue · entregue com atraso · não entregue
  evidencia: "",
  url: "",
  corpo,
) = {
  registrar(numero, titulo, planejada, realizada, situacao)
  heading(level: 2, [Atividade #numero — #titulo])
  table(
    columns: (3.4cm, 1fr),
    fill: (x, y) => if x == 0 { luma(245) } else { none },
    [*Descrição*], [#descricao],
    [*Data planejada*], [#planejada],
    [*Data realizada*], [#realizada],
    [*Situação*], [#situacao],
    [*Evidência*], [#evidencia],
    [*Link*], [#if url == "" [—] else [#link(url)]],
  )
  corpo
}

// ============================================================
//  CAPA
// ============================================================
#align(center)[
  #v(2.5cm)
  #text(size: 12pt, tracking: 0.12em)[FATEC POMPEIA]
  #v(0.4em)
  #text(size: 10.5pt, fill: luma(110))[#disciplina · #codigo · #turma]
  #v(4cm)
  #text(size: 26pt, weight: "bold")[P2]
  #v(0.3em)
  #text(size: 18pt, weight: "bold")[Relatório consolidado]
  #v(0.2em)
  #text(size: 13pt)[arquitetura e atividades do 2º bimestre]
  #v(0.8em)
  #text(size: 11pt, fill: luma(110))[Avaliação individual · 2026.2]
  #v(3.2cm)
  #text(size: 14pt)[#aluno]
  #v(0.5em)
  #text(size: 11pt)[Produto: *#produto*] \
  #text(size: 9.5pt)[#link(repositorio)]
  #v(1fr)
  #text(size: 10.5pt)[#professor \ Pompeia, #data-relatorio]
]

#set page(
  numbering: "1",
  number-align: right,
  header: context {
    set text(size: 8pt, fill: luma(120))
    [#codigo · P2 — Relatório consolidado #h(1fr) #aluno]
    line(length: 100%, stroke: 0.4pt + luma(200))
  },
)
#counter(page).update(1)

#outline(title: "Sumário", indent: 1.2em, depth: 2)
#pagebreak()

// ============================================================
= Introdução
// ============================================================
No primeiro bimestre de Introdução à Computação em Nuvem (ISW055), o trabalho girou em torno de um catálogo de filmes de Tom Hanks. A cada atividade o catálogo ganhou uma peça nova: o microsserviço de autenticação, o controle de acesso por papel, a auditoria com Redis, o perfil com fotos no MinIO e a publicação no Portainer. No segundo bimestre essas peças deixaram de ser exercícios soltos. Primeiro o catálogo passou a cobrar um plano Premium pelo Stripe e ganhou uma documentação reversa. Depois o histórico inteiro foi copiado para um repositório novo e virou a base de um negócio meu, o GiroRural.

O GiroRural resolve um problema que conheço do campo: muitos produtores têm trator, colheitadeira ou implemento parado boa parte do ano, enquanto outros precisam dessas máquinas por poucos dias e não encontram quem alugue perto. Na plataforma, o proprietário anuncia a máquina por diária, o locatário busca, pede a reserva, paga depois da aprovação e só então recebe o contato do dono para combinar a retirada. Para o proprietário, o produto é um SaaS: toda conta começa no plano Gratuito, com três anúncios novos por mês, e pode assinar o plano Pro por R\$ 39,90 mensais pelo Stripe para anunciar sem limite.

Este relatório tem duas metades. A seção 3 descreve a arquitetura do sistema que está no ar em #link(site)[luana-abrantes-isw055.lapps.studio]: componentes, onde rodam, como uma requisição e uma assinatura atravessam o sistema, o modelo de dados, a segurança, a observabilidade e as camadas de nuvem. As seções 4 e 5 trazem o quadro das atividades 7 a 11, com a data planejada, a data realizada e a prova de cada entrega, e a seção 6 fecha com o que aprendi e o que ainda falta para o GiroRural ser um produto de verdade.

// ============================================================
= Metodologia
// ============================================================
As atividades foram desenvolvidas em Node.js com Express, no Visual Studio Code, com versionamento no GitHub e execução em contêineres Docker. Cada entrega começou numa branch própria (por exemplo `atividade-7-stripe-premium`, `atividade-8-documentacao-reversa`, `atividade-10` e `saas-completo-stripe`) e foi incorporada à `main` depois de testada localmente com o Docker Compose e com a suíte de testes automatizados (`npm test`). A publicação seguiu o mesmo caminho do primeiro bimestre: o GitHub Actions constrói as imagens e as publica no GHCR, e eu atualizo a stack `girorural-luana-abrantes` no Portainer com a nova tag. Nas atividades 10 e 11 usei também um assistente de IA (Claude Code) para parte da implementação e da revisão; esses commits aparecem no histórico com o autor "Claude" e foram revisados e publicados por mim.

Na atividade 9 criei o repositório `Luanaabrantes/girorural` a partir de uma cópia completa do repositório `Luanaabrantes/catalogo-filmes`, preservando todos os commits, branches e datas. Por isso as atividades 7 e 8, feitas ainda no catálogo de filmes, têm o mesmo hash, a mesma data e a mesma hora nos dois repositórios, e os links deste relatório apontam para o repositório novo. O plano de negócio, o README do produto e as issues de desenvolvimento foram escritos nesse repositório, e a arquitetura de microsserviços foi reaproveitada inteira; o que mudou foi o domínio (máquinas, anúncios, reservas e planos).

As datas e horas realizadas saíram de duas fontes verificáveis. Para as atividades 7 e 8, usei a data do commit de entrega no GitHub, conferida com `git log --date=format:"%d/%m/%Y %H:%M"`. Da atividade 9 em diante, usei a hora de abertura da issue de entrega que menciona \@siriani, conferida pela API do GitHub, e indico também o commit correspondente. Todas as horas estão no fuso de Brasília (UTC−03); alguns commits feitos com o assistente foram gravados em UTC e foram convertidos. A situação de cada atividade compara essa data com a data planejada da lista de atividades, e a arquitetura da seção 3 foi escrita lendo o código do commit `0aac7bb`, que é o que está no ar.

// ============================================================
= Arquitetura do SaaS
// ============================================================

== Visão geral e componentes
O GiroRural é formado por cinco contêineres numa única rede Docker interna (`catalogo-network`), mais três dependências externas. Só o `girorural-api` publica porta (8216 no host, 3000 no contêiner), e é por ele que passa tudo o que vem do domínio, inclusive os webhooks do Stripe. Os demais serviços usam apenas `expose` e só existem dentro da rede da stack.

#evidencia([Componentes do GiroRural: o que é público (subdomínio) e o que só existe na rede interna do Docker. Fonte: `docs/p2/diagramas/componentes.mmd`.], arquivo: "diagramas/componentes.png")

#table(
  columns: (2.7cm, 1fr, 3.2cm, 2.4cm),
  fill: (x, y) => if y == 0 { luma(235) } else { none },
  table.header([*Componente*], [*Responsabilidade*], [*Tecnologia / imagem*], [*Público?*]),
  [app (`girorural-api`)], [Telas em `public/`, landing, API `/api/*` de anúncios, reservas, locação, perfil, planos e administração; checkout e portal do Stripe; webhooks; Swagger em `/apidocs`; `/live`, `/health` e `/metrics`.], [Node.js + Express · `ghcr.io/luanaabrantes/girorural-api`], [sim (domínio, porta 8216)],
  [auth-service], [Cadastro, login com JWT (validade de 8 h), recuperação de senha por e-mail, troca de papel e `GET /auth/validar`, que relê o papel atual no banco a cada requisição (RBAC).], [Node.js + Express · `girorural-auth-service`], [não (`auth-service:3001`)],
  [log-service], [Recebe eventos de negócio e auditoria (`POST /eventos`) da API e do auth-service; consulta administrativa em `GET /eventos`.], [Node.js + Express · `girorural-log-service`], [não (`log-service:3002`)],
  [Redis], [Stream `auditoria` com persistência AOF no volume `audit-redis-data`.], [`redis:7.4-alpine`], [não (`redis:6379`)],
  [MariaDB], [Usuários, domínio (equipamentos, anúncios, reservas), planos e assinaturas. Externo à stack (`DB_HOST`).], [MariaDB da disciplina], [não],
  [MinIO], [Fotos dos anúncios e de perfil (volume `minio-data`); no banco fica só a chave do objeto.], [`girorural-minio`], [não (`minio:9000`)],
  [Stripe (externo)], [Checkout de assinatura, Billing Portal e checkout de locação; webhooks assinados para `/api/stripe/webhook` e `/api/locacao/stripe/webhook`.], [serviço SaaS (modo de teste)], [webhook → app],
  [SMTP (externo)], [Envio do link de redefinição de senha (`MAIL_*`).], [provedor de e-mail], [não],
)

== Onde roda
Tudo roda na mesma stack do Portainer das atividades anteriores, `girorural-luana-abrantes`, na VM da disciplina e no mesmo subdomínio (#link(site)[luana-abrantes-isw055.lapps.studio]). A stack lê o arquivo #link(repositorio + "/blob/main/docker-compose.portainer.yml")[`docker-compose.portainer.yml`] deste repositório e usa imagens publicadas no GHCR pelo GitHub Actions (`ghcr.io/luanaabrantes/girorural-api`, `girorural-auth-service`, `girorural-log-service` e `girorural-minio`), sempre com a tag `sha-<commit>` definida na variável `IMAGE_TAG`. O Redis usa a imagem oficial `redis:7.4-alpine`.

#table(
  columns: (3.2cm, 2.4cm, 2cm, 1fr),
  fill: (x, y) => if y == 0 { luma(235) } else { none },
  table.header([*Contêiner*], [*Porta*], [*Memória*], [*Health check*]),
  [`girorural-api`], [8216 → 3000], [`mem_limit: 1g`], [`/health` a cada 5 s],
  [`auth-service`], [3001 (interna)], [`mem_limit: 1g`], [`/health` a cada 5 s],
  [`log-service`], [3002 (interna)], [`mem_limit: 1g`], [`/health` a cada 5 s; sobe depois do Redis saudável],
  [`redis`], [6379 (interna)], [`mem_limit: 1g`], [`redis-cli ping`],
  [`minio`], [9000 (interna)], [`mem_limit: 1g`], [`/minio/health/live`],
)

Todos usam `restart: unless-stopped`. Os segredos são variáveis da stack no Portainer e nunca aparecem no repositório; o arquivo `.env.example` lista só os nomes:

- *Banco:* `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- *Sessão:* `JWT_SECRET` · *MinIO:* `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
- *E-mail:* `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`
- *Stripe (teste):* `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_PRICE_FREE_ID`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_CONFIGURATION_ID`, `STRIPE_LOCACAO_WEBHOOK_SECRET`, `APP_BASE_URL`
- *Catálogo e deploy:* `CATALOGO_INICIAL`, `CATALOGO_PROPRIETARIO_EMAIL`, `CATALOGO_PROPRIETARIO_SENHA`, `PAGAMENTO_SIMULADO`, `IMAGE_TAG`

== Fluxo de uma requisição
A ação escolhida é a mais comum do negócio: um locatário pede a reserva de uma máquina. O navegador envia `POST /api/reservas` com o cookie `token` (httpOnly, SameSite=Lax). A API não decodifica o JWT sozinha: o middleware chama o auth-service, que valida a assinatura e relê o papel atual no banco. Só depois a regra de negócio roda numa transação e o evento vai para a auditoria.

#evidencia([Fluxo de `POST /api/reservas`, do navegador até a resposta. Fonte: `docs/p2/diagramas/requisicao.mmd`.], arquivo: "diagramas/requisicao.png")

Se o auth-service não responder em 2 s, a API devolve 503; se o papel não puder reservar, devolve 403 e registra `ACAO_NEGADA` no log-service. A gravação da auditoria é de melhor esforço: uma falha no log-service não desfaz a reserva já confirmada no banco.

== Fluxo de assinatura
O app só abre caminhos (checkout e portal); quem muda o plano no banco é sempre o webhook. Voltar do checkout com `?plano=sucesso` não altera nada.

#evidencia([Ciclo da assinatura: checkout, webhook, plano no banco, limite na API e cancelamento pelo portal. Fonte: `docs/p2/diagramas/assinatura.mmd`.], arquivo: "diagramas/assinatura.png")

+ *Checkout.* `POST /api/premium/checkout` cria (ou reaproveita) o customer do usuário e abre uma sessão `mode: subscription` com `client_reference_id` igual ao id do usuário. O cartão de teste 4242 é digitado no Stripe e nunca passa pelo servidor.
+ *Validação do webhook.* `POST /api/stripe/webhook` recebe o corpo bruto (`express.raw`) e chama `stripe.webhooks.constructEvent` com `STRIPE_WEBHOOK_SECRET`. Sem assinatura válida, ou com `livemode: true`, responde 400 e não grava nada.
+ *Plano no banco.* O app relê a assinatura e a última fatura no próprio Stripe, confere que o customer e o `client_reference_id` são do usuário e atualiza `premium_assinaturas` (status, preço, período pago). Eventos tratados: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` e `invoice.paid`.
+ *Limite liberado na API.* `POST /api/anuncios` chama `exigirLimiteAnuncios`, que lê o plano no banco a cada requisição. No Gratuito, o 4º anúncio do mês recebe 402 (`LIMITE_DO_PLANO`); no Pro não há limite.
+ *Cancelamento.* `POST /api/premium/portal` abre o Billing Portal para o customer da sessão. Ao cancelar, chega `customer.subscription.deleted`, o status vira `canceled` e a conta volta ao Gratuito.
+ *Evento repetido.* Na mesma transação que atualiza o plano, o id do evento entra em `stripe_eventos` (chave primária) com `INSERT IGNORE`. Se o Stripe reenviar, nada é inserido e o processamento é pulado; se algo falhar, a transação desfaz também o registro do evento e o Stripe pode tentar de novo. A coluna `state_event_created` impede que um evento antigo, chegando fora de ordem, sobrescreva um estado mais novo.

== Modelo de dados do domínio
As tabelas do domínio ficam no mesmo MariaDB da tabela `usuarios`, criada ainda no catálogo de filmes. As migrações estão em `database/` e são aditivas e reexecutáveis.

#evidencia([Modelo de dados do domínio e chaves estrangeiras (colunas principais). Fonte: `docs/p2/diagramas/dados.mmd`.], arquivo: "diagramas/dados.png")

#table(
  columns: (3.6cm, 1fr),
  fill: (x, y) => if y == 0 { luma(235) } else { none },
  table.header([*Tabela*], [*Papel e chaves estrangeiras*]),
  [`usuarios`], [Conta e papel (`role`: ADMIN, PROPRIETARIO ou LOCATARIO).],
  [`perfis`], [Telefone, cidade, UF e chave da foto no MinIO; `usuario_id` → `usuarios`.],
  [`equipamentos`], [Máquina do proprietário; `proprietario_id` → `usuarios`.],
  [`anuncios`], [Diária, cidade, estado e moderação; `equipamento_id` → `equipamentos`, `proprietario_id` → `usuarios`.],
  [`anuncio_imagens`], [Galeria de fotos; `anuncio_id` → `anuncios`, `proprietario_id` → `usuarios`.],
  [`reservas`], [Período, estado e valor; `anuncio_id` → `anuncios`, `solicitante_id` → `usuarios`.],
  [`locacao_pagamentos`], [Pagamento da locação no Stripe; `reserva_id` → `reservas`.],
  [`premium_assinaturas`], [*Liga usuário, plano e assinatura:* `usuario_id` (PK e FK → `usuarios`), `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `status` e `paid_period_end`.],
  [`stripe_eventos`, `stripe_locacao_eventos`], [Id dos eventos já processados (idempotência); sem payload nem dado de cartão.],
  [`reset_tokens`], [Tokens de redefinição de senha; `usuario_id` → `usuarios`.],
)

== Segurança
Toda conta nasce LOCATARIO; o locatário pode habilitar o modo anunciante e virar PROPRIETARIO, e só um ADMIN muda papéis no painel. A tabela mostra o que a API permite a cada papel.

#table(
  columns: (1fr, 1.8cm, 2cm, 2.4cm, 1.6cm),
  align: (left, center, center, center, center),
  fill: (x, y) => if y == 0 { luma(235) } else { none },
  table.header([*Ação*], [*visitante*], [*locatário*], [*proprietário*], [*admin*]),
  [ver landing, catálogo e anúncios ativos], [sim], [sim], [sim], [sim],
  [pedir reserva e pagar a locação aprovada], [não], [sim], [sim (não do próprio anúncio)], [não],
  [cadastrar equipamento, anúncio e fotos], [não], [não (403)], [sim], [não],
  [aprovar ou recusar reservas recebidas], [não], [não], [sim (só as suas)], [não],
  [assinar o Pro e abrir o portal do cliente], [não], [sim], [sim], [sim],
  [ver reserva ou anúncio privado de outro usuário], [não], [não (404)], [não (404)], [sim (painel)],
  [moderar anúncios, mudar papéis, ver auditoria e MRR], [não], [não], [não], [sim],
)

*Isolamento por usuário.* O id do usuário vem sempre de `req.usuario`, preenchido pelo auth-service, e nunca do corpo da requisição. Toda consulta de recurso privado filtra pelo dono na própria cláusula SQL, por exemplo `WHERE r.id = ? AND (r.solicitante_id = ? OR e.proprietario_id = ?)`. Quando o recurso não existe ou é de outra pessoa, a resposta é a mesma, 404 "Recurso não encontrado", para não revelar que o id existe. Alterações usam `SELECT … FOR UPDATE` na mesma transação, e tentativas negadas por papel geram 403 e o evento `ACAO_NEGADA`.

*Segredos.* Chaves do Stripe, `JWT_SECRET`, senhas do banco, do MinIO e do SMTP ficam só nas variáveis da stack no Portainer. O repositório tem apenas `.env.example` com os nomes, o `.gitignore` exclui os arquivos `.env`, e o Stripe está em modo de teste: o código recusa objetos com `livemode: true`.

== Observabilidade, CI/CD e documentação da API
Fiz as três atividades extras no primeiro bimestre e elas continuam ativas no GiroRural:

- *Health checks:* `/live` (processo vivo) e `/health` (prontidão, com 503 quando uma dependência falha) na API, no auth-service e no log-service. O `/health` da API testa MariaDB, auth-service, log-service e MinIO, e o Docker usa esses endpoints nos `healthcheck` da stack.
- *Métricas:* `/metrics` no formato Prometheus, com contador de requisições e histograma de latência por método, rota e status.
- *Swagger:* #link(site + "/apidocs/")[`/apidocs`] (API do GiroRural) e `/apidocs/auth`, gerados a partir de anotações `@openapi` no código e validados no CI.
- *CI/CD:* o workflow #link(repositorio + "/blob/main/.github/workflows/cicd.yml")[`cicd.yml`] roda em push e pull request: `npm ci` nos três serviços, `npm test`, `npm run docs:validate`, build das quatro imagens e, em push, publicação no GHCR com a tag `sha-<commit>`. O deploy é semiautomático: eu troco `IMAGE_TAG` na stack e clico em *Update the stack*.

== Camadas IaaS, PaaS e SaaS do projeto
#table(
  columns: (2cm, 1fr, 3.6cm),
  fill: (x, y) => if y == 0 { luma(235) } else { none },
  table.header([*Camada*], [*Onde aparece no GiroRural*], [*Quem gerencia*]),
  [IaaS], [A VM da disciplina onde o Docker roda, com rede, disco e o subdomínio `*.lapps.studio`; o servidor MariaDB externo.], [Professor / infraestrutura da Fatec],
  [PaaS], [Docker + Portainer como plataforma de execução: eu entrego um Compose e imagens, e a plataforma cuida de rede, volumes, reinício e health checks. O GHCR e o GitHub Actions fazem o papel de registro e pipeline gerenciados.], [Professor (Portainer); GitHub (Actions e GHCR); eu configuro a stack],
  [SaaS], [O próprio GiroRural: o produtor usa pelo navegador, sem instalar nada, e paga uma assinatura mensal pelo plano Pro. O GiroRural também consome outros SaaS: Stripe (cobrança) e o provedor SMTP.], [Eu (GiroRural); Stripe; provedor de e-mail],
)

No recorte didático, a VM é IaaS e o Portainer faz o papel de PaaS, mas são componentes autogerenciados pela turma, não serviços contratados de um provedor de nuvem. Redis e MinIO também são autogerenciados, dentro da stack.

// ============================================================
= Quadro de entregas
// ============================================================
Tabela gerada a partir das fichas da seção 5. Horário de Brasília (UTC−03).

#context {
  let l = registro.final().sorted(key: a => a.numero)
  table(
    columns: (auto, 1fr, 2.3cm, 3.6cm, 2.4cm),
    align: (center, left, center, center, center),
    fill: (x, y) => if y == 0 { luma(235) } else { none },
    table.header([*Nº*], [*Atividade*], [*Data \ planejada*], [*Data \ realizada*], [*Situação*]),
    ..l.map(a => ([#a.numero], [#a.titulo], [#a.planejada], [#a.realizada], [#a.situacao])).flatten(),
  )
}

// ============================================================
= Atividades realizadas
// ============================================================

#atividade(
  7, "Plano Premium — cobrança de verdade com Stripe",
  descricao: "Plano Premium de R$ 9,90/mês no catálogo de filmes, cobrado pelo Stripe Checkout em modo de teste e ativado por webhook.",
  planejada: "09/10/2026",
  realizada: "16/10/2026 00:58",
  situacao: "entregue no prazo combinado",
  evidencia: "Commits 1c2912a e ec5df7e (09/10, implementação) e 1a23979 (16/10, evidências); issue #6 do repositório catalogo-filmes, aberta em 16/10/2026; prints do checkout com o cartão 4242 e do perfil Premium.",
  url: "https://github.com/Luanaabrantes/catalogo-filmes/issues/6",
)[
  *Situação.* O professor prorrogou a entrega da atividade 7 até 16/10/2026; a entrega foi em 16/10 às 00:58, dentro do novo prazo.

  *Links da entrega.* #link("https://github.com/Luanaabrantes/catalogo-filmes/issues/6")[Issue de entrega #6 (catalogo-filmes, 16/10/2026)] · #link(repositorio + "/commit/1a239795551893f703cee88635cf8d811f26da83")[Commit da entrega — 1a23979 (16/10/2026 00:58)] · #link(repositorio + "/commit/ec5df7e596a380e2a16c5701e4db9fe4a98d501f")[Commit da implementação — ec5df7e (09/10/2026 20:29)]

  *O que foi feito.*

  O catálogo de filmes ganhou um plano Premium mensal. O botão de assinar chama a API, que cria uma sessão do Stripe Checkout em modo de teste ligada ao usuário logado. O Premium não é ativado pelo retorno do navegador: o webhook validado com a assinatura do Stripe grava a assinatura em `premium_assinaturas` e registra o id do evento em `stripe_eventos`, para que o mesmo evento não seja processado duas vezes. Na segunda versão (ec5df7e) passei a guardar o período pago, as datas de renovação e cancelamento e um script de sincronização com o Stripe, e o perfil mostra o selo Premium com a validade.

  #evidencia([Atividade 7 — Commit de entrega 1a23979 no repositório Luanaabrantes/girorural: página do GitHub e, abaixo, a API com "date": "2026-10-16T03:58:27Z" (16/10/2026 00:58 em Brasília) (1/2: página do GitHub).], arquivo: "prints/a7-commit-pagina.png")

  #evidencia([Atividade 7 — Commit de entrega 1a23979 no repositório Luanaabrantes/girorural: página do GitHub e, abaixo, a API com "date": "2026-10-16T03:58:27Z" (16/10/2026 00:58 em Brasília) (2/2: resposta da API do GitHub com a data e a hora em UTC).], arquivo: "prints/a7-commit-api.png")

  #evidencia([Atividade 7 — Stripe Checkout em modo de teste com o cartão 4242, assinatura do Plano Premium de R\$ 9,90/mês.], arquivo: "prints/atividade-7-stripe-checkout.png")

  #evidencia([Atividade 7 — Perfil do usuário com o plano Premium ativo depois do webhook.], arquivo: "prints/atividade-7-premium-perfil.png")

  *Dificuldades e como foram resolvidas.*

  A parte mais difícil foi entender que o retorno do checkout não prova pagamento: só o webhook assinado pode mudar o plano. Também precisei tratar eventos repetidos e fora de ordem, o que resolvi com a tabela de eventos e a marca de tempo do último evento aplicado. O código foi publicado no dia 09/10, e as capturas do fluxo entraram no README em 16/10. O professor havia prorrogado o prazo da atividade 7 até 16/10/2026, e a entrega (commit 1a23979 às 00:58 e issue \#6 no repositório catalogo-filmes) ficou dentro desse prazo. A data planejada no quadro continua sendo a publicada na lista de atividades, 09/10/2026.
]

#atividade(
  8, "SaaS, PaaS, IaaS — e a documentação que o projeto nunca teve",
  descricao: "Documentação reversa do catálogo de filmes (DOCUMENTACAO.md) e classificação SaaS/PaaS/IaaS, linkadas no README.",
  planejada: "16/10/2026",
  realizada: "16/10/2026 17:39",
  situacao: "entregue",
  evidencia: "Commit 879e25e com o DOCUMENTACAO.md e o link no README; merge na main em 16/10/2026 20:10 (9c024a0).",
  url: repositorio + "/commit/879e25e2d087e3af0ca932365708b29b31e17341",
)[
  *Links da entrega.* #link(repositorio + "/commit/879e25e2d087e3af0ca932365708b29b31e17341")[Commit da entrega — 879e25e] · #link(repositorio + "/blob/main/DOCUMENTACAO.md")[DOCUMENTACAO.md]

  *O que foi feito.*

  Escrevi a documentação que o catálogo de filmes não tinha, lendo o próprio código: escopo e histórico, rotas, diagrama de arquitetura em Mermaid, regras de negócio de autenticação, catálogo, auditoria, Premium e observabilidade, modelo de dados, fluxos principais e limitações conhecidas. No README entrou o link para o `DOCUMENTACAO.md` e a tabela de classificação: o catálogo como SaaS, a VM como IaaS e Docker com Portainer como PaaS de execução, com a ressalva de que os componentes são autogerenciados.

  #evidencia([Atividade 8 — Commit 879e25e no repositório Luanaabrantes/girorural: página do GitHub e, abaixo, a API com "date": "2026-10-16T20:39:01Z" (16/10/2026 17:39 em Brasília) (1/2: página do GitHub).], arquivo: "prints/a8-commit-pagina.png")

  #evidencia([Atividade 8 — Commit 879e25e no repositório Luanaabrantes/girorural: página do GitHub e, abaixo, a API com "date": "2026-10-16T20:39:01Z" (16/10/2026 17:39 em Brasília) (2/2: resposta da API do GitHub com a data e a hora em UTC).], arquivo: "prints/a8-commit-api.png")

  #evidencia([Atividade 8 — README no commit 879e25e com o link "Documentação completa do sistema: DOCUMENTACAO.md".], arquivo: "prints/a8-readme.png")

  *Dificuldades e como foram resolvidas.*

  A dificuldade foi descrever o que o código faz de verdade, e não o que eu lembrava de ter feito. Algumas suposições, como o MariaDB fazer parte da stack, estavam erradas: o Compose não define o banco, que é externo. Também foi preciso separar o que é IaaS, PaaS e SaaS no recorte da disciplina sem afirmar contratações que o projeto não tem. Resolvi conferindo cada afirmação nos arquivos e registrando as limitações no próprio documento.
]

#atividade(
  9, "Fork e plano de negócio",
  descricao: "Repositório novo com o histórico completo do catálogo, README do produto GiroRural, plano de implementação e issues de desenvolvimento.",
  planejada: "23/10/2026",
  realizada: "23/10/2026 20:44",
  situacao: "entregue",
  evidencia: "Issue #10 \"Entrega — Fork e plano de negócio\" mencionando @siriani; commit do README 7b27eed (23/10/2026 19:18); issues #1 a #7.",
  url: repositorio + "/issues/10",
)[
  *Links da entrega.* #link(repositorio + "/issues/10")[Issue de entrega #10] · #link(repositorio + "/commit/7b27eedcb2c626ddf3a2db7c5351bed161ae943e")[Commit do README e planejamento — 7b27eed] · #link(repositorio + "/issues")[Issues de desenvolvimento]

  *O que foi feito.*

  Criei o repositório `Luanaabrantes/girorural` com a cópia integral do histórico do catálogo de filmes, desde o commit 0e3b62a de 20/08/2026, e escrevi o README apresentando o GiroRural, o plano de implementação e a inspeção da arquitetura herdada. Abri sete issues de desenvolvimento (modelo de dados e isolamento, cadastro de equipamentos e anúncios, fotos, busca e filtros, reservas, painel e assinatura com Stripe). O plano previa inicialmente um plano Free com dois anúncios ativos e um Pro com até vinte; na atividade 11 esse modelo foi ajustado para três anúncios novos por mês no Gratuito e Pro sem limite.

  #evidencia([Atividade 9 — Issue de entrega #10 mencionando \@siriani: página do GitHub e, abaixo, a API com "created_at": "2026-10-23T23:44:42Z" (23/10/2026 20:44 em Brasília) (1/2: página do GitHub).], arquivo: "prints/a9-issue-pagina.png")

  #evidencia([Atividade 9 — Issue de entrega #10 mencionando \@siriani: página do GitHub e, abaixo, a API com "created_at": "2026-10-23T23:44:42Z" (23/10/2026 20:44 em Brasília) (2/2: resposta da API do GitHub com a data e a hora em UTC).], arquivo: "prints/a9-issue-api.png")

  #evidencia([Atividade 9 — Histórico de commits preservado no repositório novo.], arquivo: "prints/atividade-9-commits.png")

  #evidencia([Atividade 9 — Issues de desenvolvimento abertas no repositório do produto.], arquivo: "prints/atividade-9-issues.png")

  *Dificuldades e como foram resolvidas.*

  O desafio foi copiar o histórico sem perder branches e datas, e conferir que os hashes eram os mesmos nos dois repositórios. Um erro meu ficou na issue: as imagens dela apontam para `docs/evidencias` na `main`, mas o commit dos prints (7ab1fd6, 23/10 20:33) ficou na branch #link(repositorio + "/tree/docs/etapa-1-girorural/docs/evidencias")[`docs/etapa-1-girorural`], então elas não abrem pela issue. Os prints existem nessa branch e estão reproduzidos acima.
]

#atividade(
  10, "Seu negócio no ar — o domínio no lugar dos filmes",
  descricao: "GiroRural publicado na mesma stack e subdomínio: anúncios, reservas, fotos no MinIO, papéis, 403 para quem não pode e eventos de negócio no log-service.",
  planejada: "06/11/2026",
  realizada: "06/11/2026 20:24",
  situacao: "entregue",
  evidencia: "Issue #11 \"Entrega — Seu negócio no ar\" mencionando @siriani; commits cb2ecfd (ACAO_NEGADA) e fa19e76 (galeria de evidências), 06/11/2026; URL no ar.",
  url: repositorio + "/issues/11",
)[
  *Links da entrega.* #link(repositorio + "/issues/11")[Issue de entrega #11] · #link(repositorio + "/commit/fa19e76a6316f9bb741ef79f230346055d3d1482")[Commit — fa19e76 (06/11/2026 20:27)] · #link(site)[Sistema no ar] · #link(repositorio + "/blob/main/docs/evidencias/atividade-10/README.md")[Galeria de evidências]

  *O que foi feito.*

  O domínio do GiroRural foi implementado sobre a arquitetura herdada: equipamentos, anúncios com galeria de fotos no MinIO, busca com filtros, reservas com controle de conflito de datas, aprovação pelo proprietário, pagamento da locação (simulado na demonstração) e liberação do contato do dono só depois do pagamento. Os papéis passaram a ser LOCATARIO, PROPRIETARIO e ADMIN; toda conta nasce locatária e pode habilitar o modo anunciante. Tentativas de operação sem papel adequado recebem 403 e geram `ACAO_NEGADA` no log-service, e cada ação de negócio gera um evento de auditoria. A stack ficou com limite de 1 GB por contêiner e um catálogo inicial de 33 máquinas.

  #evidencia([Atividade 10 — Issue de entrega #11 mencionando \@siriani: página do GitHub e, abaixo, a API com "created_at": "2026-11-06T23:24:18Z" (06/11/2026 20:24 em Brasília) (1/2: página do GitHub).], arquivo: "prints/a10-issue-pagina.png")

  #evidencia([Atividade 10 — Issue de entrega #11 mencionando \@siriani: página do GitHub e, abaixo, a API com "created_at": "2026-11-06T23:24:18Z" (06/11/2026 20:24 em Brasília) (2/2: resposta da API do GitHub com a data e a hora em UTC).], arquivo: "prints/a10-issue-api.png")

  #evidencia([Atividade 10 — Landing do GiroRural no ar no subdomínio da disciplina.], arquivo: "prints/atividade-10-01-landing.jpg")

  #evidencia([Atividade 10 — Locatário tentando anunciar: a API responde 403.], arquivo: "prints/atividade-10-04-403-locatario-tenta-anunciar.jpg")

  #evidencia([Atividade 10 — Eventos de negócio e ACAO_NEGADA consultados no log-service.], arquivo: "prints/atividade-10-09-auditoria-log-service.jpg")

  #evidencia([Atividade 10 — Contêineres da stack girorural-luana-abrantes no Portainer.], arquivo: "prints/atividade-10-10-portainer-containers.jpg")

  *Dificuldades e como foram resolvidas.*

  As migrações precisavam funcionar tanto no MariaDB da disciplina quanto no MySQL 8 local, o que exigiu reescrever partes do SQL (commit ba0623c). A rede da stack colidiu com outras stacks por causa de uma subnet fixa, que removi (74a25d0). Também ajustei o workflow para publicar as imagens a partir da branch da atividade e permitir disparo manual. Por fim, o 403 não aparecia no log porque o evento não era registrado na negação por papel; o commit cb2ecfd passou a registrar `ACAO_NEGADA`.
]

#atividade(
  11, "SaaS completo — planos, limites e assinatura com Stripe",
  descricao: "Planos Gratuito (3 anúncios/mês) e Pro (R$ 39,90/mês, sem limite), limite aplicado na API, webhooks idempotentes, portal do cliente e painel de MRR.",
  planejada: "13/11/2026",
  realizada: "12/11/2026 23:14",
  situacao: "entregue",
  evidencia: "Issue #13 \"Entrega — SaaS completo\" mencionando @siriani; PR #12 incorporado à main no commit 0aac7bb (12/11/2026 21:31); prints da assinatura com o cartão 4242, dos webhooks e do limite.",
  url: repositorio + "/issues/13",
)[
  *Links da entrega.* #link(repositorio + "/issues/13")[Issue de entrega #13] · #link(repositorio + "/commit/0aac7bbecb622f295d6cdd162c2129006539f611")[Commit — 0aac7bb (PR #12)] · #link(repositorio + "/tree/entrega-saas-prints/docs/entrega-saas")[Prints da entrega (branch entrega-saas-prints)]

  *O que foi feito.*

  O Premium da atividade 7 virou um modelo de receita completo. Os planos estão definidos num lugar só (`src/planos.js`). O checkout cria uma assinatura mensal recorrente, o webhook trata a criação, a atualização, o cancelamento, a falha de pagamento e a renovação, e o limite do plano é conferido na API a cada criação de anúncio, devolvendo 402 com uma mensagem que explica como liberar. O botão *Gerenciar assinatura* abre o portal do cliente do Stripe para trocar de plano, atualizar o cartão ou cancelar, e o painel administrativo ganhou a aba *Assinaturas e MRR* com assinantes, status e os últimos eventos recebidos.

  #evidencia([Atividade 11 — Issue de entrega #13 mencionando \@siriani: página do GitHub e, abaixo, a API com "created_at": "2026-11-13T02:14:24Z" (12/11/2026 23:14 em Brasília) (1/2: página do GitHub).], arquivo: "prints/a11-issue-pagina.png")

  #evidencia([Atividade 11 — Issue de entrega #13 mencionando \@siriani: página do GitHub e, abaixo, a API com "created_at": "2026-11-13T02:14:24Z" (12/11/2026 23:14 em Brasília) (2/2: resposta da API do GitHub com a data e a hora em UTC).], arquivo: "prints/a11-issue-api.png")

  #evidencia([Atividade 11 — Assinatura GiroRural Pro ativa no Stripe (modo de teste).], arquivo: "prints/atividade-11-03-stripe-assinatura-ativa.jpg")

  #evidencia([Atividade 11 — Webhooks entregues com resposta 200.], arquivo: "prints/atividade-11-02-webhook-200.jpg")

  #evidencia([Atividade 11 — Plano Gratuito: a API recusa o 4º anúncio do mês com 402.], arquivo: "prints/atividade-11-01-limite-gratuito-backend.jpg")

  #evidencia([Atividade 11 — Painel admin com assinaturas e MRR de teste.], arquivo: "prints/atividade-11-04-admin-assinaturas-mrr.jpg")

  #evidencia([Atividade 11 — Cancelamento: webhook customer.subscription.deleted com 200 e conta de volta ao Gratuito.], arquivo: "prints/atividade-11-07-volta-ao-gratuito.jpg")

  *Dificuldades e como foram resolvidas.*

  O ponto delicado foi garantir que só o webhook muda o plano e que um evento reenviado não tenha efeito duplicado; resolvi registrando o evento na mesma transação da atualização. Também foi preciso configurar o portal com cancelamento imediato para conseguir demonstrar a volta ao Gratuito no mesmo dia, e decidir que os anúncios do catálogo de demonstração não contam para o limite do plano.
]

// ============================================================
= Considerações finais
// ============================================================
O maior aprendizado do bimestre foi ver as peças do primeiro bimestre funcionando como um sistema. Autenticação, papéis, auditoria, armazenamento de fotos e publicação na stack, que antes eram atividades separadas, passaram a sustentar um negócio com regras próprias. Quando precisei criar reservas, limitar anúncios por plano ou bloquear um locatário que tenta anunciar, eu já tinha onde apoiar cada regra, e isso mostrou na prática o valor de uma arquitetura em microsserviços bem separada.

A cobrança com o Stripe foi a parte que mais mudou a minha forma de pensar. Entendi que o navegador não é confiável para dizer que alguém pagou, que o webhook precisa ser validado e idempotente e que eventos podem chegar repetidos ou fora de ordem. A documentação reversa da atividade 8 e a seção de arquitetura deste relatório também me mostraram a diferença entre o que eu achava que tinha feito e o que o código realmente faz.

Para o GiroRural ser um produto de verdade ainda falta bastante. A cobrança está em modo de teste e o pagamento da locação na demonstração é simulado; para operar, seria preciso ativar a conta do Stripe e repassar o valor ao proprietário, por exemplo com Stripe Connect. Faltam também termos de uso e tratamento de dados conforme a LGPD, contrato e seguro da locação, avaliações entre usuários, backup automático do banco, alertas de monitoramento e deploy totalmente automático (hoje eu troco a tag da imagem manualmente). Mesmo assim, termino o bimestre com um sistema no ar que cobra, limita e registra o que acontece, e com muito mais segurança para continuar.

// ============================================================
= Declaração de autoria
// ============================================================
Declaro que este relatório foi elaborado por mim, individualmente, e que as evidências apresentadas correspondem a entregas de minha autoria, verificáveis nos links informados.

#v(1.5cm)
#grid(
  columns: (1fr, 1fr), gutter: 2cm,
  align(center)[#line(length: 100%, stroke: 0.5pt) \ #aluno],
  align(center)[#line(length: 100%, stroke: 0.5pt) \ Pompeia, #data-relatorio],
)

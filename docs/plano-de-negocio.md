# GiroRural · Plano de negócio

> Atividade 9 da disciplina ISW055, proposta pelo professor [@siriani](https://github.com/siriani). O plano foi escrito antes do código; o que já está construído aparece no [README](../README.md). Os planos e limites abaixo descrevem a visão do produto. O MVP no ar aplica 2 anúncios ativos no plano Gratuito e 20 no Pro.

**Do trator parado no galpão à máquina trabalhando na lavoura do vizinho: o GiroRural reúne em um só lugar as máquinas agrícolas disponíveis para aluguel na região, com diária, fotos e condições claras. O locatário pede as datas, o dono aprova e o pagamento e o contato saem pela própria plataforma.**

---

## 1. A dor

**Quem sofre:** dois lados do mesmo problema.

- **O pequeno e médio produtor que precisa da máquina.** Ele não tem capital para comprar uma plantadeira ou uma colheitadeira que usa poucas semanas por ano.
- **O produtor que tem a máquina.** O equipamento dele fica parado boa parte do ano, perdendo valor e gerando custo de manutenção.

**Quando:** nas janelas curtas do calendário agrícola, como o preparo do solo, o plantio, a pulverização e a colheita. São poucos dias em que a máquina certa faz a diferença, e todo mundo da região precisa dela ao mesmo tempo.

**Como resolve hoje:**

1. **Telefone e WhatsApp.** O produtor liga para vizinhos e posta em grupos perguntando "alguém tem plantadeira para alugar semana que vem?". A resposta depende de quem viu a mensagem.
2. **Combinado de boca.** Preço, datas, frete e operador são acertados por telefone, sem registro. Duas pessoas acham que reservaram a mesma máquina no mesmo dia.
3. **Locadoras e revendas.** Têm pouca variedade de implementos no interior, diária mais alta e nem sempre estão perto.

**Quanto custa hoje** (estimativa para a persona abaixo, por safra):

| Tarefa | Conta | Tempo ou custo |
|---|---|---|
| Procurar máquina disponível | 4 janelas de uso × ~1 dia de ligações e visitas | ~4 dias |
| Atraso por não achar a máquina na hora | 3 a 5 dias de atraso no plantio | perda de produtividade da área plantada fora da janela |
| Alternativa: comprar implemento usado | Plantadeira de 7 linhas usada | R$ 60 mil a R$ 120 mil, para usar ~15 dias por ano |
| Do lado do dono: máquina parada | Trator de 100 cv parado ~250 dias por ano | depreciação e manutenção sem receita |

Além do tempo, falta **confiança**. Quem aluga não sabe o estado da máquina antes de buscar. Quem empresta não sabe com quem está lidando, nem tem registro do que foi combinado.

## 2. Persona

> **José Carvalho, 52 anos, produtor de soja e milho em Rio Verde (GO).**
>
> Cultiva 180 hectares com o filho. Tem um trator próprio, mas aluga plantadeira, pulverizador e colheitadeira em cada safra. Acorda às 5h, passa o dia no campo e resolve os negócios pelo celular, no intervalo do almoço ou à noite.
>
> **O que ele tenta fazer:** plantar dentro da janela ideal de chuva e colher na hora certa, sem se endividar comprando máquinas que usa poucas semanas por ano.
>
> **O que atrapalha:**
> - Na semana do plantio, todo mundo quer a mesma plantadeira. Ele passa dias ligando e às vezes perde a janela.
> - Já combinou um aluguel por telefone e, quando foi buscar, a máquina estava com outro produtor.
> - Não consegue comparar preço nem ver como a máquina está antes de sair de casa.
> - Usa o WhatsApp para tudo, mas não tem paciência para sistema complicado.
>
> **Frase dele:** *"Máquina tem na região. O difícil é achar quem tem, livre, na semana que eu preciso."*

**Persona do outro lado:** a **Fazenda Boa Vista**, um produtor maior da mesma região. Tem trator, colheitadeira e implementos que ficam parados fora da safra. Quer transformar essas semanas paradas em renda, alugando para gente de confiança, com datas organizadas e pagamento garantido.

## 3. Concorrentes e alternativas

| Alternativa | O que faz bem | O que faz mal para o José |
|---|---|---|
| **Grupos de WhatsApp e vizinhos** | Gratuito, rápido quando alguém responde, confiança entre conhecidos | Depende de quem viu a mensagem; sem fotos padronizadas, preço ou calendário; nada registrado; conflito de datas |
| **Locadoras e revendas de máquinas** | Máquina revisada, contrato formal | Pouca oferta de implementos no interior; diária alta; distância; não aproveita as máquinas paradas dos vizinhos |
| **Cooperativas e associações** | Confiança e preço justo entre cooperados | Só atende cooperados; frota limitada e disputada na mesma janela |
| **Classificados gerais** (OLX, Marketplace) | Muita audiência | Feitos para venda, não aluguel; sem datas, reserva nem pagamento; nenhuma proteção a quem aluga ou empresta |
| **Comprar a máquina** | Disponível sempre que precisar | Investimento alto para poucos dias de uso por ano; financiamento e manutenção |

## 4. Proposta de valor

**O GiroRural mostra as máquinas agrícolas disponíveis perto de você, com diária, fotos e condições, e organiza a reserva do pedido ao pagamento. O José planta na janela certa, e a máquina parada da Fazenda Boa Vista vira renda.**

## 5. Modelo de receita com Stripe

O GiroRural ganha dinheiro com uma **assinatura mensal do anunciante**, cobrada pelo Stripe com a mesma integração da atividade 7 (checkout hospedado e webhook assinado). Quem aluga não paga nada para usar a plataforma.

| Plano | Preço | Para quem | Limites |
|---|---|---|---|
| **Gratuito** | **R$ 0** | Produtor que quer testar com uma ou duas máquinas | Até **2 anúncios ativos** · até 12 fotos por anúncio · reservas e pagamento pela plataforma |
| **Pro** | **R$ 39,90/mês** | Produtor ou pequena locadora com várias máquinas | Até **20 anúncios ativos** · destaque no catálogo · relatório de locações e faturamento por máquina |

**Pagamento da locação:** o locatário paga a diária pelo Stripe Checkout (`mode=payment`) **somente depois que o dono aprova** a reserva. O contato das partes só é liberado depois disso. No MVP o valor é cobrado em modo de teste e não há repasse automático.

**Próxima fonte de receita (roadmap):** uma taxa de serviço de 5% sobre cada locação paga, com repasse automático ao proprietário pelo **Stripe Connect**.

**Por que o dono pagaria o Pro:** R$ 39,90 por mês é menos do que meia diária de um trator. Se o GiroRural trouxer **uma** locação a mais por mês, o plano já se pagou. E quem tem mais de duas máquinas para anunciar esbarra no limite do Gratuito.

## 6. Métricas de sucesso

| Métrica | O que mede | Meta nos 3 primeiros meses |
|---|---|---|
| **Anúncios ativos** | Oferta de máquinas na região piloto | 100 |
| **Cadastros** | Produtores que criaram conta | 300 |
| **Ativação de anunciantes** | % das contas que viraram anunciantes e publicaram o 1º anúncio em até 7 dias | 40% |
| **Conversão em pedido** | % de quem visita um anúncio e pede reserva | 10% |
| **Aprovação** | % dos pedidos aprovados pelo dono | 60% |
| **Locações concluídas** | Reservas pagas e concluídas por mês | 50 |
| **Conflitos de agenda** | Duas reservas aprovadas no mesmo período para a mesma máquina | 0 |
| **Assinantes Pro e MRR** | Anunciantes pagantes e receita recorrente mensal | 20 Pro × R$ 39,90 = **R$ 798,00** |
| **Churn mensal** | % de assinantes que cancelam | ≤ 15% (o uso é sazonal, com pico no plantio e na colheita) |

Todas saem de dados que a arquitetura já registra: cadastros e papéis no `auth-service`; anúncios e reservas no banco (`anuncios`, `reservas`, `locacao_pagamentos`); assinaturas pelo webhook do Stripe; eventos de uso no log de auditoria (`ANUNCIO_CRIADO`, `RESERVA_SOLICITADA`, `RESERVA_APROVADA`, `LOCACAO_PAGA`, `RESERVA_CONCLUIDA`); e o painel `/admin.html`, que já mostra esses indicadores.

## 7. Lean Canvas

| Bloco | GiroRural |
|---|---|
| **Problema** | 1. Achar a máquina certa, livre, na janela curta do plantio ou da colheita. 2. Combinados por telefone sem registro geram conflito de datas e desconfiança. 3. Máquinas caras ficam paradas a maior parte do ano. *Hoje:* WhatsApp, vizinhos, locadoras distantes ou compra da máquina. |
| **Segmentos de clientes** | Pequenos e médios produtores que alugam máquinas por safra, e produtores e locadoras com máquinas ociosas. **Primeiros a adotar:** produtores de grãos do Centro-Oeste e do interior de SP e MG que já negociam aluguel por WhatsApp. |
| **Proposta única de valor** | As máquinas da região em um só lugar, com diária, fotos e reserva aprovada pelo dono, sem conflito de datas. |
| **Solução** | 1. **Catálogo com busca** por categoria, cidade e faixa de diária, com fotos e ficha técnica. 2. **Reserva com aprovação**: o dono aprova, as datas ficam bloqueadas e o sistema impede sobreposição. 3. **Pagamento pela plataforma** e contato liberado só depois da aprovação. |
| **Canais** | Grupos de produtores no WhatsApp; cooperativas e sindicatos rurais; revendas de peças e postos de combustível no interior; feiras agropecuárias regionais; indicação entre produtores. |
| **Fontes de receita** | Assinatura **Pro de R$ 39,90/mês** pelo Stripe. Roadmap: taxa de serviço por locação com Stripe Connect. O plano Gratuito é o funil. |
| **Estrutura de custos** | Infraestrutura: hoje a VM da disciplina (custo zero); em produção, uma VM pequena e storage S3 para as fotos. Taxas do Stripe por cobrança. E-mail transacional. Domínio. Desenvolvimento, suporte e divulgação em campo. |
| **Métricas-chave** | Anúncios ativos, ativação de anunciantes, pedidos, aprovação, locações concluídas, assinantes Pro, MRR e churn. |
| **Vantagem injusta** | Densidade local: quanto mais máquinas numa região, mais locatários aparecem, e vice-versa. Histórico de locações concluídas, que constrói confiança entre produtores. Arquitetura pronta (pagamento, auditoria, storage), que deixa o tempo livre para o problema do produtor. |

## 8. Mapa de reaproveitamento

A arquitetura das atividades 1 a 8 foi reaproveitada inteira; só o domínio mudou. O que já está no ar na atividade 10 está marcado com ✅:

| Peça da arquitetura | No GiroRural |
|---|---|
| Recurso principal (antes um catálogo de filmes vindo de uma API externa) | ✅ **Equipamentos, anúncios e reservas** no banco, porque o dado é do produtor (`database/migracao-girorural-issue1.sql`) |
| Busca e filtros do catálogo | ✅ Busca por nome, marca e modelo; filtros por categoria, cidade e diária; ordenação por preço |
| Favoritos e comentários do usuário | Máquinas favoritas e avaliação após a locação (roadmap) |
| Microsserviço de login (`auth-service`) | ✅ Conta de locatário e de proprietário: cadastro, login, JWT em cookie |
| RBAC (`usuario` / `admin`) | ✅ `LOCATARIO`, `PROPRIETARIO` e `ADMIN`; o locatário vira proprietário pelo modo anunciante |
| Esqueci minha senha + e-mail transacional | ✅ Recuperação de senha por link de uso único; aviso de "pedido aprovado" por e-mail (roadmap) |
| Auditoria (`log-service` + Redis Streams) | ✅ `ANUNCIO_CRIADO`, `RESERVA_SOLICITADA`, `RESERVA_APROVADA`, `LOCACAO_PAGA`, `ACAO_NEGADA` e outros |
| Upload em object storage (MinIO) | ✅ **Fotos do anúncio** (até 12) e foto de perfil, regravadas no servidor e sem EXIF |
| Plano pago (Stripe: checkout, webhook assinado) | ✅ **Pro** para anunciantes (20 anúncios) e ✅ **pagamento da locação** no checkout de teste |
| Perfil do usuário | ✅ Perfil com cidade, telefone e apresentação; perfil público do proprietário sem dados privados |
| Painel de admin | ✅ Indicadores, moderação de anúncios, reservas, usuários e auditoria |
| Swagger / OpenAPI | ✅ API documentada em `/apidocs/` |
| CI/CD (GitHub Actions + GHCR + Portainer) | ✅ Imagens `girorural-*` publicadas por commit (`sha-…`) |
| Observabilidade (`/health`, `/metrics`) | ✅ Saúde da api, do auth-service, do log-service e do MinIO |

**Infraestrutura:** a mesma. Mesma stack no Portainer, mesmos serviços, mesmo subdomínio.

## 9. Privacidade (LGPD)

O GiroRural trata dados pessoais de produtores rurais: nome, e-mail, telefone e cidade. Por isso, desde o plano:

- **Mínimo de dado:** só o necessário para alugar, ou seja, nome, contato e cidade. Nada de CPF ou documentos. Os dados do cartão ficam no Stripe e nunca passam pelo GiroRural.
- **Contato só depois do acordo:** telefone e e-mail de cada parte só aparecem depois que o dono aprova a reserva. O perfil público mostra apenas o nome, a cidade e a apresentação.
- **Quem vê:** cada reserva só é visível para as duas partes envolvidas (e o admin, para moderação). A checagem é no backend, pelo JWT; recurso de outra pessoa responde 404.
- **Fotos:** ficam em bucket privado, passam pela API e são regravadas sem metadados (EXIF), o que remove a localização GPS que o celular grava na foto.
- **Rastro:** criação de anúncio, aprovação, pagamento e moderação ficam no log de auditoria, que só o admin consulta.
- **Direito de sair:** o usuário pode desativar os anúncios a qualquer momento. A exclusão da conta e dos dados pessoais é feita pelo admin a pedido do titular.

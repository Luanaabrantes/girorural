# GiroRural

Aluguel de máquinas e implementos entre produtores rurais.

> Etapa 1 — proposta e planejamento para revisão. Origem: catalogo-filmes, main em 9c024a04b04513ac85ffecb0f6ffa99ae1c818af. Histórico espelhado e verificado: 70 commits, 10 branches, nenhuma tag. Hipóteses comerciais ainda não validadas.

## 2. Dor

Hipótese: pequenos produtores de uma cidade e arredores precisam de implementos em períodos específicos, mas encontram dificuldade para localizar equipamentos disponíveis e combinar condições. Isso pode gerar atrasos e esforço de negociação. Hoje podem recorrer a contatos pessoais, grupos de mensagens e locadoras locais. A frequência e o impacto dessa dor precisam ser validados com produtores da região piloto, ainda indefinida.

## 3. Persona ilustrativa

José, produtor fictício de uma pequena propriedade, precisa de um implemento por alguns dias e consulta vizinhos por telefone. Quer conhecer a diária, a cidade, as condições de retirada e a disponibilidade antes de solicitar uma reserva. Esta persona é ilustrativa; não resulta de entrevista.

## 4. Concorrentes ou alternativas

Alternativas a investigar no piloto, sem comparação de preços ou participação de mercado:

| Alternativa | Como pode atender à necessidade | Hipótese a validar |
| --- | --- | --- |
| Grupos de WhatsApp e contatos pessoais | Aproximar produtores para negociar diretamente | Dificuldade de consultar disponibilidade e histórico |
| Locadoras locais de equipamentos agrícolas | Consultar oferta e condições com uma empresa | Cobertura de implementos e alcance na cidade |
| Cooperativas e associações de produtores | Intermediar contatos ou compartilhamento de equipamentos | Existência de oferta e regras de acesso no piloto |

## 5. Proposta de valor

Reunir anúncios de implementos próximos com diária, condições e solicitações por período, permitindo ao proprietário controlar reservas e ao interessado encontrar uma opção local. A diferenciação e a adesão são hipóteses a validar.

## 6. Modelo de receita com Stripe

O aluguel será negociado e pago diretamente entre os envolvidos. O Stripe cobrará somente a assinatura de uso da plataforma.

Hipóteses de planos: Free com até 2 anúncios ativos; Pro por R$ 39,90/mês, até 20 anúncios ativos e relatório de locações. Preço, limites e disposição a pagar ainda serão validados. Esta etapa não configura cobranças reais. A integração herdada é de teste e valida preço fixo de R$ 9,90; planos e limites GiroRural exigem adaptação futura.

## 7. Métricas de sucesso

Metas propostas para os primeiros 60 dias de um piloto futuro; não são resultados obtidos:

| Métrica | Definição | Meta hipotética |
| --- | --- | --- |
| Oferta ativa | Anúncios ativos de implementos na região piloto | 20 |
| Ativação de anunciantes | Contas que publicam anúncio / contas cadastradas com intenção de anunciar | 40% |
| Conversão em solicitação | Usuários que solicitam reserva / usuários que visualizam anúncio, no período | 15% |
| Conclusão | Reservas concluídas / reservas confirmadas com término no período | 70% |
| Conflitos confirmados | Pares de reservas confirmadas sobrepostas do mesmo equipamento | 0 |
| Interesse no Pro | Anunciantes que declaram interesse / anunciantes consultados, registrando tamanho da amostra | 20% |

Definir eventos, consentimentos e método de coleta antes do piloto. Não há linha de base disponível.

## 8. Lean Canvas

| Bloco | Hipóteses a validar |
| --- | --- |
| Problema | Encontrar implementos próximos, consultar períodos e organizar acordos |
| Segmentos de clientes | Pequenos produtores de uma cidade e arredores; proprietários com implementos disponíveis |
| Proposta única de valor | Implementos próximos com condições claras e reservas organizadas |
| Solução | Anúncios, busca local e solicitações com aprovação e bloqueio de conflitos |
| Canais | Associações, cooperativas, indicação e grupos locais, a validar |
| Fontes de receita | Assinatura Pro via Stripe; sem intermediação do pagamento do aluguel |
| Estrutura de custos | Hospedagem, armazenamento, operação, suporte e processamento da assinatura; valores não estimados |
| Métricas-chave | Oferta ativa, ativação, solicitações, conclusão, conflitos e interesse no Pro |
| Vantagem injusta | Ainda não demonstrada; hipótese de construir rede de confiança e densidade local |

## Mapa de reaproveitamento

Inspeção estática da branch main da origem; não comprova o estado dos serviços publicados. Detalhes em [inspeção da arquitetura](docs/inspecao-arquitetura.md).

| Área | O que existe no código | Reaproveitar / desenvolver |
| --- | --- | --- |
| Catálogo / TMDB | Express e frontend HTML/CSS/JS; src/filmes.js consulta pessoa e créditos de Tom Hanks, sem persistir filmes | Reaproveitar organização de rotas e interface; criar catálogo próprio de equipamentos sem remover filmes nesta etapa |
| Login / RBAC | auth-service, JWT de 8h, cookie HttpOnly, bcrypt, recuperação SMTP, papéis usuario/admin consultados no banco | Reaproveitar identidade; definir autorização por equipamento e reserva; não há modelo de organizações/tenants |
| Logs / Redis | log-service com Redis Stream auditoria, leitura administrativa e AOF | Ampliar eventos de negócio; Redis não implementa disponibilidade ou bloqueio de reservas |
| Upload / MinIO | Fotos de perfil, Multer e Sharp, validação de formato e 5 MB, UUID, objetos no prefixo perfis | Reaproveitar processamento; criar vínculo e regras de fotos de anúncios, sem copiar política pública indiscriminadamente |
| Assinatura / Stripe | Checkout de teste, webhook assinado antes do parser JSON, transações, deduplicação e período pago | Adaptar preço fixo de R$ 9,90, benefícios e limites Free/Pro; não há limites de anúncios ou relatório de locações |
| MariaDB | mysql2; usuários, favoritos, comentários, perfis, recuperação e assinatura; banco externo ao Compose | Criar modelo de equipamentos e reservas e proteção transacional de conflitos em entrega posterior |
| Extras existentes | OpenAPI, health/liveness, métricas Prometheus, painel admin, testes Node e CI/CD de imagens | Preservar; atualizar documentação e testes por pequena entrega |

## Escopo proposto do MVP

Cadastro e login; anúncios de implementos com fotos, categoria, cidade, diária e condições; busca e filtros; solicitação por período; aprovação, recusa, cancelamento e conclusão; prevenção de sobreposição de reservas confirmadas; painel e histórico; limites Free/Pro e assinatura da plataforma. A região piloto será definida. Não inclui pagamento do aluguel pela plataforma nem deploy nesta entrega.

## Estado da entrega

O repositório GiroRural está criado e publicado. Os 70 commits históricos e as 10 branches foram preservados, conforme comparação de SHAs e verificação de integridade. As [sete issues](https://github.com/Luanaabrantes/girorural/issues) estão publicadas. A etapa 1 está concluída para revisão; a etapa 2 ainda não foi iniciada. Anúncios e reservas ainda não foram implementados. Nenhum deploy foi realizado nesta etapa. O GitHub Actions permanece desativado no GiroRural.

## Planejamento e referência

Consulte [o plano de implementação](docs/plano-implementacao.md) e [a inspeção da arquitetura](docs/inspecao-arquitetura.md). Referência do professor: [siriani](https://github.com/siriani).

## Etapa 2 — fundação da Issue #1

Esta branch acrescenta a fundação interna de equipamentos, anúncios e reservas,
com migração aditiva e autorização por proprietário. Uma conta equivale a um usuário;
`admin` não ignora a propriedade. Não há novas telas, rotas públicas, CRUD completo,
upload, busca, reservas operacionais ou cobrança. A seção “Estado da entrega” acima
registra a situação histórica ao final da etapa 1.

Consulte [modelo de dados e isolamento](docs/modelo-dados-isolamento.md) para o ER,
estados, política pública/privada, execução local, reversão e resultados dos testes.
Suíte: 97 testes aprovados; integração MariaDB pendente por acesso negado ao Docker
engine. A migração não foi aplicada ao banco externo. Esta entrega aguarda revisão
do PR da [Issue #1](https://github.com/Luanaabrantes/girorural/issues/1), sem merge ou deploy.

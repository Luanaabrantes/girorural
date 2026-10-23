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

'; $s=$s.Substring(0,$start)+$map+"`n"+$s.Substring($end); Set-Content -LiteralPath $p -Value $s -Encoding utf8
@'
# Inspeção da arquitetura e preservação Git

Data: 23/10/2026. Origem confirmada pela usuária: https://github.com/Luanaabrantes/catalogo-filmes. Conta de destino: Luanaabrantes. Branch padrão: main; commit inspecionado: 9c024a04b04513ac85ffecb0f6ffa99ae1c818af.

## Evidências e limites

Clone bare remoto concluído e checkout de trabalho separado criado em work/girorural. git fsck --full terminou sem erros. São 70 commits alcançáveis, 10 branches e nenhuma tag. O destino ainda não foi espelhado; sua preservação não está validada. A consulta inicial a Luanaabrantes/girorural retornou 404. O navegador abriu login ao tentar criar repositório; o conector não oferece ferramenta de criação de repositório.

Nenhum checkout original foi fornecido. Não é possível certificar alterações locais de uma pasta desconhecida. O checkout criado nesta execução estava limpo antes da documentação. Não foram modificados arquivos de trabalho preexistentes. Não foi encontrado AGENTS.md na árvore versionada de main nem na pasta desta conversa.

## Stack e organização

package.json define Node.js, Express 5, mysql2, SDK Stripe, MinIO, Multer, Sharp e prom-client. public contém frontend HTML/CSS/JavaScript; src contém rotas da aplicação e serviços auxiliares. auth-service e log-service têm código e dependências próprios. database contém migrations SQL das atividades, não um framework de migrations. README e DOCUMENTACAO.md descrevem o sistema; docs/openapi e scripts geram e validam OpenAPI.

## Catálogo e identidade

src/filmes.js exige autenticação, consulta search/person e person/:id/movie_credits no TMDB e monta URLs de pôsteres. Não implementa cadastro local de filmes ou equipamentos.

src/middlewareAuth.js consulta auth-service para cada validação. auth-service/src/middlewareAuth.js verifica JWT e consulta id, nome, email e role atuais no MariaDB. auth-service/src/auth.js usa bcrypt, JWT de oito horas e cadastro público com papel usuario. src/auth.js intermedeia sessão por cookie. Papéis são usuario e admin; Premium é benefício separado, não papel.

Favoritos usam identidade da sessão; exclusão de comentários valida proprietário ou admin. src/perfil.js restringe escrita ao proprietário, mas permite leitura autenticada de perfis de outras contas; fotos têm leitura pública. Portanto, não há isolamento absoluto de todos os dados de usuário nem modelo multiempresa: separar dados públicos e privados será necessário. RBAC administrativo não substitui autorização por recurso do GiroRural.

## Dados, auditoria e arquivos

Compose define catalogo, auth-service, log-service, redis e minio. MariaDB é externo e acessado por catálogo e autenticação. Nenhuma conexão com banco publicado foi feita. Não foram executadas migrations, backup ou mudanças de infraestrutura.

log-service/src/eventos.js protege consulta por admin; gravação POST interna não exige token. Redis armazena auditoria, não cache de catálogo ou calendário de reservas. AOF e volume estão definidos no Compose. Chamadas de auditoria são de melhor esforço; não equivalem a histórico transacional garantido de reservas.

src/fotoPerfil.js limita upload a uma imagem de até 5 MB, decodifica e reencoda JPEG/PNG/WebP com Sharp e usa transação no vínculo com perfil. src/minio.js gera UUID, restringe chaves ao prefixo perfis e configura leitura anônima de objetos desse prefixo. Isso não fornece fotos de anúncios prontas; exige novo vínculo e política explícita.

## Stripe

src/server.js posiciona webhook com corpo bruto antes de express.json. src/premium.js rejeita live, valida preço de teste BRL de 990 centavos/mês, serializa atualização por usuário e usa stripe_eventos para deduplicação. src/premiumPeriodo.js calcula acesso com base em período pago e cancelamento. Há testes para eventos e regras. Ainda faltam planos GiroRural, limite concorrente de anúncios, política de downgrade e relatório. Nenhuma chamada ao Stripe ou cobrança foi realizada nesta execução.

## Testes e CI/CD

npm test usa node --test em test/*.test.js, auth-service/test/*.test.js e log-service/test/consulta.js. Há scripts adicionais de integração, mas eles não integram todos o comando padrão. A contagem de 84 testes do README é relato da entrega anterior; não é resultado desta execução. Não foram instaladas dependências nem executados testes funcionais nesta revisão documental.

.github/workflows/cicd.yml testa, valida OpenAPI e constrói quatro imagens. Publica no push de atividade-extra-cicd e atividade-7-stripe-premium. O namespace GHCR mantém nomes catalogo-filmes e a primeira dessas branches também atualiza latest. Não há deploy automático nesse workflow. Antes de espelhar, desativar Actions no destino vazio para impedir publicação involuntária das imagens antigas. Não modificar o workflow ou as referências históricas para contornar isso nesta etapa. Reavaliar CI/CD do novo repositório em entrega própria.

## Preservação do histórico

O arquivo refs-origem.txt registra SHAs e nomes das 10 branches; commits-origem.txt registra os 70 commits alcançáveis. Nenhuma tag foi encontrada. O clone bare mantém a origem remota. Antes do espelhamento, confirmar que a origem não mudou e que o destino é novo e não tem referências; usar push --mirror somente nesse destino. Depois, clonar o destino e comparar referências por SHA e o conjunto de commits, além de fsck. Após commits documentais, cada ponta original deve permanecer ancestral da branch correspondente. Não declarar preservação no destino antes dessas verificações.

## Pendências da etapa 1

Criar ou obter acesso ao destino público vazio; impedir execução das publicações herdadas durante o espelhamento; espelhar e comparar histórico; publicar documentação e sete issues; acrescentar somente a linha de redirecionamento no README antigo em checkout separado, respeitando proteções; verificar commit e push. A etapa 2 não foi iniciada.

## Escopo proposto do MVP

Cadastro e login; anúncios de implementos com fotos, categoria, cidade, diária e condições; busca e filtros; solicitação por período; aprovação, recusa, cancelamento e conclusão; prevenção de sobreposição de reservas confirmadas; painel e histórico; limites Free/Pro e assinatura da plataforma. A região piloto será definida. Não inclui pagamento do aluguel pela plataforma nem deploy nesta entrega.

## Planejamento e referência

Consulte [o plano de implementação](docs/plano-implementacao.md). Referência do professor: [siriani](https://github.com/siriani).

# Plano de implementação — GiroRural

Planejamento da etapa 1 em 23/10/2026. Issues #1 a #7 publicadas em https://github.com/Luanaabrantes/girorural/issues. Sequência adaptada ao Express, auth-service, log-service e MariaDB existentes. Não autoriza iniciar a etapa 2.

## Situação da inspeção

Origem identificada e inspecionada: Luanaabrantes/catalogo-filmes. Consulte [a inspeção da arquitetura](inspecao-arquitetura.md) para evidências, limitações e estado Git. O espelhamento foi verificado em clone independente: 70 commits e 10 branches idênticos por SHA, sem tags e fsck sem erros. Destino público criado com Actions desativado para impedir publicação de imagens herdadas. As issues #1 a #7 estão publicadas. Documentação preparada em checkout separado, limpo antes das alterações. A publicação usa a sessão web devido à restrição de credenciais Git e do conector no novo repositório.

## Conclusão da etapa 1 após acesso

1. Ler AGENTS.md e instruções aplicáveis; inspecionar stack, catálogo/TMDB, autenticação, RBAC, isolamento, MariaDB, Redis, MinIO, Stripe, extras, testes, documentação e CI/CD. Registrar arquivos e evidências sem imprimir valores secretos.
2. Inspecionar estado local sem alterar arquivos. Identificar remotos, branch padrão, branches e tags. Trabalhar em pastas separadas.
3. Confirmar a URL exata da origem e o destino Luanaabrantes/girorural antes de espelhar. Verificar visibilidade e permissões; nunca inferir que 404 significa destino vazio.
4. Desativar Actions no destino vazio antes do push: as branches históricas podem publicar nas imagens catalogo-filmes e atualizar latest. Se o destino não existir, criar repositório público sem README, licença ou gitignore. Confirmar ausência de referências. Fazer git clone --bare da origem e git push --mirror exclusivamente para esse destino novo e vazio. Se houver outro trabalho, parar e explicar.
5. Se já preparado, comparar referências e ancestralidade para comprovar a origem antes de utilizá-lo. Não espelhar por cima.
6. Antes das alterações documentais, comparar refs/heads e refs/tags por nome e SHA; comparar o conjunto completo de commits alcançáveis, com git rev-list --all ordenado, na origem e no destino. Executar git fsck --full. Documentar o tratamento de refs especiais do provedor; não declarar sucesso se faltarem branches ou tags. Registrar evidências sem credenciais.
7. Clonar o GiroRural em outra pasta, revisar e aplicar o README e este plano com base na inspeção. Publicar as sete issues abaixo, ligando dependências por número real.
8. Em checkout separado da origem, acrescentar somente uma linha no topo do README apontando para a URL validada do novo projeto. Verificar que o conteúdo restante foi preservado. Respeitar proteções e abrir PR se necessário.
9. Revisar links, diff e git status; adicionar somente arquivos desta etapa explicitamente. Commit e push; verificar SHAs remotos e ancestralidade do histórico original após os novos commits documentais. Parar para revisão da usuária.

Não publicar a issue final de entrega ao professor. Não alterar código funcional, migrations, serviços, stack, domínio, Portainer, banco ou cobranças reais. Não fazer deploy.

## Issues publicadas

### [1](https://github.com/Luanaabrantes/girorural/issues/1). Modelo de dados e isolamento entre contas

Objetivo: definir equipamentos, anúncios e reservas integrados às identidades existentes, com autorização por proprietário.
Dependências: etapa 1 revisada. Reusar auth-service e usuarios.id; manter usuario/admin separados de plano. Definir primeiro se conta equivale a um usuário no piloto; não adicionar organizações sem necessidade.
Critérios de aceite: relações e estados documentados; consultas e mutações validam identidade no servidor; conta A não altera nem acessa dados privados de B; dados públicos de anúncios têm exposição definida; migrations reversíveis compatíveis com o projeto.
Verificação: testes de integração com duas contas, acesso anônimo e IDs de outra conta; validação de migration em banco descartável. Nenhuma migration deve ser criada na etapa 1.

### [2](https://github.com/Luanaabrantes/girorural/issues/2). Cadastro de equipamentos e anúncios

Objetivo: criar, editar, ativar e desativar anúncios com categoria, cidade, diária e condições.
Dependências: issue 1.
Critérios de aceite: validações de campos e valores; autoria obrigatória; edição e desativação restritas ao proprietário; catálogo de filmes preservado até decisão explícita sobre migração.
Verificação: fluxos válidos e inválidos, edição entre contas e persistência após recarregar. Limites comerciais completos serão tratados na issue 7.

### [3](https://github.com/Luanaabrantes/girorural/issues/3). Fotos e arquivos

Objetivo: associar fotos a anúncios usando a infraestrutura que for confirmada na inspeção.
Dependências: issues 1 e 2. Reusar src/fotoPerfil.js e src/minio.js como referência, criando prefixo e vínculo de anúncios próprios.
Critérios de aceite: validar tipo real, tamanho e quantidade; chaves de objetos não colidem; upload e exclusão exigem autorização; falhas não deixam referências inválidas; política de leitura pública ou assinada definida; credenciais não chegam ao cliente.
Verificação: upload válido, arquivo inválido, acesso entre contas, exclusão e indisponibilidade simulada do armazenamento.

### [4](https://github.com/Luanaabrantes/girorural/issues/4). Busca e filtros

Objetivo: localizar anúncios ativos por categoria e cidade, com paginação.
Dependências: issue 2; dados de cidades e categorias definidos.
Critérios de aceite: combinar filtros; não expor anúncios inativos; estado vazio claro; ordenação estável; se houver cache, atualização invalida resultados afetados.
Verificação: conjunto controlado de anúncios em duas cidades e categorias, filtros combinados, páginas sem duplicação e desativação refletida na busca.

### [5](https://github.com/Luanaabrantes/girorural/issues/5). Reservas e controle de conflitos

Objetivo: solicitar, aprovar, recusar, cancelar e concluir reservas sem sobreposição confirmada.
Dependências: issues 1 e 2; semântica de período aprovada.
Critérios de aceite: definir datas inclusivas ou exclusivas e fuso; validar início e fim; transições e atores autorizados; aprovação atômica em transação com bloqueio adequado ao banco encontrado; duas aprovações concorrentes sobrepostas produzem no máximo uma confirmação; cancelamento libera período; repetição da ação não duplica efeitos.
Verificação: testes de integração no banco efetivamente usado, incluindo concorrência real, períodos iguais, contidos, adjacentes e cancelados; tentativas entre contas. Redis não deve ser a única garantia de integridade.

### [6](https://github.com/Luanaabrantes/girorural/issues/6). Painel e histórico

Objetivo: mostrar anúncios próprios, solicitações enviadas e recebidas e histórico de reservas.
Dependências: issues 2 e 5.
Critérios de aceite: isolamento de dados privados; filtros por estado; exibição das ações permitidas; histórico preserva eventos relevantes e não expõe segredos; relatório Pro depende da issue 7.
Verificação: duas contas com reservas em diferentes estados; conferir visibilidade, paginação e permissões no servidor, inclusive acessando diretamente as rotas.

### [7](https://github.com/Luanaabrantes/girorural/issues/7). Assinatura e limites dos planos com Stripe

Objetivo: cobrar assinatura da plataforma e aplicar limites Free/Pro no servidor.
Dependências: issues 1, 2 e 6; adaptação de src/premium.js e src/premiumPeriodo.js; validação comercial das hipóteses de preço e limites.
Critérios de aceite: Free até 2 anúncios ativos; Pro até 20 e relatório; atualização confiável por webhook com assinatura verificada, idempotência e tratamento de eventos fora de ordem; concorrência não ultrapassa limite; downgrade e inadimplência têm política explícita sem apagar anúncios silenciosamente; pagamento de aluguel permanece direto entre produtores.
Verificação: ambiente de testes Stripe, eventos duplicados e fora de ordem, assinatura cancelada ou inadimplente, downgrade acima do limite e ativações concorrentes. Sem cobranças reais nesta etapa.

## Próxima entrega recomendada

Após revisão da etapa 1: somente issue 1, ajustada à arquitetura encontrada. Escopo: modelo de domínio, regras de autorização e isolamento, migrations necessárias e testes de integração entre contas. Excluir telas de anúncios, upload, busca, reservas operacionais, Stripe e deploy dessa entrega.

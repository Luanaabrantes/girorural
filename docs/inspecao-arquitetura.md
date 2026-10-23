# Inspeção de arquitetura — etapa 1

Inspeção estática de Luanaabrantes/catalogo-filmes em 23/10/2026. Main: 9c024a04b04513ac85ffecb0f6ffa99ae1c818af. Não foram acessados serviços publicados, banco, Stripe ou Portainer.

## Stack e evidências

- package.json: Node.js, Express 5, mysql2, MinIO, Multer, Sharp, Stripe e prom-client. public contém HTML/CSS/JavaScript; src contém rotas; auth-service e log-service têm dependências próprias.
- src/filmes.js: consulta pessoa e créditos de Tom Hanks na TMDB; sessão obrigatória; filmes não persistidos. Não existem equipamentos ou reservas.
- auth-service/src/auth.js e middlewareAuth.js: bcrypt, JWT de 8 horas, cadastro com papel usuario, validação do papel atual no banco. src/auth.js usa cookie HttpOnly. Papéis usuario/admin são distintos do benefício Premium.
- src/favoritos.js e comentarios.js usam identidade autenticada; exclusão de comentário permite proprietário ou admin. src/perfil.js restringe escrita ao proprietário, mas permite leitura autenticada de outros perfis. Fotos são públicas. Não existe isolamento multiempresa ou organização; definir dados públicos e privados do novo domínio.
- docker-compose.yml: catalogo, auth-service, log-service, redis e minio; MariaDB externo acessado por catálogo e auth. Não foram executadas migrations.
- log-service/src/eventos.js: consulta protegida por admin; POST interno de gravação sem token. Redis Stream auditoria com AOF e volume; não há calendário ou bloqueio de reservas. Auditoria de melhor esforço não equivale a histórico transacional garantido.
- src/fotoPerfil.js: imagem até 5 MB, validação e reencodificação Sharp, vínculo transacional; src/minio.js usa UUID e prefixo perfis com leitura anônima. Requer adaptação para múltiplas fotos de anúncios e autorização específica.
- src/server.js, premium.js e premiumPeriodo.js: webhook com corpo bruto e assinatura, transação, deduplicação e período pago; somente teste e preço fixo de 990 centavos/mês. Faltam limites Free/Pro e relatório de locações.
- Extras: OpenAPI, health/liveness, métricas Prometheus, recuperação SMTP e painel administrativo. database contém migrations SQL incrementais; não foi identificado framework de migrations.

## Testes e CI/CD

npm test executa node --test em test/*.test.js, auth-service/test/*.test.js e log-service/test/consulta.js. Existem scripts adicionais de integração fora do comando padrão. Não foram instaladas dependências nem executados testes funcionais nesta revisão documental; as contagens do README antigo são relatos históricos.

.github/workflows/cicd.yml testa, valida OpenAPI e constrói quatro imagens. Os pushes em atividade-extra-cicd e atividade-7-stripe-premium publicam no GHCR com nomes catalogo-filmes; a primeira também atualiza latest. Não há deploy automático nesse workflow. Actions foi desativado no destino antes do espelhamento para evitar publicação involuntária e permanece desativado. As referências históricas foram preservadas.

## Git e preservação

Clone bare remoto concluído; git fsck --full sem erros. Encontrados 70 commits alcançáveis, 10 branches e nenhuma tag. refs-origem.txt e commits-origem.txt registram o inventário. O espelhamento foi concluído pela usuária e verificado por clone bare independente: 70 commits e 10 branches coincidem por SHA; nenhuma tag; git fsck --full sem erros. A comparação ocorreu antes das alterações documentais. Os inventários registram a base histórica preservada.

Checkout separado work/girorural criado a partir da cópia local; estava limpo antes das alterações documentais. Origin desse checkout aponta para o GiroRural publicado, evitando push acidental para o projeto antigo. Não foi fornecido checkout preexistente da usuária: não é possível certificar alterações locais de uma pasta desconhecida. Nenhuma alteração local preexistente de terceiros foi modificada; as mudanças versionadas ficaram restritas aos documentos autorizados. Não há AGENTS.md na árvore versionada de main ou na pasta da conversa.

## Publicação e limites

Destino público: https://github.com/Luanaabrantes/girorural. Actions desativado antes do espelhamento. Issues #1 a #7 publicadas e verificadas pelo navegador. A sessão web foi usada para publicar a documentação devido à indisponibilidade das credenciais Git no ambiente e erro 403 do conector para escrita no novo repositório. Nenhuma credencial foi exibida ou salva em arquivo.

Alterações autorizadas: README do GiroRural, plano, este relatório e inventários de referências/commits. Na origem, uma única linha de redirecionamento foi preparada em checkout separado e submetida no [PR #7](https://github.com/Luanaabrantes/catalogo-filmes/pull/7), com uma adição, nenhuma remoção e o restante do README idêntico byte a byte à base. O PR foi integrado na main em 23/10/2026, com merge e97feaaa1e09cf0983082f462b25b10b2f7a9894; a linha publicada e a preservação do restante do README foram verificadas. Os dois checks verificar passaram; os jobs publicar foram ignorados. Não há mudança funcional, migration, deploy, alteração de banco, serviços ou Stripe. A etapa 2 aguarda revisão e instrução explícita.

A etapa 1 está concluída para revisão documental. A etapa 2 não foi iniciada; anúncios e reservas ainda não foram implementados. Os inventários [refs-origem.txt](refs-origem.txt) e [commits-origem.txt](commits-origem.txt) registram os 70 commits históricos e as 10 branches antes das entregas documentais; o total atual de commits cresce com essas entregas. Nenhum deploy foi realizado nesta etapa.

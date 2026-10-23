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

.github/workflows/cicd.yml testa, valida OpenAPI e constrói quatro imagens. Os pushes em atividade-extra-cicd e atividade-7-stripe-premium publicam no GHCR com nomes catalogo-filmes; a primeira também atualiza latest. Não há deploy automático nesse workflow. Desativar Actions no destino vazio antes do espelhamento para evitar publicação involuntária. Não alterar referências históricas para contornar isso.

## Git e preservação

Clone bare remoto concluído; git fsck --full sem erros. Encontrados 70 commits alcançáveis, 10 branches e nenhuma tag. refs-origem.txt e commits-origem.txt registram o inventário. O destino não foi espelhado: não há comprovação de preservação no destino ainda.

Checkout separado work/girorural criado a partir da cópia local; estava limpo antes das alterações documentais. Origin desse checkout aponta para o destino proposto, evitando push acidental para o projeto antigo. Não foi fornecido checkout preexistente da usuária: não é possível certificar alterações locais de uma pasta desconhecida. Nenhum arquivo preexistente foi modificado. Não há AGENTS.md na árvore versionada de main ou na pasta da conversa.

## Bloqueio e próximos passos

A conta foi confirmada como Luanaabrantes. Consulta a girorural retornou 404, sem distinguir ausência de falta de acesso. Conector não oferece criação de repositório; navegador abriu tela de login. Aguardando sessão da usuária ou repositório público vazio com Actions desativado.

Após acesso: confirmar origem e destino vazio, espelhar exclusivamente nele, comparar todos os commits e SHAs de branches/tags e executar fsck no destino; publicar README, plano e sete issues; acrescentar uma única linha no README antigo em checkout separado, respeitando proteções; verificar commit e push. Não iniciar etapa 2. Sem deploy ou alteração funcional nesta execução.

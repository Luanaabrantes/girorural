# Evidências obrigatórias — Atividade 10

Capturar as sete telas reais, sem fabricar respostas ou usar dados de produção. O diretório contém apenas esta instrução até as capturas serem feitas manualmente. Não incluir senha, cookie/token, segredo, e-mail privado, IP sensível ou credenciais de MinIO.

| # | Captura obrigatória | O que deve ficar visível | Como preparar | Estado |
| --- | --- | --- | --- | --- |
| 1 | Landing page pública (`01-landing.png`) | Marca GiroRural, proposta e chamada para explorar anúncios. | Abrir `http://localhost:3000/` enquanto a stack local estiver saudável. | Aguardando captura manual. |
| 2 | Listagem de anúncios (`02-anuncios.png`) | Cards reais da API, distintivo de demonstração e busca/filtros. | Abrir `/anuncios.html`; em desenvolvimento local deve haver 12 demonstrações e o anúncio de QA local. | Aguardando captura manual. |
| 3 | Bloqueio RBAC 403 (`03-rbac-403.png`) | Resposta 403 ao papel sem permissão. | Entrar como LOCATARIO e enviar uma operação reservada a PROPRIETARIO pelo Swagger/Network; ocultar cookie e dados de conta. | Aguardando captura manual. |
| 4 | Isolamento entre usuários (`04-isolamento.png`) | Resposta 404 ao usuário proprietário B tentando alterar recurso privado de A. | Usar duas contas locais de teste distintas e a rota de edição de anúncio/foto; não mostrar tokens. | Aguardando captura manual. |
| 5 | Auditoria (`05-auditoria.png`) | Evento de negócio, ação, horário e recurso no painel ADMIN. | Entrar como ADMIN local e abrir `/admin.html`; ocultar IPs e dados privados se forem exibidos. | Aguardando captura manual. |
| 6 | Objeto no MinIO (`06-minio.png`) | Foto do anúncio de QA servida pela API e status `200 image/png` no Network, sem segredo/chaves de acesso. | Abrir `http://localhost:3000/api/anuncios/15/fotos/1`. O Compose não publica o console MinIO (porta 9001); se a disciplina exigir listagem direta do bucket, combine antes uma inspeção local com cliente S3. | Aguardando captura manual. |
| 7 | Stack original saudável (`07-portainer.png`) | A stack original e os serviços GiroRural saudáveis após o deploy autorizado. | Só será possível após confirmar backup/migrações, publicar imagens e atualizar a stack existente. | Pendente; não houve deploy. |

O teste funcional automatizado/local não substitui essas evidências visuais. A captura 7 não deve ser produzida antes de um deploy real autorizado.

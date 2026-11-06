# Evidências da atividade 10

Prints tirados no site em produção (https://luana-abrantes-isw055.lapps.studio) em 06/11/2026, na versão `cb2ecfd`.

Landing pública com a proposta de valor e o botão de cadastro:

![01-landing](prints/01-landing.jpg)

Catálogo com as máquinas anunciadas e os filtros:

![02-catalogo](prints/02-catalogo.jpg)

Minha garagem da Fazenda Boa Vista, com as solicitações recebidas:

![03a-minha-garagem](prints/03a-minha-garagem.jpg)

Cadastro de máquina (Anunciar máquina, passo 1):

![03b-anunciar-maquina](prints/03b-anunciar-maquina.jpg)

403: o José (locatário) chama `POST /api/anuncios` direto pela API. A API responde 403 "Papel sem permissão para esta operação":

![04-403-locatario-tenta-anunciar](prints/04-403-locatario-tenta-anunciar.jpg)

404: o José abre a reserva #1, que é de outra pessoa. A tela e a API respondem 404 "Reserva não encontrada":

![05-404-reserva-de-outra-pessoa](prints/05-404-reserva-de-outra-pessoa.jpg)

Upload ligado ao registro: foto enviada para o anúncio #34 (vira a foto principal):

![06-upload-fotos-anuncio](prints/06-upload-fotos-anuncio.jpg)

Arquivo no object storage: a foto do anúncio #34 é lida pela API no bucket privado do MinIO (`GET /api/anuncios/34/fotos/1`, 200, image/jpeg); o navegador nunca acessa o MinIO direto:

![07-foto-no-minio](prints/07-foto-no-minio.jpg)

Fluxo de locação: o José pede a reserva, a Fazenda aprova e o contato das duas partes é liberado:

![08a-reserva-solicitada-locatario](prints/08a-reserva-solicitada-locatario.jpg)
![08b-reserva-aprovada-proprietario](prints/08b-reserva-aprovada-proprietario.jpg)
![08c-contato-liberado](prints/08c-contato-liberado.jpg)

Eventos de negócio no log-service (painel de admin, aba Auditoria): reserva solicitada, aprovada, equipamento e anúncio criados, fotos enviadas e o `ACAO_NEGADA` de uma ação sem permissão:

![09-auditoria-log-service](prints/09-auditoria-log-service.jpg)

Portainer: os 5 containers da stack `girorural-luana-abrantes` saudáveis, com as imagens `girorural-*:sha-cb2ecfd…`:

![10-portainer-containers](prints/10-portainer-containers.jpg)

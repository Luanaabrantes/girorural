# Arquitetura do GiroRural

Diagrama do estado funcional desta branch. A publicação no servidor da disciplina ainda não foi realizada; a parte do Portainer representa a configuração pretendida pelo template versionado, não uma leitura da stack viva.

```mermaid
flowchart LR
  Pessoa[Produtor ou locatário] -->|HTTPS no subdomínio existente| Proxy[Proxy reverso existente]
  Proxy -->|porta do host 8216 → container 3000| API[ girorural-api<br/>Express, páginas públicas e API ]

  API -->|JWT e papel atual| Auth[auth-service<br/>cadastro e sessão]
  API -->|dados do domínio| DB[(MariaDB externo<br/>usuários, perfis, equipamentos,<br/>anúncios e reservas)]
  Auth --> DB
  API -->|fotos de perfil e anúncios| MinIO[(MinIO<br/>objetos persistentes)]
  API -->|eventos do domínio| Logs[log-service]
  Auth -->|eventos de autenticação| Logs
  Logs -->|Redis Streams| Redis[(Redis<br/>auditoria persistente)]
  API -.->|plano Pro opcional| Stripe[Stripe Checkout e webhook<br/>chaves de teste/dev]

  subgraph Stack_existente_no_Portainer[Stack existente no Portainer — não atualizada]
    API
    Auth
    Logs
    MinIO
    Redis
  end
```

## Observações operacionais

- O navegador acessa somente o host público/API. Auth-service, log-service, MinIO e Redis são serviços internos à rede da stack.
- A API lê e grava metadados no MariaDB. O binário das imagens fica no MinIO; o Redis Stream armazena eventos de auditoria.
- O arquivo [`../docker-compose.portainer.yml`](../docker-compose.portainer.yml) aponta para o MariaDB externo e mantém a chave de rede `catalogo-network` do projeto anterior para compatibilidade. A associação à rede e o proxy reverso precisam ser conferidos na stack viva antes do redeploy.
- `docker-compose.local-dev.yml` complementa a stack local com MariaDB isolado e bootstrap. Os dados locais e volumes não são parte do histórico Git.
- Limites de memória, repositório/branch configurados no Portainer, credenciais GHCR e o estado real do subdomínio não estão representados pelo Compose e não foram inspecionados.

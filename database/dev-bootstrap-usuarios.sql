-- DDL mínimo e exclusivo do MariaDB local girorural_dev_local.
-- Não é o DDL de produção e não deve ser aplicado em bases existentes.
CREATE TABLE IF NOT EXISTS usuarios (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'usuario',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

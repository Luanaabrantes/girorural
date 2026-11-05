-- Compatível com MySQL 8 e MariaDB: colunas e índices são criados só se ainda não existirem.
-- Locação com pagamento em modo de teste. Migração aditiva e reexecutável.
-- Não altera o status, as datas ou o histórico das reservas existentes.
-- Novas locações usam início inclusivo e fim exclusivo (fim é o dia da devolução).
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reservas' AND COLUMN_NAME='diarias'), 'SELECT 1',
  'ALTER TABLE reservas ADD COLUMN diarias SMALLINT UNSIGNED NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reservas' AND COLUMN_NAME='valor_total'), 'SELECT 1',
  'ALTER TABLE reservas ADD COLUMN valor_total DECIMAL(12,2) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reservas' AND COLUMN_NAME='moeda'), 'SELECT 1',
  'ALTER TABLE reservas ADD COLUMN moeda CHAR(3) NOT NULL DEFAULT ''BRL''');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reservas' AND COLUMN_NAME='aprovacao_expira_em'), 'SELECT 1',
  'ALTER TABLE reservas ADD COLUMN aprovacao_expira_em DATETIME NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

CREATE TABLE IF NOT EXISTS locacao_pagamentos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reserva_id INT NOT NULL,
  stripe_checkout_id VARCHAR(255) NULL UNIQUE,
  stripe_payment_intent_id VARCHAR(255) NULL UNIQUE,
  valor_total DECIMAL(12,2) NOT NULL,
  moeda CHAR(3) NOT NULL DEFAULT 'BRL',
  status ENUM('criando','checkout_aberto','pendente','pago','falho','expirado') NOT NULL DEFAULT 'criando',
  checkout_expira_em DATETIME NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_locacao_pagamento_reserva FOREIGN KEY (reserva_id)
    REFERENCES reservas(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  INDEX idx_locacao_pagamento_reserva (reserva_id, id),
  INDEX idx_locacao_pagamento_status_expira (status, checkout_expira_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stripe_locacao_eventos (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL,
  processado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

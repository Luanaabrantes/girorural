-- Locação com pagamento em modo de teste. Migração aditiva e reexecutável.
-- Não altera o status, as datas ou o histórico das reservas existentes.
-- Novas locações usam início inclusivo e fim exclusivo (fim é o dia da devolução).
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS diarias SMALLINT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS valor_total DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS moeda CHAR(3) NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS aprovacao_expira_em DATETIME NULL;

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

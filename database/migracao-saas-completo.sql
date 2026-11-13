-- SaaS completo (planos, limites e assinatura Stripe). Reúne as migrations da atividade 7
-- (premium_assinaturas, stripe_eventos e colunas do período pago) num arquivo só, aditivo e reexecutável.
-- Rode uma vez no banco da disciplina, com backup antes. Se a atividade 7 já foi aplicada, nada muda.

CREATE TABLE IF NOT EXISTS premium_assinaturas (
    usuario_id INT NOT NULL PRIMARY KEY,
    premium BOOLEAN NOT NULL DEFAULT FALSE,
    stripe_customer_id VARCHAR(255) NULL UNIQUE,
    stripe_subscription_id VARCHAR(255) NULL UNIQUE,
    stripe_checkout_id VARCHAR(255) NULL,
    stripe_paid_invoice_id VARCHAR(255) NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'nenhuma',
    CONSTRAINT fk_premium_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Somente identificação do evento; nenhum payload ou dado de cartão.
CREATE TABLE IF NOT EXISTS stripe_eventos (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    processado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='premium_assinaturas' AND COLUMN_NAME='stripe_price_id'), 'SELECT 1',
  'ALTER TABLE premium_assinaturas ADD COLUMN stripe_price_id VARCHAR(255) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='premium_assinaturas' AND COLUMN_NAME='paid_period_start'), 'SELECT 1',
  'ALTER TABLE premium_assinaturas ADD COLUMN paid_period_start BIGINT UNSIGNED NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='premium_assinaturas' AND COLUMN_NAME='paid_period_end'), 'SELECT 1',
  'ALTER TABLE premium_assinaturas ADD COLUMN paid_period_end BIGINT UNSIGNED NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='premium_assinaturas' AND COLUMN_NAME='cancel_at_period_end'), 'SELECT 1',
  'ALTER TABLE premium_assinaturas ADD COLUMN cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='premium_assinaturas' AND COLUMN_NAME='cancel_at'), 'SELECT 1',
  'ALTER TABLE premium_assinaturas ADD COLUMN cancel_at BIGINT UNSIGNED NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='premium_assinaturas' AND COLUMN_NAME='next_renewal_at'), 'SELECT 1',
  'ALTER TABLE premium_assinaturas ADD COLUMN next_renewal_at BIGINT UNSIGNED NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='premium_assinaturas' AND COLUMN_NAME='payment_problem'), 'SELECT 1',
  'ALTER TABLE premium_assinaturas ADD COLUMN payment_problem BOOLEAN NOT NULL DEFAULT FALSE');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='premium_assinaturas' AND COLUMN_NAME='state_event_created'), 'SELECT 1',
  'ALTER TABLE premium_assinaturas ADD COLUMN state_event_created BIGINT UNSIGNED NOT NULL DEFAULT 0');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

-- Índice para o painel admin listar os últimos eventos do webhook.
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='stripe_eventos' AND INDEX_NAME='idx_stripe_eventos_processado'), 'SELECT 1',
  'CREATE INDEX idx_stripe_eventos_processado ON stripe_eventos (processado_em)');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

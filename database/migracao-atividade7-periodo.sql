-- Compatível com MySQL 8 e MariaDB: colunas são criadas só se ainda não existirem.
-- Complemento aditivo reexecutável. Faça backup atualizado.
-- Sem datas inventadas: assinaturas existentes exigem sincronização.
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

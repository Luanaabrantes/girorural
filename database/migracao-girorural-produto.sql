-- Compatível com MySQL 8 e MariaDB: colunas e índices são criados só se ainda não existirem.
-- GiroRural produto: moderação administrativa, observações e motivos de decisão
-- e registro do aceite do modo anunciante. Aditiva e reexecutável.
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='anuncios' AND COLUMN_NAME='moderacao'), 'SELECT 1',
  'ALTER TABLE anuncios ADD COLUMN moderacao ENUM(''liberado'',''suspenso'') NOT NULL DEFAULT ''liberado''');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='anuncios' AND COLUMN_NAME='moderacao_motivo'), 'SELECT 1',
  'ALTER TABLE anuncios ADD COLUMN moderacao_motivo VARCHAR(500) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='anuncios' AND COLUMN_NAME='moderado_em'), 'SELECT 1',
  'ALTER TABLE anuncios ADD COLUMN moderado_em DATETIME NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reservas' AND COLUMN_NAME='observacao'), 'SELECT 1',
  'ALTER TABLE reservas ADD COLUMN observacao VARCHAR(1000) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reservas' AND COLUMN_NAME='motivo_recusa'), 'SELECT 1',
  'ALTER TABLE reservas ADD COLUMN motivo_recusa VARCHAR(500) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reservas' AND COLUMN_NAME='decidido_em'), 'SELECT 1',
  'ALTER TABLE reservas ADD COLUMN decidido_em DATETIME NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perfis' AND COLUMN_NAME='anunciante_desde'), 'SELECT 1',
  'ALTER TABLE perfis ADD COLUMN anunciante_desde DATETIME NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='anuncios' AND INDEX_NAME='idx_anuncios_moderacao'), 'SELECT 1',
  'CREATE INDEX idx_anuncios_moderacao ON anuncios (moderacao, estado)');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reservas' AND INDEX_NAME='idx_reservas_estado'), 'SELECT 1',
  'CREATE INDEX idx_reservas_estado ON reservas (estado, id)');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

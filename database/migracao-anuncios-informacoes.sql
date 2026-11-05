-- Compatível com MySQL 8 e MariaDB: colunas e índices são criados só se ainda não existirem.
-- Campo livre e opcional para informações úteis específicas de cada categoria.
-- Compatível com equipamentos existentes e reexecução segura em MariaDB.
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='equipamentos' AND COLUMN_NAME='informacoes_adicionais'), 'SELECT 1',
  'ALTER TABLE equipamentos ADD COLUMN informacoes_adicionais TEXT NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

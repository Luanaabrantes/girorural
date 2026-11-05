-- Compatível com MySQL 8 e MariaDB: colunas e índices são criados só se ainda não existirem.
-- Campos incrementais para apresentação e contato privado do usuário.
-- Aplicar somente ao banco local/dev nesta etapa; não altera credenciais nem papéis.
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perfis' AND COLUMN_NAME='nome_exibicao'), 'SELECT 1',
  'ALTER TABLE perfis ADD COLUMN nome_exibicao VARCHAR(100) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perfis' AND COLUMN_NAME='telefone'), 'SELECT 1',
  'ALTER TABLE perfis ADD COLUMN telefone VARCHAR(30) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perfis' AND COLUMN_NAME='cidade'), 'SELECT 1',
  'ALTER TABLE perfis ADD COLUMN cidade VARCHAR(120) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perfis' AND COLUMN_NAME='uf'), 'SELECT 1',
  'ALTER TABLE perfis ADD COLUMN uf CHAR(2) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

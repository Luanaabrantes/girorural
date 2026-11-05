-- Compatível com MySQL 8 e MariaDB: colunas e índices são criados só se ainda não existirem.
-- Extensão aditiva do domínio GiroRural. Pré-requer migracao-girorural-issue1.sql.
-- Seguro para banco local e reexecução. Não altera usuários nem tabelas legadas.
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='equipamentos' AND COLUMN_NAME='marca'), 'SELECT 1',
  'ALTER TABLE equipamentos ADD COLUMN marca VARCHAR(100) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='equipamentos' AND COLUMN_NAME='modelo'), 'SELECT 1',
  'ALTER TABLE equipamentos ADD COLUMN modelo VARCHAR(120) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='equipamentos' AND COLUMN_NAME='ano'), 'SELECT 1',
  'ALTER TABLE equipamentos ADD COLUMN ano SMALLINT UNSIGNED NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='equipamentos' AND COLUMN_NAME='imagem_chave'), 'SELECT 1',
  'ALTER TABLE equipamentos ADD COLUMN imagem_chave VARCHAR(512) NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='anuncios' AND COLUMN_NAME='proprietario_id'), 'SELECT 1',
  'ALTER TABLE anuncios ADD COLUMN proprietario_id INT NULL');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;

-- Backfill a partir da propriedade já persistida do equipamento, sem sobrescrever valores.
UPDATE anuncios a JOIN equipamentos e ON e.id = a.equipamento_id
  SET a.proprietario_id = e.proprietario_id WHERE a.proprietario_id IS NULL;
ALTER TABLE anuncios MODIFY COLUMN proprietario_id INT NOT NULL;

-- Views públicas nunca precisam dos IDs de usuário; a coluna facilita filtros próprios e índices.
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='anuncios' AND INDEX_NAME='idx_anuncio_proprietario_estado'), 'SELECT 1',
  'CREATE INDEX idx_anuncio_proprietario_estado ON anuncios (proprietario_id, estado)');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='anuncios' AND INDEX_NAME='idx_anuncios_publicos'), 'SELECT 1',
  'CREATE INDEX idx_anuncios_publicos ON anuncios (estado, cidade, equipamento_id)');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='equipamentos' AND INDEX_NAME='idx_equipamento_categoria_estado'), 'SELECT 1',
  'CREATE INDEX idx_equipamento_categoria_estado ON equipamentos (categoria, estado)');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;
SET @giro_fk_sql = IF(
  EXISTS (SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='fk_anuncio_proprietario'),
  'SELECT 1',
  'ALTER TABLE anuncios ADD CONSTRAINT fk_anuncio_proprietario FOREIGN KEY (proprietario_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE RESTRICT'
);
PREPARE giro_fk_stmt FROM @giro_fk_sql;
EXECUTE giro_fk_stmt;
DEALLOCATE PREPARE giro_fk_stmt;

-- O papel empresarial é textual na tabela existente. A migração mantém os papéis legados
-- e o auth-service traduz usuario/admin para LOCATARIO/ADMIN na autorização do domínio.

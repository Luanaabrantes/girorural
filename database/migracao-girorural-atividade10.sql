-- Extensão aditiva do domínio GiroRural. Pré-requer migracao-girorural-issue1.sql.
-- Seguro para banco local e reexecução. Não altera usuários nem tabelas legadas.
ALTER TABLE equipamentos
  ADD COLUMN IF NOT EXISTS marca VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS modelo VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS ano SMALLINT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS imagem_chave VARCHAR(512) NULL;

ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS proprietario_id INT NULL;

-- Backfill a partir da propriedade já persistida do equipamento, sem sobrescrever valores.
UPDATE anuncios a JOIN equipamentos e ON e.id = a.equipamento_id
  SET a.proprietario_id = e.proprietario_id WHERE a.proprietario_id IS NULL;
ALTER TABLE anuncios MODIFY COLUMN proprietario_id INT NOT NULL;

-- Views públicas nunca precisam dos IDs de usuário; a coluna facilita filtros próprios e índices.
CREATE INDEX IF NOT EXISTS idx_anuncio_proprietario_estado ON anuncios (proprietario_id, estado);
CREATE INDEX IF NOT EXISTS idx_anuncios_publicos ON anuncios (estado, cidade, equipamento_id);
CREATE INDEX IF NOT EXISTS idx_equipamento_categoria_estado ON equipamentos (categoria, estado);
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

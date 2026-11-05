-- Compatível com MySQL 8 e MariaDB: colunas são criadas só se ainda não existirem.
-- Atividade 3 - Microsserviço de autenticação
-- Alterações necessárias no banco de dados

-- Adiciona o papel do usuário.
-- Novos usuários recebem "usuario" por padrão.
SET @giro_sql = IF(EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND COLUMN_NAME='role'), 'SELECT 1',
  'ALTER TABLE usuarios ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT ''usuario''');
PREPARE giro_stmt FROM @giro_sql; EXECUTE giro_stmt; DEALLOCATE PREPARE giro_stmt;


-- Armazena os tokens utilizados no fluxo de recuperação de senha.
CREATE TABLE IF NOT EXISTS reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(128) NOT NULL UNIQUE,
    usuario_id INT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em TIMESTAMP NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_reset_tokens_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);
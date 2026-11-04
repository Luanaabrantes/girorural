-- Campos incrementais para apresentação e contato privado do usuário.
-- Aplicar somente ao banco local/dev nesta etapa; não altera credenciais nem papéis.
ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS nome_exibicao VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS uf CHAR(2) NULL;

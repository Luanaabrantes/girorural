-- Campo livre e opcional para informações úteis específicas de cada categoria.
-- Compatível com equipamentos existentes e reexecução segura em MariaDB.
ALTER TABLE equipamentos
  ADD COLUMN IF NOT EXISTS informacoes_adicionais TEXT NULL;

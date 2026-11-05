-- GiroRural produto: moderação administrativa, observações e motivos de decisão
-- e registro do aceite do modo anunciante. Aditiva e reexecutável em MariaDB.
ALTER TABLE anuncios
  ADD COLUMN IF NOT EXISTS moderacao ENUM('liberado','suspenso') NOT NULL DEFAULT 'liberado',
  ADD COLUMN IF NOT EXISTS moderacao_motivo VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS moderado_em DATETIME NULL;

ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS observacao VARCHAR(1000) NULL,
  ADD COLUMN IF NOT EXISTS motivo_recusa VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS decidido_em DATETIME NULL;

ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS anunciante_desde DATETIME NULL;

CREATE INDEX IF NOT EXISTS idx_anuncios_moderacao ON anuncios (moderacao, estado);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas (estado, id);

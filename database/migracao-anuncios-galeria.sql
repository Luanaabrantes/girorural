-- Galeria incremental: mantém equipamentos.imagem_chave como imagem principal legada.
CREATE TABLE IF NOT EXISTS anuncio_imagens (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  anuncio_id INT NOT NULL,
  proprietario_id INT NOT NULL,
  chave VARCHAR(512) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_anuncio_imagem_chave (anuncio_id, chave),
  KEY idx_anuncio_imagens_ordem (anuncio_id, id),
  KEY idx_anuncio_imagens_proprietario (proprietario_id),
  CONSTRAINT fk_anuncio_imagem_anuncio FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE CASCADE,
  CONSTRAINT fk_anuncio_imagem_proprietario FOREIGN KEY (proprietario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

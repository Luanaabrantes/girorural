-- Issue #1: fundacao aditiva. Nao executar no banco externo da aplicacao.
-- Precondicao: usuarios.id INT assinado, PK, tabela InnoDB.
-- O DDL original de usuarios nao consta no repositorio. O executor valida
-- este contrato antes de aplicar; nao cria nem altera usuarios.
CREATE TABLE IF NOT EXISTS equipamentos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    proprietario_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    categoria VARCHAR(80) NOT NULL,
    descricao TEXT NULL,
    estado ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT ck_equipamento_nome CHECK (CHAR_LENGTH(TRIM(nome)) > 0),
    CONSTRAINT ck_equipamento_categoria CHECK (CHAR_LENGTH(TRIM(categoria)) > 0),
    CONSTRAINT ck_equipamento_estado CHECK (estado IN ('ativo', 'inativo')),
    CONSTRAINT fk_equipamento_proprietario FOREIGN KEY (proprietario_id)
        REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX idx_equipamento_proprietario (proprietario_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS anuncios (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    equipamento_id INT NOT NULL,
    diaria DECIMAL(10,2) NOT NULL,
    cidade VARCHAR(120) NOT NULL,
    uf CHAR(2) NOT NULL,
    condicoes TEXT NULL,
    estado ENUM('rascunho', 'ativo', 'inativo', 'arquivado') NOT NULL DEFAULT 'rascunho',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_anuncio_equipamento UNIQUE (equipamento_id),
    CONSTRAINT ck_anuncio_diaria CHECK (diaria > 0),
    CONSTRAINT ck_anuncio_cidade CHECK (CHAR_LENGTH(TRIM(cidade)) > 0),
    CONSTRAINT ck_anuncio_estado CHECK (estado IN ('rascunho', 'ativo', 'inativo', 'arquivado')),
    CONSTRAINT ck_anuncio_uf CHECK (BINARY uf IN
        ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
         'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
    CONSTRAINT fk_anuncio_equipamento FOREIGN KEY (equipamento_id)
        REFERENCES equipamentos(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reservas (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    anuncio_id INT NOT NULL,
    solicitante_id INT NOT NULL,
    inicio DATE NOT NULL,
    fim DATE NOT NULL,
    estado ENUM('solicitada', 'confirmada', 'recusada', 'cancelada', 'concluida')
        NOT NULL DEFAULT 'solicitada',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT ck_reserva_periodo CHECK (inicio >= '1000-01-01' AND fim >= inicio),
    CONSTRAINT ck_reserva_estado CHECK (estado IN ('solicitada', 'confirmada', 'recusada', 'cancelada', 'concluida')),
    CONSTRAINT fk_reserva_anuncio FOREIGN KEY (anuncio_id)
        REFERENCES anuncios(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_reserva_solicitante FOREIGN KEY (solicitante_id)
        REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX idx_reserva_solicitante (solicitante_id, id),
    INDEX idx_reserva_anuncio_periodo (anuncio_id, inicio, fim, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- CHECK valida somente o intervalo de cada registro. Sobreposicao e transicoes
-- operacionais, inclusive aprovacao concorrente, pertencem a Issue #5.

-- Catálogo manual, idempotente e exclusivo para desenvolvimento/local.
-- Defina @giro_owner_id como uma conta existente com role PROPRIETARIO antes de executar.
-- O prefixo técnico mantém anúncios sem reserva/edição; a API não o apresenta ao público.
-- Nunca execute este seed em produção e não associe dados reais a este proprietário.

CREATE TEMPORARY TABLE giro_catalogo_seed (
  nome VARCHAR(160) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  marca VARCHAR(100) NOT NULL,
  modelo VARCHAR(120) NOT NULL,
  descricao TEXT NOT NULL,
  diaria DECIMAL(10,2) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  uf CHAR(2) NOT NULL,
  condicoes TEXT NOT NULL,
  PRIMARY KEY (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO giro_catalogo_seed VALUES
('Trator agrícola John Deere 6110J','Tratores','John Deere','6110J','Trator para atividades gerais no campo, apoio ao preparo do solo e transporte interno. Consulte a disponibilidade de acessórios e operador.',585.00,'Ribeirão Preto','SP','Locação por diária. Transporte, combustível e operador devem ser combinados antes do período.'),
('Trator agrícola para uso geral','Tratores','A consultar','Trator agrícola','Trator agrícola para rotinas de campo e apoio a diferentes implementos. Consulte disponibilidade, acessórios e condições de uso.',760.00,'Sertãozinho','SP','Locação por diária. Transporte, combustível e operador devem ser combinados antes do período.'),
('Colheitadeira de grãos','Colheita','A consultar','Colheitadeira de grãos','Equipamento para operação de colheita de grãos. Consulte disponibilidade para a safra, logística de transporte e necessidade de operador.',1480.00,'Campinas','SP','Período, transporte, operador e combustível a combinar com antecedência.'),
('Plantadeira de precisão','Plantio','A consultar','Plantadeira de precisão','Implemento para operações de plantio. Confirme compatibilidade com o trator disponível, condições do terreno e janela de utilização.',690.00,'Ribeirão Preto','SP','Locação por diária. Transporte, trator e regulagem devem ser combinados antes do uso.'),
('Pulverizador agrícola','Pulverização','A consultar','Pulverizador agrícola','Equipamento agrícola para aplicação em campo. Consulte as condições de transporte, operação e preparo antes da locação.',510.00,'Araraquara','SP','Locação por diária. Operador, transporte e insumos não estão incluídos; confirme as condições.'),
('Distribuidor de fertilizantes','Adubação','A consultar','Distribuidor de fertilizantes','Implemento para distribuição de fertilizantes em operações agrícolas. Consulte disponibilidade e compatibilidade com o conjunto trator/implemento.',330.00,'Londrina','PR','Locação por diária. Transporte, trator e insumos devem ser combinados à parte.'),
('Grade aradora','Preparo do solo','A consultar','Grade aradora','Implemento voltado ao preparo do solo. A necessidade de trator e as condições de transporte devem ser confirmadas antes da locação.',245.00,'Cascavel','PR','Locação por diária. Transporte e trator não estão incluídos; confirme as condições.'),
('Subsolador agrícola','Subsolagem','A consultar','Subsolador agrícola','Implemento para operações de preparo profundo do solo. Consulte a configuração disponível e a compatibilidade com o trator da propriedade.',275.00,'Rio Verde','GO','Locação por diária. Transporte, trator e operador devem ser combinados.'),
('Roçadeira agrícola','Roçada','A consultar','Roçadeira agrícola','Equipamento para manutenção de áreas rurais e manejo de vegetação. Confirme o tipo de acoplamento e a disponibilidade antes da retirada.',190.00,'Dourados','MS','Locação por diária. Transporte e trator compatível devem ser combinados.'),
('Carreta agrícola','Transporte agrícola','A consultar','Carreta agrícola','Carreta para apoio ao transporte de materiais e produtos na propriedade. Consulte disponibilidade e condições de retirada.',225.00,'Uberaba','MG','Locação por diária. Veículo trator e logística de retirada a combinar.'),
('Semeadora agrícola','Semeadura','A consultar','Semeadora agrícola','Implemento para operações de semeadura. Consulte compatibilidade com o trator, condições de transporte e disponibilidade no período.',570.00,'Passo Fundo','RS','Locação por diária. Transporte, trator e regulagem devem ser combinados.'),
('Implemento para preparo do solo','Preparo do solo','A consultar','Implemento agrícola','Implemento para apoio ao preparo e manejo do solo. Consulte o implemento disponível e as condições de uso antes da locação.',295.00,'Chapecó','SC','Locação por diária. Transporte e trator compatível devem ser combinados.');

-- Remove apenas uma cópia antiga do trator seed se a versão canônica já existe e não há
-- reservas ou fotos vinculadas. O dono e demais anúncios nunca são afetados.
DELETE a FROM anuncios a
JOIN equipamentos e ON e.id=a.equipamento_id
WHERE a.proprietario_id=@giro_owner_id AND e.proprietario_id=@giro_owner_id
  AND TRIM(REPLACE(e.nome,'DEMO · ',''))='Trator agrícola John Deere 7M 200'
  AND e.descricao LIKE '[DEMO FICTÍCIO]%'
  AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.anuncio_id=a.id)
  AND NOT EXISTS (SELECT 1 FROM anuncio_imagens i WHERE i.anuncio_id=a.id)
  AND EXISTS (SELECT 1 FROM equipamentos e2 WHERE e2.proprietario_id=@giro_owner_id
    AND e2.nome='Trator agrícola para uso geral' AND e2.descricao LIKE '[DEMO FICTÍCIO]%');

DELETE e FROM equipamentos e
WHERE e.proprietario_id=@giro_owner_id
  AND TRIM(REPLACE(e.nome,'DEMO · ',''))='Trator agrícola John Deere 7M 200'
  AND e.descricao LIKE '[DEMO FICTÍCIO]%'
  AND NOT EXISTS (SELECT 1 FROM anuncios a WHERE a.equipamento_id=e.id)
  AND EXISTS (SELECT 1 FROM equipamentos e2 WHERE e2.proprietario_id=@giro_owner_id
    AND e2.nome='Trator agrícola para uso geral' AND e2.descricao LIKE '[DEMO FICTÍCIO]%');

-- Atualiza somente itens reconhecidos pelo marcador técnico e pertencentes à conta indicada.
-- Registros já usados em reservas são preservados para não alterar histórico operacional.
UPDATE equipamentos e
JOIN giro_catalogo_seed d ON d.nome=CASE TRIM(REPLACE(e.nome,'DEMO · ',''))
  WHEN 'Trator agrícola John Deere 7M 200' THEN 'Trator agrícola para uso geral'
  ELSE TRIM(REPLACE(e.nome,'DEMO · ','')) END
SET e.nome=d.nome, e.categoria=d.categoria, e.marca=d.marca, e.modelo=d.modelo,
    e.ano=NULL, e.descricao=CONCAT('[DEMO FICTÍCIO] ',d.descricao), e.estado='ativo'
WHERE e.proprietario_id=@giro_owner_id AND e.descricao LIKE '[DEMO FICTÍCIO]%'
  AND NOT EXISTS (SELECT 1 FROM anuncios a JOIN reservas r ON r.anuncio_id=a.id WHERE a.equipamento_id=e.id);

INSERT INTO equipamentos (proprietario_id,nome,categoria,marca,modelo,ano,descricao,estado)
SELECT u.id,d.nome,d.categoria,d.marca,d.modelo,NULL,CONCAT('[DEMO FICTÍCIO] ',d.descricao),'ativo'
FROM usuarios u CROSS JOIN giro_catalogo_seed d
WHERE u.id=@giro_owner_id AND u.role IN ('PROPRIETARIO','proprietario')
  AND NOT EXISTS (
    SELECT 1 FROM equipamentos e
    WHERE e.proprietario_id=u.id
      AND CASE TRIM(REPLACE(e.nome,'DEMO · ','')) WHEN 'Trator agrícola John Deere 7M 200'
        THEN 'Trator agrícola para uso geral' ELSE TRIM(REPLACE(e.nome,'DEMO · ','')) END=d.nome
      AND e.descricao LIKE '[DEMO FICTÍCIO]%'
  );

UPDATE anuncios a
JOIN equipamentos e ON e.id=a.equipamento_id
JOIN giro_catalogo_seed d ON d.nome=e.nome
SET a.diaria=d.diaria,a.cidade=d.cidade,a.uf=d.uf,a.condicoes=d.condicoes,a.estado='ativo'
WHERE a.proprietario_id=@giro_owner_id AND e.proprietario_id=@giro_owner_id
  AND e.descricao LIKE '[DEMO FICTÍCIO]%'
  AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.anuncio_id=a.id);

INSERT INTO anuncios (equipamento_id,proprietario_id,diaria,cidade,uf,condicoes,estado)
SELECT e.id,e.proprietario_id,d.diaria,d.cidade,d.uf,d.condicoes,'ativo'
FROM equipamentos e JOIN giro_catalogo_seed d ON d.nome=e.nome
WHERE e.proprietario_id=@giro_owner_id AND e.descricao LIKE '[DEMO FICTÍCIO]%'
  AND NOT EXISTS (SELECT 1 FROM anuncios a WHERE a.equipamento_id=e.id);

DROP TEMPORARY TABLE giro_catalogo_seed;

-- Catálogo demonstrativo manual, reexecutável e exclusivo para desenvolvimento.
-- Antes de executar: SET @giro_owner_id = <id de uma conta existente com role PROPRIETARIO>;
-- Não cria/edita usuários e nunca deve ser aplicado automaticamente em produção.
-- Todos os nomes, preços, cidades, disponibilidade e condições marcados abaixo são fictícios.

-- Migra com segurança o único registro do seed antigo, somente se todos os seus dados
-- ainda forem exatamente os valores originais criados para demonstração.
UPDATE equipamentos
SET nome='DEMO · Trator agrícola John Deere 6110J',
    categoria='Tratores', marca='John Deere', modelo='6110J', ano=NULL,
    descricao='[DEMO FICTÍCIO] Dados ilustrativos para demonstração; não representam oferta real nem especificações oficiais.'
WHERE proprietario_id=@giro_owner_id AND nome='Trator demonstrativo'
  AND marca='GiroRural' AND modelo='Demo 75'
  AND descricao='Registro de demonstração local; confirme disponibilidade e condições com o proprietário.'
  AND NOT EXISTS (SELECT 1 FROM anuncios a JOIN reservas r ON r.anuncio_id=a.id WHERE a.equipamento_id=equipamentos.id);

UPDATE anuncios a
JOIN equipamentos e ON e.id=a.equipamento_id
SET a.diaria=585.00, a.cidade='Ribeirão Preto', a.uf='SP',
    a.condicoes='Demonstração fictícia: diária, cidade e disponibilidade são ilustrativas. Este anúncio não aceita reservas.'
WHERE a.proprietario_id=@giro_owner_id AND e.proprietario_id=@giro_owner_id
  AND e.nome='DEMO · Trator agrícola John Deere 6110J'
  AND e.descricao LIKE '[DEMO FICTÍCIO]%'
  AND a.diaria=450.00 AND a.cidade='Ribeirão Preto' AND a.uf='SP'
  AND a.condicoes='Dados de demonstração. Aluguel negociado diretamente entre as partes.'
  AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.anuncio_id=a.id);

INSERT INTO equipamentos (proprietario_id,nome,categoria,marca,modelo,ano,descricao,estado)
SELECT u.id,d.nome,d.categoria,d.marca,d.modelo,NULL,d.descricao,'ativo'
FROM usuarios u
JOIN (
  SELECT 'DEMO · Trator agrícola John Deere 6110J' nome,'Tratores' categoria,'John Deere' marca,'6110J' modelo,
         '[DEMO FICTÍCIO] Dados ilustrativos; não representam oferta real nem especificações oficiais.' descricao
  UNION ALL SELECT 'DEMO · Trator agrícola John Deere 7M 200','Tratores','John Deere','7M 200','[DEMO FICTÍCIO] Dados ilustrativos; não representam oferta real nem especificações oficiais.'
  UNION ALL SELECT 'DEMO · Colheitadeira de grãos','Colheita','Equipamento demonstrativo','Modelo ilustrativo','[DEMO FICTÍCIO] Fabricante, modelo e descrição são genéricos e não representam especificações oficiais.'
  UNION ALL SELECT 'DEMO · Plantadeira de precisão','Plantio','Equipamento demonstrativo','Referência ilustrativa','[DEMO FICTÍCIO] Fabricante, modelo e descrição são genéricos e não representam especificações oficiais.'
  UNION ALL SELECT 'DEMO · Pulverizador agrícola','Pulverização','Equipamento demonstrativo','Referência ilustrativa','[DEMO FICTÍCIO] Fabricante, modelo e descrição são genéricos e não representam especificações oficiais.'
  UNION ALL SELECT 'DEMO · Distribuidor de fertilizantes','Adubação','Equipamento demonstrativo','Referência ilustrativa','[DEMO FICTÍCIO] Fabricante, modelo e descrição são genéricos e não representam especificações oficiais.'
  UNION ALL SELECT 'DEMO · Grade aradora','Preparo do solo','Equipamento demonstrativo','Referência ilustrativa','[DEMO FICTÍCIO] Fabricante, modelo e descrição são genéricos e não representam especificações oficiais.'
  UNION ALL SELECT 'DEMO · Subsolador agrícola','Subsolagem','Equipamento demonstrativo','Referência ilustrativa','[DEMO FICTÍCIO] Fabricante, modelo e descrição são genéricos e não representam especificações oficiais.'
  UNION ALL SELECT 'DEMO · Roçadeira agrícola','Roçada','Equipamento demonstrativo','Referência ilustrativa','[DEMO FICTÍCIO] Fabricante, modelo e descrição são genéricos e não representam especificações oficiais.'
  UNION ALL SELECT 'DEMO · Carreta agrícola','Transporte agrícola','Equipamento demonstrativo','Referência ilustrativa','[DEMO FICTÍCIO] Fabricante, modelo e descrição são genéricos e não representam especificações oficiais.'
  UNION ALL SELECT 'DEMO · Semeadora agrícola','Semeadura','Equipamento demonstrativo','Referência ilustrativa','[DEMO FICTÍCIO] Fabricante, modelo e descrição são genéricos e não representam especificações oficiais.'
  UNION ALL SELECT 'DEMO · Implemento para preparo do solo','Preparo e conservação','Equipamento demonstrativo','Referência ilustrativa','[DEMO FICTÍCIO] Fabricante, modelo e descrição são genéricos e não representam especificações oficiais.'
) d
WHERE u.id=@giro_owner_id AND u.role IN ('PROPRIETARIO','proprietario')
  AND NOT EXISTS (
    SELECT 1 FROM equipamentos e
    WHERE e.proprietario_id=u.id AND e.nome=d.nome AND e.descricao LIKE '[DEMO FICTÍCIO]%'
  );

-- Reaplica os valores canônicos apenas aos anúncios que continuam identificados
-- como demonstração. Anúncios de usuários e registros sem o marcador não são tocados.
UPDATE anuncios a
JOIN equipamentos e ON e.id=a.equipamento_id
JOIN (
  SELECT 'DEMO · Trator agrícola John Deere 6110J' nome,585.00 diaria,'Ribeirão Preto' cidade,'SP' uf
  UNION ALL SELECT 'DEMO · Trator agrícola John Deere 7M 200',760.00,'Sertãozinho','SP'
  UNION ALL SELECT 'DEMO · Colheitadeira de grãos',1480.00,'Campinas','SP'
  UNION ALL SELECT 'DEMO · Plantadeira de precisão',690.00,'Ribeirão Preto','SP'
  UNION ALL SELECT 'DEMO · Pulverizador agrícola',510.00,'Araraquara','SP'
  UNION ALL SELECT 'DEMO · Distribuidor de fertilizantes',330.00,'Londrina','PR'
  UNION ALL SELECT 'DEMO · Grade aradora',245.00,'Cascavel','PR'
  UNION ALL SELECT 'DEMO · Subsolador agrícola',275.00,'Rio Verde','GO'
  UNION ALL SELECT 'DEMO · Roçadeira agrícola',190.00,'Dourados','MS'
  UNION ALL SELECT 'DEMO · Carreta agrícola',225.00,'Uberaba','MG'
  UNION ALL SELECT 'DEMO · Semeadora agrícola',570.00,'Passo Fundo','RS'
  UNION ALL SELECT 'DEMO · Implemento para preparo do solo',295.00,'Chapecó','SC'
) d ON d.nome=e.nome
SET a.diaria=d.diaria,a.cidade=d.cidade,a.uf=d.uf,
    a.condicoes='Demonstração fictícia: diária, cidade e disponibilidade são ilustrativas. Este anúncio não aceita reservas.'
WHERE a.proprietario_id=@giro_owner_id AND e.proprietario_id=@giro_owner_id
  AND e.descricao LIKE '[DEMO FICTÍCIO]%'
  AND a.condicoes LIKE 'Demonstração fictícia:%';

INSERT INTO anuncios (equipamento_id,proprietario_id,diaria,cidade,uf,condicoes,estado)
SELECT e.id,e.proprietario_id,d.diaria,d.cidade,d.uf,
       'Demonstração fictícia: diária, cidade e disponibilidade são ilustrativas. Este anúncio não aceita reservas.','ativo'
FROM equipamentos e
JOIN (
  SELECT 'DEMO · Trator agrícola John Deere 6110J' nome,585.00 diaria,'Ribeirão Preto' cidade,'SP' uf
  UNION ALL SELECT 'DEMO · Trator agrícola John Deere 7M 200',760.00,'Sertãozinho','SP'
  UNION ALL SELECT 'DEMO · Colheitadeira de grãos',1480.00,'Campinas','SP'
  UNION ALL SELECT 'DEMO · Plantadeira de precisão',690.00,'Ribeirão Preto','SP'
  UNION ALL SELECT 'DEMO · Pulverizador agrícola',510.00,'Araraquara','SP'
  UNION ALL SELECT 'DEMO · Distribuidor de fertilizantes',330.00,'Londrina','PR'
  UNION ALL SELECT 'DEMO · Grade aradora',245.00,'Cascavel','PR'
  UNION ALL SELECT 'DEMO · Subsolador agrícola',275.00,'Rio Verde','GO'
  UNION ALL SELECT 'DEMO · Roçadeira agrícola',190.00,'Dourados','MS'
  UNION ALL SELECT 'DEMO · Carreta agrícola',225.00,'Uberaba','MG'
  UNION ALL SELECT 'DEMO · Semeadora agrícola',570.00,'Passo Fundo','RS'
  UNION ALL SELECT 'DEMO · Implemento para preparo do solo',295.00,'Chapecó','SC'
) d ON d.nome=e.nome
WHERE e.proprietario_id=@giro_owner_id AND e.descricao LIKE '[DEMO FICTÍCIO]%'
  AND NOT EXISTS (SELECT 1 FROM anuncios a WHERE a.equipamento_id=e.id);

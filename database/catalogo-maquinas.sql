-- GiroRural · catálogo inicial com 33 máquinas e fotos reais de licença livre (Wikimedia Commons).
-- Créditos de cada foto: public/imagens/catalogo/maquinas/manifest.json e a página /creditos.html.
-- Os anúncios ficam na conta de proprietário informada abaixo, que recebe e aprova as solicitações.
-- Eles não contam no limite de anúncios do plano dessa conta.
-- Pode rodar mais de uma vez: máquinas já cadastradas (mesma foto) são ignoradas.

SET NAMES utf8mb4;

-- 1) Troque pelo e-mail da sua conta no GiroRural (ela precisa estar com o modo anunciante ativo).
SET @email_dono = 'SEU-EMAIL@exemplo.com';

SET @dono = (SELECT id FROM usuarios WHERE email = @email_dono AND role = 'PROPRIETARIO' LIMIT 1);
-- Se @dono vier NULL, o script não insere nada. Confira com: SELECT @dono;
SELECT IF(@dono IS NULL, 'ATENÇÃO: conta não encontrada ou sem modo anunciante. Nada foi inserido.', CONCAT('Proprietário encontrado: id ', @dono)) AS verificacao;

DROP TEMPORARY TABLE IF EXISTS giro_catalogo_maquinas;
CREATE TEMPORARY TABLE giro_catalogo_maquinas (
  nome VARCHAR(150) NOT NULL, categoria VARCHAR(80) NOT NULL, marca VARCHAR(100) NULL, modelo VARCHAR(120) NULL, ano INT NULL,
  descricao TEXT NULL, informacoes_adicionais TEXT NULL, imagem_chave VARCHAR(255) NOT NULL,
  diaria DECIMAL(10,2) NOT NULL, cidade VARCHAR(120) NOT NULL, uf CHAR(2) NOT NULL, condicoes TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO giro_catalogo_maquinas VALUES
('Trator John Deere 6M 125','Tratores','John Deere','6M 125',2019,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 125 cv (indicada no nome do modelo)
Ano: 2019','catalogo/maquinas/john-deere-6m-125.jpg',570.00,'Rio Verde','GO','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator John Deere 7R 350','Tratores','John Deere','7R 350',2016,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 350 cv (indicada no nome do modelo)
Ano: 2016','catalogo/maquinas/john-deere-7r-350.jpg',1260.00,'Jataí','GO','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator John Deere 8R 370','Tratores','John Deere','8R 370',2020,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 370 cv (indicada no nome do modelo)
Ano: 2020','catalogo/maquinas/john-deere-8r-370.jpg',1330.00,'Sorriso','MT','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator John Deere 8R 340','Tratores','John Deere','8R 340',2014,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 340 cv (indicada no nome do modelo)
Ano: 2014','catalogo/maquinas/john-deere-8r-340.jpg',1230.00,'Lucas do Rio Verde','MT','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Colheitadeira John Deere S660','Colheitadeiras','John Deere','S660',2022,'Colheitadeira revisada para a safra, com plataforma de grãos. Operador experiente disponível mediante combinação.','Ano: 2022','catalogo/maquinas/john-deere-s660.jpg',2510.00,'Primavera do Leste','MT','Mínimo de 3 diárias. Operador e frete combinados à parte. Combustível por conta do locatário.'),
('Colheitadeira John Deere S700','Colheitadeiras','John Deere','S700',2023,'Colheitadeira revisada para a safra, com plataforma de grãos. Operador experiente disponível mediante combinação.','Ano: 2023','catalogo/maquinas/john-deere-s700.jpg',2540.00,'Dourados','MS','Mínimo de 3 diárias. Operador e frete combinados à parte. Combustível por conta do locatário.'),
('Plantadeira John Deere Max Emerge XP','Plantadeiras','John Deere','Max Emerge XP',2022,'Plantadeira regulada e com discos revisados. Confirme a compatibilidade com a potência do seu trator.','Ano: 2022','catalogo/maquinas/john-deere-max-emerge-xp.jpg',640.00,'Maracaju','MS','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Plantadeira John Deere','Plantadeiras','John Deere',NULL,2015,'Plantadeira regulada e com discos revisados. Confirme a compatibilidade com a potência do seu trator.','Ano: 2015','catalogo/maquinas/john-deere-plantadeira-16-linhas.jpg',700.00,'Cascavel','PR','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Pulverizador John Deere 4630','Pulverizadores','John Deere','4630',2015,'Pulverizador com bicos revisados e calibração recente. Uso exclusivo com produtos registrados e receituário agronômico.','Ano: 2015','catalogo/maquinas/john-deere-4630-pulverizador.jpg',1540.00,'Ponta Grossa','PR','Mínimo de 2 diárias. Entrega com tanque limpo; devolver lavado. Operador habilitado obrigatório.'),
('Pulverizador John Deere R4150i','Pulverizadores','John Deere','R4150i',2022,'Pulverizador com bicos revisados e calibração recente. Uso exclusivo com produtos registrados e receituário agronômico.','Ano: 2022','catalogo/maquinas/john-deere-r4150i.jpg',1270.00,'Passo Fundo','RS','Mínimo de 2 diárias. Entrega com tanque limpo; devolver lavado. Operador habilitado obrigatório.'),
('Carreta graneleira John Deere','Transporte','John Deere',NULL,2023,'Equipamento para transporte de grãos e cargas na fazenda, com engate e sinalização em ordem.','Ano: 2023','catalogo/maquinas/john-deere-carreta-graneleira.jpg',330.00,'Cruz Alta','RS','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator Valtra Série T','Tratores','Valtra','Série T',2017,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Ano: 2017','catalogo/maquinas/valtra-serie-t.jpg',510.00,'Uberaba','MG','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator Valtra T235','Tratores','Valtra','T235',2023,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 235 cv (indicada no nome do modelo)
Ano: 2023','catalogo/maquinas/valtra-t235.jpg',910.00,'Unaí','MG','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator Valtra N175','Tratores','Valtra','N175',2014,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 175 cv (indicada no nome do modelo)
Ano: 2014','catalogo/maquinas/valtra-n175.jpg',720.00,'Ribeirão Preto','SP','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator Valtra A85','Tratores','Valtra','A85',2023,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 85 cv (indicada no nome do modelo)
Ano: 2023','catalogo/maquinas/valtra-a85.jpg',480.00,'Barretos','SP','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator Valtra S416','Tratores','Valtra','S416',2014,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Ano: 2014','catalogo/maquinas/valtra-s416.jpg',640.00,'Luís Eduardo Magalhães','BA','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator New Holland T6.180','Tratores','New Holland','T6.180',2017,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 180 cv (indicada no nome do modelo)
Ano: 2017','catalogo/maquinas/new-holland-t6-180.jpg',740.00,'Balsas','MA','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator New Holland T7.270','Tratores','New Holland','T7.270',2014,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 270 cv (indicada no nome do modelo)
Ano: 2014','catalogo/maquinas/new-holland-t7-270.jpg',1020.00,'Chapecó','SC','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator New Holland T8.435 Genesis','Tratores','New Holland','T8.435 Genesis',2022,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 435 cv (indicada no nome do modelo)
Ano: 2022','catalogo/maquinas/new-holland-t8-435.jpg',1350.00,'Rio Verde','GO','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Colheitadeira New Holland CR 9.90','Colheitadeiras','New Holland','CR 9.90',2018,'Colheitadeira revisada para a safra, com plataforma de grãos. Operador experiente disponível mediante combinação.','Ano: 2018','catalogo/maquinas/new-holland-cr-9-90.jpg',3690.00,'Jataí','GO','Mínimo de 3 diárias. Operador e frete combinados à parte. Combustível por conta do locatário.'),
('Colheitadeira New Holland TC56','Colheitadeiras','New Holland','TC56',2022,'Colheitadeira revisada para a safra, com plataforma de grãos. Operador experiente disponível mediante combinação.','Ano: 2022','catalogo/maquinas/new-holland-tc56.jpg',3030.00,'Sorriso','MT','Mínimo de 3 diárias. Operador e frete combinados à parte. Combustível por conta do locatário.'),
('New Holland T7.270 com reboque basculante','Transporte','New Holland','T7.270 com reboque basculante',2018,'Equipamento para transporte de grãos e cargas na fazenda, com engate e sinalização em ordem.','Ano: 2018','catalogo/maquinas/new-holland-t7-270-cacamba.jpg',280.00,'Lucas do Rio Verde','MT','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator Case IH Puma 185','Tratores','Case IH','Puma 185',2022,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 185 cv (indicada no nome do modelo)
Ano: 2022','catalogo/maquinas/case-ih-puma-185.jpg',750.00,'Primavera do Leste','MT','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator Case IH Magnum 220','Tratores','Case IH','Magnum 220',2016,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 220 cv (indicada no nome do modelo)
Ano: 2016','catalogo/maquinas/case-ih-magnum-220.jpg',860.00,'Dourados','MS','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator Case IH Steiger 600','Tratores','Case IH','Steiger 600',2015,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Potência nominal: 600 cv (indicada no nome do modelo)
Ano: 2015','catalogo/maquinas/case-ih-steiger-600.jpg',1350.00,'Maracaju','MS','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Colheitadeira Case IH Axial-Flow 8260','Colheitadeiras','Case IH','Axial-Flow 8260',2017,'Colheitadeira revisada para a safra, com plataforma de grãos. Operador experiente disponível mediante combinação.','Ano: 2017','catalogo/maquinas/case-ih-axial-flow-8260.jpg',3270.00,'Cascavel','PR','Mínimo de 3 diárias. Operador e frete combinados à parte. Combustível por conta do locatário.'),
('Pulverizador Case IH Patriot 4050','Pulverizadores','Case IH','Patriot 4050',2022,'Pulverizador com bicos revisados e calibração recente. Uso exclusivo com produtos registrados e receituário agronômico.','Ano: 2022','catalogo/maquinas/case-ih-patriot-4050.jpg',1450.00,'Ponta Grossa','PR','Mínimo de 2 diárias. Entrega com tanque limpo; devolver lavado. Operador habilitado obrigatório.'),
('Trator Massey Ferguson 5465','Tratores','Massey Ferguson','5465',2023,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Ano: 2023','catalogo/maquinas/massey-ferguson-5465.jpg',680.00,'Passo Fundo','RS','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Grade de discos Väderstad','Preparo do solo','Väderstad',NULL,2017,'Implemento para preparo de solo em boas condições, ideal para abertura e reforma de áreas.','Ano: 2017','catalogo/maquinas/vaderstad-grade-de-discos.jpg',330.00,'Cruz Alta','RS','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Subsolador Lancer Kenchua KX 307','Preparo do solo','Lancer Kenchua','KX 307',2022,'Implemento para preparo de solo em boas condições, ideal para abertura e reforma de áreas.','Ano: 2022','catalogo/maquinas/lancer-kenchua-subsolador-kx-307.jpg',420.00,'Uberaba','MG','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Distribuidor Cavallo PXT 490','Distribuidores','Cavallo','PXT 490',2019,'Distribuidor para calcário e fertilizantes, com regulagem de vazão e esteira revisada.','Ano: 2019','catalogo/maquinas/cavallo-distribuidor-pxt-490.jpg',330.00,'Unaí','MG','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Plantadeira Juko','Plantadeiras','Juko',NULL,2021,'Plantadeira regulada e com discos revisados. Confirme a compatibilidade com a potência do seu trator.','Ano: 2021','catalogo/maquinas/juko-semeadora.jpg',790.00,'Ribeirão Preto','SP','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.'),
('Trator Massey Ferguson 590','Tratores','Massey Ferguson','590',2017,'Trator revisado, pronto para preparo de solo, plantio e transporte na propriedade. Pneus em bom estado e cabine conservada.','Ano: 2017','catalogo/maquinas/massey-ferguson-590.jpg',580.00,'Barretos','SP','Mínimo de 2 diárias. Retirada na propriedade; frete e operador a combinar.');

INSERT INTO equipamentos (proprietario_id, nome, categoria, marca, modelo, ano, descricao, informacoes_adicionais, imagem_chave, estado)
SELECT @dono, s.nome, s.categoria, s.marca, s.modelo, s.ano, s.descricao, s.informacoes_adicionais, s.imagem_chave, 'ativo'
FROM giro_catalogo_maquinas s
WHERE @dono IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM equipamentos e WHERE e.proprietario_id = @dono AND e.imagem_chave = s.imagem_chave);

INSERT INTO anuncios (equipamento_id, proprietario_id, diaria, cidade, uf, condicoes, estado)
SELECT e.id, @dono, s.diaria, s.cidade, s.uf, s.condicoes, 'ativo'
FROM giro_catalogo_maquinas s
JOIN equipamentos e ON e.proprietario_id = @dono AND e.imagem_chave = s.imagem_chave
WHERE @dono IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM anuncios a WHERE a.equipamento_id = e.id);

SELECT COUNT(*) AS anuncios_ativos_do_catalogo FROM anuncios a JOIN equipamentos e ON e.id = a.equipamento_id
WHERE a.proprietario_id = @dono AND e.imagem_chave LIKE 'catalogo/maquinas/%' AND a.estado = 'ativo';

DROP TEMPORARY TABLE IF EXISTS giro_catalogo_maquinas;

-- Dados demonstrativos opcionais e reexecutáveis. Use apenas em ambiente local.
-- Antes de executar: SET @giro_owner_id = <id de uma conta com role PROPRIETARIO>;
-- Nenhum usuário, assinatura ou registro existente é atualizado.
INSERT INTO equipamentos (proprietario_id,nome,categoria,marca,modelo,ano,descricao,estado)
SELECT u.id,'Trator demonstrativo','Tratores','GiroRural','Demo 75',2024,
       'Registro de demonstração local; confirme disponibilidade e condições com o proprietário.','ativo'
FROM usuarios u
WHERE u.id=@giro_owner_id AND u.role IN ('PROPRIETARIO','proprietario')
  AND NOT EXISTS (SELECT 1 FROM equipamentos e WHERE e.proprietario_id=u.id AND e.nome='Trator demonstrativo');

INSERT INTO anuncios (equipamento_id,proprietario_id,diaria,cidade,uf,condicoes,estado)
SELECT e.id,e.proprietario_id,450.00,'Ribeirão Preto','SP',
       'Dados de demonstração. Aluguel negociado diretamente entre as partes.','ativo'
FROM equipamentos e
WHERE e.proprietario_id=@giro_owner_id AND e.nome='Trator demonstrativo'
  AND NOT EXISTS (SELECT 1 FROM anuncios a WHERE a.equipamento_id=e.id);

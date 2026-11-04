const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { publico } = require('../src/rural/rotas');

const assets = [
  'trator-john-deere-6110.jpg', 'trator-agricola.jpg', 'colheitadeira-graos.jpg',
  'semeadora-plantadeira.jpg', 'pulverizador-campo.jpg', 'distribuidor-fertilizantes.jpg',
  'grade-aradora.jpg', 'rocadeira-agricola.jpg', 'carreta-agricola.jpg'
];

test('catálogo local usa fotos agrícolas estáticas e válidas', async () => {
  for (const asset of assets) {
    const file = path.join(__dirname, '..', 'public', 'imagens', 'catalogo', asset);
    assert.ok(fs.existsSync(file), `arquivo ausente: ${asset}`);
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.format, 'jpeg', asset);
    assert.ok(metadata.width >= 320 && metadata.height >= 180, asset);
  }
});

test('anúncios de seed têm texto público natural e foto local coerente com a categoria', () => {
  const cases = [
    ['Tratores', 'Trator agrícola John Deere 6110J', '/imagens/catalogo/trator-john-deere-6110.jpg'],
    ['Tratores', 'Trator agrícola para uso geral', '/imagens/catalogo/trator-agricola.jpg'],
    ['Colheita', 'Colheitadeira de grãos', '/imagens/catalogo/colheitadeira-graos.jpg'],
    ['Plantio', 'Plantadeira de precisão', '/imagens/catalogo/semeadora-plantadeira.jpg'],
    ['Pulverização', 'Pulverizador agrícola', '/imagens/catalogo/pulverizador-campo.jpg'],
    ['Adubação', 'Distribuidor de fertilizantes', '/imagens/catalogo/distribuidor-fertilizantes.jpg'],
    ['Preparo do solo', 'Grade aradora', '/imagens/catalogo/grade-aradora.jpg'],
    ['Subsolagem', 'Subsolador agrícola', '/imagens/catalogo/grade-aradora.jpg'],
    ['Roçada', 'Roçadeira agrícola', '/imagens/catalogo/rocadeira-agricola.jpg'],
    ['Transporte agrícola', 'Carreta agrícola', '/imagens/catalogo/carreta-agricola.jpg'],
    ['Semeadura', 'Semeadora agrícola', '/imagens/catalogo/semeadora-plantadeira.jpg'],
    ['Preparo do solo', 'Implemento para preparo do solo', '/imagens/catalogo/grade-aradora.jpg']
  ];
  for (const [categoria, nome, foto] of cases) {
    const item = publico({ id: 1, nome, categoria, marca: 'A consultar', modelo: categoria,
      descricao: '[DEMO FICTÍCIO] Equipamento para operações agrícolas. Consulte disponibilidade e condições.',
      diaria: '250.00', cidade: 'Campinas', uf: 'SP', condicoes: 'Locação por diária. Confirme transporte e operador.',
      imagem_chave: null, fotos: [], proprietario_nome: 'Proprietário' });
    assert.equal(item.foto_url, foto, nome);
    assert.equal(item.demonstrativo, true, nome);
    assert.doesNotMatch([item.nome,item.descricao,item.condicoes,item.proprietario.nome].join(' '), /fict[ií]cio|demonstrativ|ilustrativ/i);
  }
});

test('arquivos públicos do catálogo não exibem rótulos de demonstração nem ilustrações SVG', () => {
  for (const filename of ['anuncios.js', 'anuncio.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', 'public', filename), 'utf8');
    assert.doesNotMatch(source, /Demonstração fictícia|Equipamento demonstrativo|Referência ilustrativa|Anúncio fictício/i, filename);
    assert.doesNotMatch(source, /imagens\/equipamentos\.svg|machine-art|Ilustração local/i, filename);
  }
});

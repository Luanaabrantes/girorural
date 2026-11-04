// Schemas atuais do GiroRural e serviços de identidade/auditoria.
module.exports = {
  schemas: {
    Mensagem: { type: 'object', properties: { mensagem: { type: 'string' } }, required: ['mensagem'] },
    Usuario: {
      type: 'object', required: ['id','nome','email','role'],
      properties: {
        id: { type: 'integer', minimum: 1 }, nome: { type: 'string' }, email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['LOCATARIO','PROPRIETARIO','admin','usuario'], description: 'Contas legadas usuario/admin são preservadas e mapeadas pelo domínio para LOCATARIO/ADMIN.' }
      }
    },
    Cadastro: { type: 'object', required: ['nome','email','senha'], properties: {
      nome: { type: 'string', minLength: 1 }, email: { type: 'string', minLength: 1 },
      senha: { type: 'string', minLength: 6, writeOnly: true, description: 'Cadastro cria LOCATARIO; papéis de proprietário/admin são atribuídos por administração.' }
    } },
    Login: { type: 'object', required: ['email','senha'], properties: {
      email: { type: 'string', minLength: 1 }, senha: { type: 'string', minLength: 1, writeOnly: true }
    } },
    Recuperacao: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
    Redefinicao: { type: 'object', required: ['token','senha'], properties: {
      token: { type: 'string', writeOnly: true }, senha: { type: 'string', minLength: 6, writeOnly: true }
    } },
    Role: { type: 'object', required: ['role'], properties: {
      role: { type: 'string', enum: ['ADMIN','PROPRIETARIO','LOCATARIO'], description: 'ADMIN é armazenado como admin para compatibilidade com a gestão administrativa herdada.' }
    } },
    EquipamentoNovo: { type: 'object', required: ['nome','categoria'], additionalProperties: false, properties: {
      nome: { type: 'string', minLength: 1, maxLength: 150 }, categoria: { type: 'string', minLength: 1, maxLength: 80 },
      marca: { type: 'string', maxLength: 100, nullable: true }, modelo: { type: 'string', maxLength: 120, nullable: true },
      ano: { type: 'integer', minimum: 1800, nullable: true }, descricao: { type: 'string', maxLength: 5000, nullable: true }, informacoes_adicionais: { type: 'string', maxLength: 3000, nullable: true, description: 'Dados opcionais confirmados pelo proprietário e pertinentes à categoria.' }
    } },
    EquipamentoAlteracao: { type: 'object', minProperties: 1, additionalProperties: false, properties: {
      nome: { type: 'string', minLength: 1, maxLength: 150 }, categoria: { type: 'string', minLength: 1, maxLength: 80 },
      marca: { type: 'string', maxLength: 100, nullable: true }, modelo: { type: 'string', maxLength: 120, nullable: true },
      ano: { type: 'integer', minimum: 1800, nullable: true }, descricao: { type: 'string', maxLength: 5000, nullable: true }, informacoes_adicionais: { type: 'string', maxLength: 3000, nullable: true }, estado: { type: 'string', enum: ['ativo','inativo'] }
    } },
    AnuncioNovo: { type: 'object', required: ['equipamento_id','diaria','cidade','uf'], additionalProperties: false, properties: {
      equipamento_id: { type: 'integer', minimum: 1 }, diaria: { type: 'number', minimum: 0.01, multipleOf: 0.01 },
      cidade: { type: 'string', minLength: 1, maxLength: 120 }, uf: { type: 'string', pattern: '^[A-Za-z]{2}$' },
      condicoes: { type: 'string', maxLength: 5000, nullable: true }, estado: { type: 'string', enum: ['ativo','rascunho'] }
    } },
    AnuncioAlteracao: { type: 'object', minProperties: 1, additionalProperties: false, properties: {
      diaria: { type: 'number', minimum: 0.01, multipleOf: 0.01 }, cidade: { type: 'string', minLength: 1, maxLength: 120 },
      uf: { type: 'string', pattern: '^[A-Za-z]{2}$' }, condicoes: { type: 'string', maxLength: 5000, nullable: true },
      estado: { type: 'string', enum: ['rascunho','ativo','inativo'] }
    } },
    ReservaNova: { type: 'object', required: ['anuncio_id','inicio','fim'], additionalProperties: false, properties: {
      anuncio_id: { type: 'integer', minimum: 1 }, inicio: { type: 'string', format: 'date' }, fim: { type: 'string', format: 'date' }
    } },
    ProprietarioPublico: { type: 'object', required: ['nome'], properties: {
      id: { type: 'integer', minimum: 1, description: 'Identificador usado para abrir o perfil público; nenhum dado privado é exposto.' },
      nome: { type: 'string', description: 'Nome público de exibição; e-mail e telefone não são expostos.' }
    } },
    PerfilAtualizacao: { type: 'object', minProperties: 1, additionalProperties: false, properties: {
      nome: { type: 'string', minLength: 1, maxLength: 150, description: 'Nome completo. O e-mail não pode ser alterado por este endpoint.' },
      nome_exibicao: { type: 'string', maxLength: 100 }, telefone: { type: 'string', maxLength: 30 },
      cidade: { type: 'string', maxLength: 120 }, uf: { type: 'string', maxLength: 2, pattern: '^[A-Za-z]{2}$' },
      bio: { type: 'string', maxLength: 300 }
    } },
    PerfilPrivado: { type: 'object', required: ['id','nome','nome_exibicao','email','role','telefone','cidade','uf','bio','foto_url'], properties: {
      id: { type: 'integer', minimum: 1 }, nome: { type: 'string' }, nome_exibicao: { type: 'string' },
      email: { type: 'string', format: 'email', readOnly: true }, role: { type: 'string', enum: ['ADMIN','PROPRIETARIO','LOCATARIO','admin','usuario'], readOnly: true },
      telefone: { type: 'string' }, cidade: { type: 'string' }, uf: { type: 'string' }, bio: { type: 'string' }, foto_url: { type: 'string', nullable: true }
    } },
    AnuncioProprietarioPublico: { type: 'object', required: ['id','nome','categoria','diaria','cidade','uf','demonstrativo'], properties: {
      id: { type: 'integer', minimum: 1 }, nome: { type: 'string' }, categoria: { type: 'string' }, marca: { type: 'string', nullable: true },
      modelo: { type: 'string', nullable: true }, ano: { type: 'integer', nullable: true }, descricao: { type: 'string', nullable: true }, informacoes_adicionais: { type: 'string', nullable: true, description: 'Informações fornecidas pelo proprietário pertinentes à categoria.' },
      diaria: { type: 'string' }, cidade: { type: 'string' }, uf: { type: 'string' }, condicoes: { type: 'string', nullable: true },
      foto_url: { type: 'string', nullable: true }, demonstrativo: { type: 'boolean', enum: [false] }
    } },
    PerfilProprietarioPublico: { type: 'object', required: ['id','nome','foto_url','cidade','uf','descricao'], properties: {
      id: { type: 'integer', minimum: 1 }, nome: { type: 'string' }, foto_url: { type: 'string', nullable: true }, cidade: { type: 'string' },
      uf: { type: 'string' }, descricao: { type: 'string' }
    } },
    AnuncioPublico: { type: 'object', required: ['id','nome','categoria','diaria','cidade','uf','demonstrativo','proprietario','foto_url','fotos'], properties: {
      id: { type: 'integer', minimum: 1 }, nome: { type: 'string' }, categoria: { type: 'string' },
      marca: { type: 'string', nullable: true }, modelo: { type: 'string', nullable: true }, ano: { type: 'integer', nullable: true },
      descricao: { type: 'string', nullable: true }, informacoes_adicionais: { type: 'string', nullable: true }, diaria: { type: 'string', pattern: '^\\d+\\.\\d{2}$' },
      cidade: { type: 'string' }, uf: { type: 'string', minLength: 2, maxLength: 2 },
      condicoes: { type: 'string', nullable: true }, demonstrativo: { type: 'boolean', description: 'Registros fictícios não aceitam solicitações de reserva.' },
      proprietario: { $ref: '#/components/schemas/ProprietarioPublico' }, foto_url: { type: 'string', nullable: true, description: 'Imagem principal publicada após validação de acesso pela API.' },
      fotos: { type: 'array', items: { $ref: '#/components/schemas/FotoAnuncio' } }
    } },
    FotoAnuncio: { type: 'object', required: ['id','foto_url','principal'], properties: {
      id: { oneOf: [{type: 'integer', minimum: 1}, {type: 'string', enum: ['legacy']}] },
      foto_url: { type: 'string' }, principal: { type: 'boolean' }
    } },
    DecisaoReserva: { type: 'object', required: ['estado'], additionalProperties: false, properties: { estado: { type: 'string', enum: ['confirmada','recusada'] } } },
    Evento: { type: 'object', required: ['id','usuario_id','acao','timestamp'], properties: {
      id: { type: 'string' }, usuario_id: { type: 'string' }, acao: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' }, ip: { type: 'string' }, detalhes: { type: 'object', additionalProperties: true }
    } },
    Saude: { type: 'object', required: ['servico','status'], properties: {
      servico: { type: 'string' }, status: { type: 'string', enum: ['ok','indisponivel'] },
      dependencias: { type: 'object', additionalProperties: { type: 'string', enum: ['ok','indisponivel'] } }
    } }
  },
  securitySchemes: {
    sessao: { type: 'apiKey', in: 'cookie', name: 'token', description: 'Cookie HttpOnly emitido no login; enviado automaticamente pelo mesmo navegador.' },
    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Uso interno na rede dos serviços.' }
  }
};

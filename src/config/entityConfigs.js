const towers = ['Torre A', 'Torre B', 'Torre C', 'Área comum']
const priorities = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE']

export const entityConfigs = {
  visitantesPortaria: {
    collection: 'visitors', title: 'Visitantes', subtitle: 'Gerencie os acessos de visitantes do condomínio.', action: 'Registrar visitante', empty: 'Nenhum visitante encontrado.',
    tabs: [['Todos', []], ['Aguardando autorização', ['PENDENTE']], ['Autorizados', ['AUTORIZADO']], ['Presentes', ['ENTROU']], ['Finalizados', ['SAIU', 'RECUSADO', 'EXPIRADO']]],
    columns: [['Visitante', 'name', 'cpf'], ['Destino', 'unit', 'tower'], ['Morador responsável', 'resident'], ['Início', 'startDate', 'startTime'], ['Término', 'endDate', 'endTime'], ['Status', 'status']],
    fields: [{ key: 'name', label: 'Nome', required: true }, { key: 'cpf', label: 'CPF', required: true }, { key: 'phone', label: 'Telefone' }, { key: 'tower', label: 'Torre / Bloco', type: 'select', options: towers.slice(0, 3), required: true }, { key: 'unit', label: 'Apartamento', required: true }, { key: 'resident', label: 'Morador responsável', required: true }, { key: 'startDate', label: 'Data de início', type: 'date', required: true }, { key: 'startTime', label: 'Horário de início', type: 'time', required: true }, { key: 'endDate', label: 'Data de término', type: 'date', required: true }, { key: 'endTime', label: 'Horário de término', type: 'time', required: true }, { key: 'notes', label: 'Observação', type: 'textarea' }, { key: 'authorized', label: 'Possui autorização prévia', type: 'checkbox' }],
  },
  prestadores: {
    collection: 'providers', title: 'Prestadores', subtitle: 'Gerencie a entrada e saída de prestadores de serviço.', action: 'Registrar prestador', empty: 'Nenhum prestador encontrado.',
    tabs: [['Todos', []], ['Esperados', ['ESPERADO']], ['Presentes', ['ENTROU']], ['Finalizados', ['SAIU']]],
    columns: [['Prestador', 'name', 'company'], ['Serviço', 'service'], ['Destino', 'location', 'tower'], ['Data / Horário', 'date', 'time'], ['Status', 'status']],
    fields: [{ key: 'name', label: 'Nome', required: true }, { key: 'cpf', label: 'CPF', required: true }, { key: 'company', label: 'Empresa', required: true }, { key: 'service', label: 'Serviço', required: true }, { key: 'tower', label: 'Torre / Bloco', type: 'select', options: towers, required: true }, { key: 'location', label: 'Apartamento ou local', required: true }, { key: 'date', label: 'Data', type: 'date', required: true }, { key: 'time', label: 'Horário', type: 'time', required: true }, { key: 'notes', label: 'Observação', type: 'textarea' }],
  },
  encomendasPortaria: {
    collection: 'packages', title: 'Encomendas', subtitle: 'Registre e acompanhe as encomendas recebidas na portaria.', action: 'Registrar encomenda', empty: 'Nenhuma encomenda encontrada.',
    tabs: [['Todos', []], ['Aguardando retirada', ['AGUARDANDO_RETIRADA']], ['Retiradas', ['RETIRADA']], ['Devolvidas', ['DEVOLVIDA']]],
    columns: [['Código', 'id'], ['Morador', 'resident'], ['Unidade', 'unit', 'tower'], ['Recebida em', 'receivedAt'], ['Status', 'status']],
    fields: [{ key: 'tower', label: 'Torre / Bloco', type: 'select', options: towers.slice(0, 3), required: true }, { key: 'unit', label: 'Apartamento', required: true }, { key: 'notes', label: 'Identificação / observação', type: 'textarea' }],
  },
  avisos: {
    collection: 'notices', title: 'Avisos', subtitle: 'Publique e acompanhe avisos relacionados à rotina do condomínio.', action: 'Novo aviso', empty: 'Nenhum aviso encontrado.',
    tabs: [['Todos', []], ['Normal', ['NORMAL'], 'priority'], ['Urgente', ['URGENTE'], 'priority'], ['Ativos', ['ATIVO']], ['Encerrados', ['ENCERRADO']]],
    columns: [['Aviso', 'title', 'content'], ['Destino', 'destination', 'tower'], ['Prioridade', 'priority'], ['Vigência', 'startDate', 'endDate'], ['Status', 'status']],
    fields: [{ key: 'title', label: 'Título', required: true }, { key: 'content', label: 'Conteúdo', type: 'textarea', required: true }, { key: 'priority', label: 'Prioridade', type: 'select', options: ['NORMAL', 'URGENTE'], required: true }, { key: 'destination', label: 'Destino', type: 'select', options: ['Todo condomínio', 'Torre/Bloco específico'], required: true }, { key: 'tower', label: 'Torre / Bloco', type: 'select', options: towers.slice(0, 3) }, { key: 'startDate', label: 'Data inicial', type: 'date', required: true }, { key: 'endDate', label: 'Data final', type: 'date', required: true }],
  },
  chamadosPortaria: {
    collection: 'tickets', title: 'Chamados', subtitle: 'Registre ocorrências e acompanhe as solicitações da portaria.', action: 'Novo chamado', empty: 'Nenhum chamado encontrado.',
    tabs: [['Todos', []], ['Abertos', ['ABERTO']], ['Em análise', ['EM_ANALISE']], ['Em atendimento', ['EM_ATENDIMENTO']], ['Resolvidos', ['RESOLVIDO']], ['Encerrados', ['ENCERRADO']]],
    columns: [['Protocolo', 'id'], ['Chamado / Ocorrência', 'title', 'category'], ['Local / Unidade', 'location'], ['Prioridade', 'priority'], ['Status', 'status']],
    fields: [{ key: 'title', label: 'Título', required: true }, { key: 'description', label: 'Descrição', type: 'textarea', required: true }, { key: 'category', label: 'Categoria', type: 'select', options: ['Manutenção', 'Convivência', 'Segurança', 'Ocorrência'], required: true }, { key: 'location', label: 'Local', required: true }, { key: 'priority', label: 'Prioridade', type: 'select', options: priorities, required: true }, { key: 'notes', label: 'Observação', type: 'textarea' }],
  },
  historico: {
    collection: 'history', title: 'Histórico', subtitle: 'Consulte o registro das atividades realizadas pela portaria.', empty: 'Nenhuma operação encontrada.', history: true,
    tabs: [['Todos', []]], columns: [['Data / Hora', 'date', 'time'], ['Evento', 'type'], ['Pessoa / Referência', 'reference'], ['Unidade / Local', 'unit'], ['Registrado por', 'user']], fields: [],
  },
  moradores: {
    collection: 'residents', title: 'Moradores', subtitle: 'Gerencie os moradores cadastrados no condomínio.', action: 'Cadastrar morador', empty: 'Nenhum morador encontrado.',
    tabs: [['Todos', []], ['Ativos', ['ATIVO']], ['Inativos', ['INATIVO']], ['Proprietários', ['PROPRIETARIO'], 'relation'], ['Inquilinos', ['INQUILINO'], 'relation']],
    columns: [['Morador', 'name', 'cpf'], ['Unidade', 'unit', 'tower'], ['Vínculo', 'relation'], ['Contato', 'email', 'phone'], ['Status', 'status']],
    fields: [{ key: 'name', label: 'Nome', required: true }, { key: 'cpf', label: 'CPF', required: true }, { key: 'email', label: 'E-mail', type: 'email', required: true }, { key: 'phone', label: 'Telefone', required: true }, { key: 'tower', label: 'Torre / Bloco', type: 'select', options: towers.slice(0, 3), required: true }, { key: 'unit', label: 'Unidade', required: true }, { key: 'relation', label: 'Vínculo com a unidade', type: 'select', options: ['PROPRIETARIO', 'INQUILINO'], required: true }],
  },
  unidades: {
    collection: 'units', title: 'Unidades', subtitle: 'Gerencie as unidades do condomínio.', action: 'Nova unidade', empty: 'Nenhuma unidade encontrada.',
    tabs: [['Todas', []], ['Ocupadas', ['OCUPADO']], ['Livres', ['LIVRE']], ['Inativas', ['INATIVO']], ['Reservadas', ['RESERVADO']]],
    columns: [['Unidade', 'number'], ['Torre / Bloco', 'tower'], ['Proprietários', 'owners'], ['Moradores', 'residents'], ['Status', 'status']],
    fields: [{ key: 'tower', label: 'Torre / Bloco', type: 'select', options: towers.slice(0, 3), required: true }, { key: 'number', label: 'Número / identificação', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['OCUPADO', 'LIVRE', 'INATIVO', 'RESERVADO'], required: true }, { key: 'owner', label: 'Proprietário vinculado' }, { key: 'resident', label: 'Morador vinculado' }],
  },
  encomendasAdmin: {
    collection: 'packages', title: 'Encomendas', subtitle: 'Consulte as encomendas recebidas no condomínio.', empty: 'Nenhuma encomenda encontrada.',
    tabs: [['Todas', []], ['Aguardando retirada', ['AGUARDANDO_RETIRADA']], ['Retiradas', ['RETIRADA']], ['Devolvidas', ['DEVOLVIDA']]],
    columns: [['Código', 'id'], ['Morador', 'resident'], ['Unidade', 'unit', 'tower'], ['Recebida em', 'receivedAt'], ['Porteiro', 'doorman'], ['Status', 'status']], fields: [],
  },
  reservas: {
    collection: 'reservations', title: 'Reservas', subtitle: 'Consulte e gerencie excepcionalmente as reservas.', empty: 'Nenhuma reserva encontrada.',
    tabs: [['Todas', []], ['Pendentes', ['AGUARDANDO_APROVACAO']], ['Confirmadas', ['CONFIRMADA']], ['Concluídas', ['CONCLUIDA']], ['Canceladas', ['CANCELADA', 'RECUSADA']]],
    columns: [['Área', 'area'], ['Morador', 'resident'], ['Unidade', 'unit', 'tower'], ['Data', 'date'], ['Horário', 'startTime', 'endTime'], ['Status', 'status']], fields: [],
  },
  visitantesAdmin: {
    collection: 'visitors', title: 'Visitantes', subtitle: 'Consulte o histórico de acessos de visitantes.', empty: 'Nenhum visitante encontrado.',
    tabs: [['Todos', []], ['Pendentes', ['PENDENTE']], ['Autorizados', ['AUTORIZADO']], ['Presentes', ['ENTROU']], ['Finalizados', ['SAIU', 'RECUSADO', 'EXPIRADO']]],
    columns: [['Visitante', 'name', 'cpf'], ['Unidade', 'unit', 'tower'], ['Morador', 'resident'], ['Início', 'startDate', 'startTime'], ['Término', 'endDate', 'endTime'], ['Status', 'status']], fields: [],
  },
  comunicados: {
    collection: 'notices', title: 'Comunicados', subtitle: 'Crie e gerencie os comunicados enviados aos moradores.', action: 'Novo comunicado', empty: 'Nenhum comunicado encontrado.',
    tabs: [['Todos', []], ['Normal', ['NORMAL'], 'priority'], ['Urgente', ['URGENTE'], 'priority'], ['Ativos', ['ATIVO']], ['Encerrados', ['ENCERRADO']]],
    columns: [['Comunicado', 'title', 'content'], ['Destino', 'destination', 'tower'], ['Prioridade', 'priority'], ['Vigência', 'startDate', 'endDate'], ['Status', 'status']],
    fields: [{ key: 'title', label: 'Título', required: true }, { key: 'content', label: 'Conteúdo', type: 'textarea', required: true }, { key: 'priority', label: 'Prioridade', type: 'select', options: ['NORMAL', 'URGENTE'], required: true }, { key: 'destination', label: 'Destino', type: 'select', options: ['Todo condomínio', 'Torre/Bloco específico'], required: true }, { key: 'tower', label: 'Torre / Bloco', type: 'select', options: towers.slice(0, 3) }, { key: 'startDate', label: 'Data inicial', type: 'date', required: true }, { key: 'endDate', label: 'Data final', type: 'date', required: true }],
  },
  chamadosAdmin: {
    collection: 'tickets', title: 'Chamados', subtitle: 'Gerencie e acompanhe as solicitações dos moradores.', action: 'Novo chamado', empty: 'Nenhum chamado encontrado.',
    tabs: [['Todos', []], ['Abertos', ['ABERTO']], ['Em análise', ['EM_ANALISE']], ['Em atendimento', ['EM_ATENDIMENTO']], ['Resolvidos', ['RESOLVIDO']], ['Encerrados', ['ENCERRADO']]],
    columns: [['Protocolo', 'id'], ['Chamado', 'title', 'category'], ['Morador / Unidade', 'resident', 'unit'], ['Prioridade', 'priority'], ['Aberto em', 'openedAt'], ['Status', 'status']],
    fields: [{ key: 'title', label: 'Título', required: true }, { key: 'description', label: 'Descrição', type: 'textarea', required: true }, { key: 'category', label: 'Categoria', type: 'select', options: ['Manutenção', 'Convivência', 'Segurança', 'Ocorrência'], required: true }, { key: 'location', label: 'Local', required: true }, { key: 'priority', label: 'Prioridade', type: 'select', options: priorities, required: true }, { key: 'notes', label: 'Observação', type: 'textarea' }],
  },
}

export const desktopData = {
  moradores: {
    title: 'Moradores', subtitle: 'Gerencie os moradores cadastrados no condomínio.', action: 'Novo morador', tabs: ['Todos (120)', 'Proprietários (82)', 'Residentes (38)'],
    columns: ['Morador', 'Unidade', 'Vínculo', 'Contato', 'Status'],
    rows: [
      ['Carlos Silva|CPF: ***.***.***-42', '203 · Torre A', 'Residente', 'carlos@email.com', 'Ativo'],
      ['Ana Souza|CPF: ***.***.***-18', '305 · Torre B', 'Proprietário', 'ana@email.com', 'Ativo'],
      ['João Santos|CPF: ***.***.***-71', '108 · Torre A', 'Residente', 'joao@email.com', 'Ativo'],
      ['Mariana Oliveira|CPF: ***.***.***-36', '402 · Torre C', 'Proprietário', 'mariana@email.com', 'Ativo'],
      ['Ricardo Lima|CPF: ***.***.***-54', '207 · Torre B', 'Residente', 'ricardo@email.com', 'Inativo'],
    ],
  },
  unidades: {
    title: 'Unidades', subtitle: 'Gerencie as unidades do condomínio.', action: 'Nova unidade', tabs: ['Todas (128)', 'Ocupadas (120)', 'Disponíveis (8)'],
    columns: ['Unidade', 'Torre / Bloco', 'Proprietário', 'Moradores', 'Situação'],
    rows: [['203', 'Torre A', 'Carlos Silva', '2 moradores', 'Ocupada'], ['305', 'Torre B', 'Ana Souza', '3 moradores', 'Ocupada'], ['108', 'Torre A', 'Roberto Lima', '1 morador', 'Ocupada'], ['401', 'Torre C', 'Mariana Costa', '0 moradores', 'Disponível'], ['207', 'Torre B', 'Ricardo Almeida', '2 moradores', 'Ocupada']],
  },
  encomendasAdmin: {
    title: 'Encomendas', subtitle: 'Gerencie as encomendas recebidas no condomínio.', action: 'Registrar encomenda', tabs: ['Todas (24)', 'Aguardando retirada (6)', 'Retiradas (18)'],
    columns: ['Código', 'Morador', 'Unidade', 'Recebida em', 'Status'],
    rows: [['ENC-1048', 'Carlos Silva', '203 · Torre A', 'Hoje · 14:32', 'Aguardando retirada'], ['ENC-1047', 'Ana Souza', '305 · Torre B', 'Hoje · 12:18', 'Aguardando retirada'], ['ENC-1046', 'Mariana Oliveira', '402 · Torre C', 'Hoje · 09:40', 'Aguardando retirada'], ['ENC-1042', 'João Santos', '108 · Torre A', '01/09 · 17:45', 'Retirada'], ['ENC-1038', 'Ricardo Lima', '207 · Torre B', '31/08 · 15:20', 'Retirada']],
  },
  reservas: {
    title: 'Reservas', subtitle: 'Gerencie e acompanhe as reservas das áreas comuns.', action: 'Nova reserva', tabs: ['Todas (18)', 'Confirmadas (11)', 'Pendentes (4)', 'Canceladas (3)'],
    columns: ['Área', 'Morador', 'Unidade', 'Data', 'Horário', 'Status'],
    rows: [['Salão de Festas', 'Carlos Silva', '203 · Torre A', '15/09/2026', '18:00 – 23:00', 'Confirmada'], ['Churrasqueira', 'Ana Souza', '305 · Torre B', '18/09/2026', '12:00 – 17:00', 'Pendente'], ['Quadra', 'João Santos', '108 · Torre A', '20/09/2026', '19:00 – 20:00', 'Confirmada'], ['Salão de Festas', 'Mariana Oliveira', '402 · Torre C', '22/09/2026', '17:00 – 22:00', 'Cancelada'], ['Churrasqueira', 'Ricardo Lima', '207 · Torre B', '25/09/2026', '11:00 – 16:00', 'Confirmada']],
  },
  visitantesAdmin: {
    title: 'Visitantes', subtitle: 'Gerencie e acompanhe os acessos de visitantes.', action: 'Autorizar visitante', tabs: ['Todos (32)', 'Autorizados (8)', 'Em visita (5)', 'Finalizados (19)'],
    columns: ['Visitante', 'Unidade', 'Morador responsável', 'Data / Horário', 'Status'],
    rows: [['Mariana Souza', '203 · Torre A', 'Carlos Silva', 'Hoje · 14:30', 'Autorizado'], ['Lucas Oliveira', '305 · Torre B', 'Ana Souza', 'Hoje · 16:00', 'Em visita'], ['Roberto Santos', '108 · Torre A', 'João Santos', '01/09 · 19:20', 'Finalizado'], ['Camila Ferreira', '402 · Torre C', 'Mariana Oliveira', '03/09 · 10:00', 'Autorizado'], ['Paulo Mendes', '207 · Torre B', 'Ricardo Lima', '31/08 · 18:45', 'Finalizado']],
  },
  comunicados: {
    title: 'Comunicados', subtitle: 'Crie e gerencie os comunicados enviados aos moradores.', action: 'Novo comunicado', tabs: ['Todos (18)', 'Publicados (9)', 'Agendados (3)', 'Rascunhos (2)', 'Encerrados (4)'],
    columns: ['Comunicado', 'Destinatários', 'Publicação', 'Status'],
    rows: [['Manutenção preventiva da piscina|Manutenção', 'Todos os moradores', 'Hoje · 08:30', 'Publicado'], ['Interdição temporária da garagem|Garagem', 'Torre A', '03/09 · 07:00', 'Agendado'], ['Assembleia Geral do Condomínio|Administrativo', 'Todos os moradores', '01/09 · 14:20', 'Publicado'], ['Manutenção dos elevadores|Manutenção', 'Torre B', '25/08 · 09:00', 'Rascunho'], ['Limpeza da caixa d’água|Manutenção', 'Todos os moradores', '20/08 · 10:00', 'Encerrado']],
  },
  chamadosAdmin: {
    title: 'Chamados', subtitle: 'Gerencie e acompanhe as solicitações dos moradores.', action: 'Novo chamado', tabs: ['Todos (27)', 'Abertos (5)', 'Em análise (4)', 'Em atendimento (6)', 'Resolvidos (12)'],
    columns: ['Protocolo', 'Chamado', 'Morador / Unidade', 'Prioridade', 'Aberto em', 'Status'],
    rows: [['#CH-0028', 'Vazamento na garagem|Manutenção', 'Carlos Silva · 203 · Torre A', 'Alta', 'Hoje · 09:42', 'Em análise'], ['#CH-0027', 'Barulho excessivo durante a madrugada|Convivência', 'Ana Souza · 305 · Torre B', 'Média', 'Hoje · 08:15', 'Aberto'], ['#CH-0024', 'Lâmpada queimada no corredor|Manutenção', 'João Santos · 108 · Torre A', 'Baixa', '30/08 · 18:15', 'Em atendimento'], ['#CH-0021', 'Problema no interfone|Manutenção', 'Mariana Oliveira · 402 · Torre C', 'Média', '29/08 · 14:30', 'Em atendimento'], ['#CH-0018', 'Iluminação da garagem|Manutenção', 'Ricardo Lima · 207 · Torre B', 'Baixa', '27/08 · 10:20', 'Resolvido']],
  },
  visitantesPortaria: {
    title: 'Visitantes', subtitle: 'Gerencie os acessos de visitantes do condomínio.', action: 'Registrar visitante', notice: '2 visitantes aguardando autorização', tabs: ['Hoje (12)', 'Aguardando autorização (2)', 'Autorizados (5)', 'Presentes (3)', 'Finalizados (2)'],
    columns: ['Visitante', 'Destino', 'Morador responsável', 'Horário', 'Status'],
    rows: [['Mariana Souza', '203 · Torre A', 'Carlos Silva', '14:30', 'Autorizado'], ['Lucas Oliveira', '305 · Torre B', 'Ana Souza', '16:00', 'Presente'], ['Camila Ferreira', '402 · Torre C', 'Mariana Oliveira', '18:30', 'Autorizado'], ['Pedro Henrique', '110 · Torre A', 'Fernanda Alves', '15:20', 'Aguardando autorização'], ['Roberto Santos', '108 · Torre A', 'João Santos', '11:10', 'Finalizado']],
  },
  prestadores: {
    title: 'Prestadores', subtitle: 'Gerencie a entrada e saída de prestadores de serviço.', action: 'Registrar prestador', notice: '2 prestadores estão no condomínio neste momento', tabs: ['Todos (14)', 'Presentes (2)', 'Previstos (4)', 'Finalizados (8)'],
    columns: ['Prestador', 'Serviço', 'Destino', 'Horário', 'Status'],
    rows: [['José Almeida', 'Eletricista', '305 · Torre B', 'Entrada · 09:15', 'Presente'], ['Marcos Santos', 'Manutenção hidráulica', 'Área comum', 'Entrada · 10:40', 'Presente'], ['André Oliveira', 'Instalação de internet', '203 · Torre A', 'Previsto · 14:00', 'Previsto'], ['Rafael Lima', 'Manutenção de ar-condicionado', '402 · Torre C', 'Previsto · 15:30', 'Previsto'], ['Paulo Ferreira', 'Manutenção elétrica', 'Área comum', 'Saída · 11:20', 'Finalizado']],
  },
  encomendasPortaria: {
    title: 'Encomendas', subtitle: 'Registre e acompanhe as encomendas recebidas na portaria.', action: 'Registrar encomenda', notice: '6 encomendas aguardando retirada', tabs: ['Todos (26)', 'Aguardando retirada (6)', 'Retiradas (18)', 'Devolvidas (2)'],
    columns: ['Código', 'Morador', 'Unidade', 'Recebida em', 'Status'],
    rows: [['ENC-1048', 'Carlos Silva', '203 · Torre A', 'Hoje · 14:32', 'Aguardando retirada'], ['ENC-1047', 'Ana Souza', '305 · Torre B', 'Hoje · 12:18', 'Aguardando retirada'], ['ENC-1046', 'Mariana Oliveira', '402 · Torre C', 'Hoje · 09:40', 'Aguardando retirada'], ['ENC-1045', 'João Santos', '108 · Torre A', 'Ontem · 18:15', 'Aguardando retirada'], ['ENC-1044', 'Ricardo Lima', '207 · Torre B', 'Ontem · 16:50', 'Aguardando retirada']],
  },
  avisos: {
    title: 'Avisos', subtitle: 'Publique e acompanhe avisos relacionados à rotina do condomínio.', action: 'Novo aviso', tabs: ['Todos (12)', 'Ativos (6)', 'Agendados (2)', 'Encerrados (4)'],
    columns: ['Aviso', 'Destino', 'Prioridade', 'Validade', 'Status'],
    rows: [['Manutenção no portão de acesso', 'Todos os moradores', 'Urgente', 'Até hoje · 18:00', 'Ativo'], ['Interdição temporária da garagem', 'Torre A', 'Urgente', 'Até 04/09 · 12:00', 'Ativo'], ['Manutenção na área comum', 'Todos os moradores', 'Normal', '05/09 · 08:00 – 12:00', 'Agendado'], ['Orientação sobre acesso de prestadores', 'Torre B', 'Normal', 'Até 06/09 · 18:00', 'Ativo'], ['Limpeza da entrada principal', 'Todos os moradores', 'Normal', 'Encerrado em 01/09', 'Encerrado']],
  },
  chamadosPortaria: {
    title: 'Chamados', subtitle: 'Registre ocorrências e acompanhe as solicitações da portaria.', action: 'Registrar chamado', tabs: ['Todos (14)', 'Abertos (3)', 'Em análise (3)', 'Em atendimento (4)', 'Resolvidos (4)'],
    columns: ['Protocolo', 'Chamado / Ocorrência', 'Local / Unidade', 'Aberto em', 'Status'],
    rows: [['#CH-0031', 'Portão de acesso apresentando falha|Manutenção', 'Entrada principal', 'Hoje · 13:40', 'Aberto'], ['#CH-0030', 'Interfone da portaria sem funcionamento|Manutenção', 'Portaria', 'Hoje · 10:15', 'Em análise'], ['#CH-0029', 'Iluminação da entrada principal|Manutenção', 'Entrada principal', 'Ontem · 19:30', 'Em atendimento'], ['#CH-0026', 'Objeto encontrado na área comum|Ocorrência', 'Hall · Torre B', '01/09 · 16:20', 'Em análise'], ['#CH-0023', 'Problema no portão de pedestres|Manutenção', 'Entrada principal', '30/08 · 08:45', 'Resolvido']],
  },
  historico: {
    title: 'Histórico', subtitle: 'Consulte o registro das atividades realizadas pela portaria.', tabs: ['Hoje', 'Todos os eventos', 'Todas as unidades'],
    columns: ['Data / Hora', 'Evento', 'Pessoa / Referência', 'Unidade / Local', 'Registrado por'],
    rows: [['Hoje · 14:32', 'Encomenda recebida', 'ENC-1048 · Carlos Silva', '203 · Torre A', 'João Oliveira'], ['Hoje · 14:20', 'Entrada de visitante', 'Mariana Souza', '203 · Torre A', 'João Oliveira'], ['Hoje · 13:25', 'Saída de prestador', 'Marcos Santos', 'Área comum', 'João Oliveira'], ['Hoje · 12:18', 'Encomenda recebida', 'ENC-1047 · Ana Souza', '305 · Torre B', 'Maria Santos'], ['Hoje · 11:45', 'Saída de visitante', 'Roberto Santos', '108 · Torre A', 'Maria Santos']],
  },
}

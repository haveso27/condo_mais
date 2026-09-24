# Integração com Backend — Condo+

## Estado atual e limites

React/Vite/Router, JavaScript, componentes compartilhados, layouts por perfil e estado em AppDataContext. Sem cliente HTTP, API, banco ou sessão real. O login valida contas fictícias locais em src/mocks/mockUsers.js e direciona para o perfil correspondente; Admin/Portaria usam ator fixo, Morador usa currentResident. Não interpretar rotas/controles visíveis como autorização.

Proteção de RecordDetails é uma **allowlist de exibição**, não sanitização de API, controle de acesso ou DTO definitivo.

Morador = perfil; Proprietário/Inquilino = vínculo com unidade.

## Entidades e relações atuais

| Entidade | Representação / consumidores |
|---|---|
| Usuário/sessão | Não formalizada; login local, role de layout e currentResident |
| Morador | residents: id, name, cpf, email, phone, tower, unit, relation, isOwner, status |
| Unidade | units: id, number, tower, owners/residents como arrays de nomes, status |
| Condomínio/configurações | condominium: name, address, phone, email, allowResidentBookings; sem ID |
| Visitante | visitors: id, name/cpf/phone, tower/unit/resident, período, status/source, entryAt/exitAt/notes |
| Prestador | providers: id, name/cpf/company/service, tower/location, date/time, status, entryAt/exitAt/notes |
| Encomenda | packages: id, tower/unit/resident, receivedAt/doorman/status/withdrawnAt/notes |
| Reserva | reservations: id, area/date/startTime/endTime, resident/tower/unit, requestedByOwner/status/notes |
| Área comum | Array de nomes; catálogo compartilhado local, não entidade remota |
| Chamado | tickets: id, title/description/category/location/priority/status, resident/tower/unit quando presentes, openedAt/notes/comments |
| Comentário | String; exibição também aceita objeto content/author/createdAt. Não há identidade própria |
| Comunicado/Aviso | notices: id, title/content/priority/destination/tower/startDate/endDate/status |
| Histórico | history: id, timestamp em novos eventos, date/time/type/reference/unit/user |
| Notificação | notifications: id/unit, tower incompleto, title/text/createdAt/read. Sinos não consomem coleção |

Campos são os atuais do front, não proposta de schema. Obrigatoriedade depende dos formulários em entityConfigs e ResidentPages; optional/nullable deve ser acordado. Admin/Portaria criam chamados sem os mesmos campos de unidade/autoria do Morador.

Relações que precisam de decisão por ID:

- Operações usam tower + unit; distingue 203/A de 203/B, mas não identidade estável entre renomeações/condomínios.
- owners/residents em units usam nomes; homônimos e mudança de nome não são resolvidos.
- Reserva identifica área e solicitante por nome; regra de aprovação compara “Salão de Festas”.
- Encomenda escolhe primeiro morador da unidade e usa nome fixo de porteiro.
- Histórico usa strings compostas para ator/alvo/local.
- Notificações de reserva não identificam torre/destinatário de modo completo.
- currentResident duplica residents e não é sincronizado após edição.

Não remover defesas de torre+unidade antes de substituir sua função por identidade acordada.

## DECISÕES NECESSÁRIAS ANTES DO PRIMEIRO ENDPOINT REAL

- [ ] userId
- [ ] condominiumId
- [ ] unitId
- [ ] person/resident identity
- [ ] vínculo Morador-Unidade
- [ ] areaId
- [ ] ator autenticado
- [ ] permissões
- [ ] DTOs
- [ ] enums
- [ ] nullable
- [ ] datas
- [ ] timezone
- [ ] erros
- [ ] concorrência
- [ ] paginação quando necessária

Este checklist **não define** tipos de ID, URLs, JWT, refresh token, política de sessão, formato final de erro/DTO, idempotência ou versionamento. A equipe deve decidir por fluxo, incluindo escopo de acesso e dados que não podem chegar ao cliente.

## Enums e catálogos atuais

| Eixo | Valores internos |
|---|---|
| Morador | ATIVO, INATIVO; vínculo PROPRIETARIO, INQUILINO |
| Unidade | OCUPADO, LIVRE, INATIVO, RESERVADO |
| Visitante | PENDENTE, AUTORIZADO, ENTROU, SAIU, RECUSADO, EXPIRADO; source MORADOR, PORTARIA |
| Prestador | ESPERADO, ENTROU, SAIU |
| Encomenda | AGUARDANDO_RETIRADA, RETIRADA, DEVOLVIDA |
| Reserva | AGUARDANDO_APROVACAO, CONFIRMADA, CONCLUIDA, CANCELADA, RECUSADA |
| Chamado | ABERTO, EM_ANALISE, EM_ATENDIMENTO, RESOLVIDO, ENCERRADO; CANCELADO aparece em exclusão de contadores, sem produtor atual |
| Aviso | ATIVO, ENCERRADO |
| Prioridade | BAIXA, NORMAL, ALTA, URGENTE; aviso só oferece NORMAL/URGENTE |
| Destino | Todo condomínio; Torre/Bloco específico |
| Categoria | Manutenção, Convivência, Segurança; Outros no Morador, Ocorrência no operacional |
| Área | Salão de Festas, Churrasqueira, Quadra, Academia |
| Torre/local | Torre A/B/C; Área comum em contextos específicos |

Labels como Presentes/Histórico/Canceladas agrupam estados e não são enums adicionais. Tons success/info/warning/danger/neutral são exclusivamente visuais em uiPresentation.js, nunca regra de negócio.

## Datas e relógio

- Calendário usa YYYY-MM-DD e HH:mm.
- Instantes de autorização são interpretados como data/hora local do dispositivo.
- Eventos operacionais usam textos “Hoje · HH:mm” ou formatos DD/MM sem ano.
- Novo histórico tem timestamp ISO e data/hora derivadas do mesmo instante local.
- Seeds antigos não possuem todos os timestamps; rótulo “Hoje” envelhece.
- Expiração recalcula na leitura/render; não existe atualização contínua do relógio.

Decidir datas civis versus instantes, timezone de referência, limites inclusivos e representação no transporte. Formatação amigável pertence à apresentação. Não converter automaticamente data civil para UTC nem copiar textos “Hoje” para persistência definitiva.

## Regras que também precisam existir no servidor

- Required, formatos, limites e existência de unidade; CPF atual valida formato, não identidade/dígitos verificadores.
- Unicidade de unidade por escopo completo, vínculo ativo e autorização por recurso.
- Período válido de visitante e rechecagem na entrada, com relógio confiável.
- Reserva habilitada, período válido, conflito atômico e permissão de aprovação.
- Transições de estado permitidas para cada entidade; patch genérico não é autorização.
- Vigência coerente de aviso; decidir agendamento/expiração, pois activeNotices hoje verifica status/destino, não datas.
- Comentários com autoria e inclusão concorrente segura; atualmente é patch de array completo.
- Histórico e notificações com ator/alvo/destinatário completos e escopo autorizado.

Validações do front devem permanecer como feedback, nunca como única proteção.

## Services e estado: adaptação incremental

Services atuais são **adapters mock síncronos**: listar(records, filtros) retorna array; criar retorna { records, record }; atualizar retorna array. Sem erro HTTP, loader, retry, paginação ou total remoto.

As páginas usam .filter/map imediatamente, e actions fecham modal/exibem sucesso sem aguardar resposta. **Não basta mudar o corpo de listar para devolver Promise.** Não colocar HTTP dentro de updater de setState.

Fluxo conceitual futuro, sem endpoint definido:

UI → serviço/adaptador → API → Backend → Banco → resposta canônica → atualização da UI.

Cada módulo deve ganhar gradualmente idle/loading/success/error, comandos await, proteção de submissão repetida, preservação de rascunho, retry apropriado, invalidação/refetch e tratamento de resposta obsoleta. Resumos não podem depender de uma única página parcial de dados.

## Mocks não são carga inicial de banco

appData é demonstração: visitante 110/A sem unidade cadastrada; nomes em vínculos sem cadastro; 402/C livre apesar de moradora ativa; datas antigas; histórico não representa todas operações; destinatário incompleto em notificações. Catálogos de apresentação estão em src/config/catalogs.js; as fixtures não definem o modelo definitivo de dados.

Testes devem criar fixtures descartáveis coerentes com o contrato decidido.

## Ordem sugerida de integração

1. Decidir identidade, escopo, sessão/permissões, DTOs, tempo e erros da primeira jornada.
2. Integrar contexto de usuário/condomínio e cadastros base (unidades, moradores, vínculos), protegidos no servidor.
3. Integrar uma leitura simples completa com loading/error/empty/retry; validar normalização e acesso.
4. Integrar um comando e resposta canônica, preservando valores em falha.
5. Migrar visitantes/prestadores/encomendas por jornada, com eventos e atualização de resumos.
6. Reservas/aprovações com conflito atômico e permissão por vínculo.
7. Chamados/comentários e comunicados; histórico/notificações conforme escopo acordado.
8. Paginação/resumos, concorrência e regressão ampliada.

É sugestão de dependências, não cronograma obrigatório. Não exige reescrita geral, Redux ou novo framework.

## Decisões de produto pendentes

- Sino do Morador abre Comunicados; não é central de notificações.
- Notificações/Meu perfil operacionais são demonstrativos; perfil Morador é consulta.
- Atalhos do painel abrem listagens.
- Suporte estreito operacional garante navegação, sem prometer experiência mobile-first.
- Isolamento de todas entidades em 203/A × 203/B tem cobertura unitária; cenário completo multiunidade via UI ainda limitado pelo único Morador de desenvolvimento.


## Autenticação de desenvolvimento

O formulário usa exclusivamente as contas públicas e fictícias de src/mocks/mockUsers.js, documentadas no README. Os perfis conceituais são ADMINISTRADOR, PORTEIRO e MORADOR. Proprietário/Inquilino continuam sendo vínculos com unidade, não perfis de autenticação.

A verificação local de e-mail/senha serve apenas para permitir acesso determinístico aos três ambientes durante o desenvolvimento. **Não representa segurança**: o código e as credenciais chegam ao navegador e as rotas ainda não têm autorização. Logout apenas retorna ao login; não existe sessão autenticada. “Lembrar de mim” não implementa persistência de sessão.

A integração deverá substituir essa camada pelo serviço/endpoint real de autenticação, remover as credenciais mock e implementar autorização de rotas e de recursos no servidor. A equipe ainda deverá decidir contrato, política de sessão, permissões e tratamento de falhas; este documento não define URL, tokens, claims, cookies ou mecanismo de armazenamento.

Primeiro acesso, criação e recuperação de senha continuam demonstrativos: não criam contas, não modificam as credenciais mock e não enviam mensagens. Não usar dados reais enquanto essas integrações não existirem.

## Execução e hospedagem

O build gera uma aplicação estática em dist. Um servidor de hospedagem deve servir os assets e encaminhar rotas da aplicação para index.html, pois a navegação usa BrowserRouter. pnpm dev e pnpm preview já atendem o desenvolvimento local; não constituem backend.

Os metadados de compartilhamento usam /og.png. Ao definir a hospedagem definitiva, configurar uma URL pública absoluta da imagem para os consumidores que a exigem. Nenhum provedor ou domínio é obrigatório para executar o projeto.

# Integração com Backend — Condo+

## Estado atual e limites

React/Vite/Router, JavaScript, componentes compartilhados, layouts por perfil e estado em AppDataContext. Primeira integração em andamento: src/services/api.js (cliente HTTP com bearer token, ativado por VITE_API_URL) e src/services/cadastrosApi.js alimentam os cadastros de Unidades, Torres e Moradores (leitura e comandos), com estados loading/error/retry em AppDataContext. Login por CPF via API (src/services/authApi.js) e usuário logado via `GET /usuarios/me` (currentResident e nome do condomínio). Com a API ligada, as coleções dos módulos não integrados começam vazias (`apiInitialData`), sem dados de demonstração. O login valida contas fictícias locais em src/mocks/mockUsers.js e direciona para o perfil correspondente; Admin/Portaria usam ator fixo, Morador usa currentResident. Não interpretar rotas/controles visíveis como autorização.

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
- currentResident duplica residents e não é sincronizado após edição (no modo API ele vem de `/usuarios/me` e é recarregado a cada login).

Não remover defesas de torre+unidade antes de substituir sua função por identidade acordada.

## DECISÕES NECESSÁRIAS ANTES DO PRIMEIRO ENDPOINT REAL

Itens marcados já foram definidos pelo backend; o detalhe está em “Contrato já integrado”.

- [x] userId: UUID de `Usuario`, na claim `id` do JWT
- [x] condominiumId: UUID, na claim `condominio_id` do JWT; não há header de tenant
- [x] unitId: UUID de `Apartamento`; a torre é opcional (`torreId` nulo em condomínio horizontal)
- [ ] person/resident identity
- [ ] vínculo Morador-Unidade
- [x] areaId: UUID de `AreaComum` (existe no backend, ainda não integrado no front)
- [x] ator autenticado: usuário do JWT (subject = CPF), resolvido no servidor
- [ ] permissões: a claim `perfil` existe, mas o backend ainda não restringe rotas por perfil
- [ ] DTOs: definidos para Torre/Apartamento/Área comum; demais módulos pendentes
- [ ] enums
- [ ] nullable
- [ ] datas
- [ ] timezone
- [ ] erros
- [ ] concorrência
- [ ] paginação quando necessária

Este checklist **não define** tipos de ID, URLs, JWT, refresh token, política de sessão, formato final de erro/DTO, idempotência ou versionamento. A equipe deve decidir por fluxo, incluindo escopo de acesso e dados que não podem chegar ao cliente.

## Contrato já integrado

Backend: [condomais-backend](https://github.com/ArthurFloro/condomais-backend) (Spring Boot). Documentação interativa em `/swagger-ui.html` da API.

### Configuração e autenticação

- `VITE_API_URL` liga a integração; sem ela, tudo é mock. Ver README, seção “Conectando à API”.
- Login: `POST /auth/login` com `{ cpf, senha }` devolve `{ token }` (JWT, expira em 8 h). Primeiro acesso: `POST /auth/primeiro-acesso` com `{ cpf, novaSenha }`, só para usuário pré-cadastrado sem senha.
- Toda chamada envia `Authorization: Bearer <token>`. Não há cookies; o CORS do backend libera `localhost:5173` e `127.0.0.1:5173`.

### Erros

A API responde erros com o corpo `{ status, erro, mensagem, caminho, timestamp }`:

| Status | Quando | O que o front exibe |
|---|---|---|
| 400 | Regra de negócio violada, JSON ou parâmetro inválido | `mensagem` da API |
| 401 | Token ausente, inválido ou expirado; login com CPF/senha errados | “Sessão inválida ou expirada” (texto fixo) |
| 403 | Acesso a dados de outro condomínio | `mensagem` da API |
| 404 | Registro não encontrado | `mensagem` da API |
| 409 | Conflito: duplicidade, exclusão bloqueada por vínculos, horário já reservado | `mensagem` da API |
| 5xx | Falha interna | Texto fixo; detalhes ficam só no log do servidor |

Sem corpo JSON ou sem `mensagem`, o front usa um texto padrão por status (`src/services/api.js`).
- Claims do JWT: `sub` (CPF), `id`, `perfil`, `condominio_id`. O front lê as claims só para escopar requisições; a validação é do servidor.
- Tela de login (`LoginPage` + `src/services/authApi.js`): pede CPF com máscara `000.000.000-00` e envia nesse formato, que é como o backend grava (coluna de 14 caracteres). O token vai para o `sessionStorage` e é apagado em “Sair”. Um perfil sem área mapeada recusa a entrada.
- `perfil` no backend é texto livre. O front aceita, sem diferenciar maiúsculas nem acentos: `ADMIN`/`ADMINISTRADOR`/`ADMINISTRAÇÃO` → `/admin`, `PORTARIA`/`PORTEIRO` → `/portaria`, `MORADOR` → `/morador`. Um enum no backend eliminaria essa tolerância.
- As rotas do front ainda não exigem sessão: sem token, as telas integradas mostram “Sessão inválida” em vez de redirecionar ao login.

### Cadastros: Unidades, Torres e Moradores (Administração)

`src/services/cadastrosApi.js` carrega os três juntos (`AppDataContext.reloadCadastros`) e recarrega após cada comando:

| Tela | Leitura | Comandos |
|---|---|---|
| Unidades | `GET /condominios/torres?condominioId=` e `GET /condominios/apartamentos?condominioId=` (condomínio do token) | `POST`/`PUT /condominios/apartamentos[/{id}]`, `DELETE /condominios/apartamentos/{id}`, `POST /condominios/torres` (botão “Nova torre”) |
| Moradores | `GET /usuarios` (só ADMIN; perfil `MORADOR`) | `POST`/`PUT /usuarios[/{id}]`, `PUT /usuarios/{id}/desativar` e `/ativar` |

| Front (`units`) | API |
|---|---|
| id | apartamento.id (UUID) |
| number | apartamento.numero |
| tower / towerId | nome e id da torre; vazio sem torre |
| status | apartamento.status em maiúsculas (texto livre no backend) |
| owners / residents | nomes dos moradores **ativos** vinculados (proprietários / todos) |

| Front (`residents`) | API (`UsuarioResponseDTO`) |
|---|---|
| id, name, cpf, email, phone | id, nome, cpf (formatado), email, telefone |
| tower, unit, unitId | torreNome, apartamentoNumero, apartamentoId |
| relation, isOwner | vinculo (`PROPRIETARIO`/`INQUILINO`) |
| status | `ATIVO`/`INATIVO` (inativo não consegue logar) |
| pendingFirstAccess | primeiroAcessoPendente (ainda sem senha) |

- O formulário de morador continua pedindo Torre + número da unidade; o front resolve o `apartamentoId` pela combinação.
- Morador cadastrado fica **sem senha**: ele cria a senha em “Ativar minha conta” (`AuthFlowPage` → `authApi.primeiroAcesso`), que chama `POST /auth/primeiro-acesso` e em seguida faz login. A recusa do backend (CPF sem cadastro ou já ativado) aparece como uma mensagem única, sem revelar qual dos dois casos é.
- Os vínculos proprietário/morador da unidade saem do cadastro de moradores; o formulário de unidade não os edita no modo API.
- Excluir uma unidade com moradores ou registros vinculados é recusado pela API (409), com a mensagem exibida.
- Unidade sem torre (condomínio horizontal) aparece na lista, mas ainda não pode receber morador pelo formulário, que exige torre.
- Sem `/usuarios` no backend (404) ou sem perfil ADMIN (403), a lista de moradores vem vazia e o resto funciona.

### Limitações conhecidas do backend

- **Escopo por condomínio vem da query string.** As listagens aceitam `condominioId` por parâmetro e não o conferem com o token. O front sempre envia o do token, mas a proteção precisa ficar no servidor.
- `status` de apartamento é texto livre; os valores `OCUPADO`, `LIVRE`, `INATIVO` e `RESERVADO` são convenção, não enum validado.

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

Com `VITE_API_URL`, o login usa a API (ver “Contrato já integrado”). Sem ela, o formulário usa as contas públicas e fictícias de src/mocks/mockUsers.js, por CPF, documentadas no README. Os perfis conceituais são ADMINISTRADOR, PORTEIRO e MORADOR. Proprietário/Inquilino continuam sendo vínculos com unidade, não perfis de autenticação.

No modo mock, a verificação local de CPF/senha serve apenas para permitir acesso determinístico aos três ambientes durante o desenvolvimento. **Não representa segurança**: o código e as credenciais chegam ao navegador. Nos dois modos, as rotas do front ainda não exigem sessão, e “Lembrar de mim” não implementa persistência.

Ainda pendente: proteger as rotas do front conforme a sessão, redirecionar ao login quando o token expirar, e integrar a recuperação de senha. A autorização por perfil também precisa existir no servidor.

### Setup inicial do Administrador

A rota `/admin/configuracao-inicial` possui uma proteção específica no front. Ela usa perfil e condomínio presentes na sessão somente para decisões positivas já comprovadas: sessão ausente volta ao login, perfil não administrativo é recusado e Administrador com `condominio_id` volta ao Dashboard. A ausência dessa claim **não** autoriza criar condomínio.

Para liberar o Wizard, um futuro adaptador deverá consultar um contrato autenticado do backend e normalizar sua resposta para a camada `features/setupWizard/setupAccess.js`. Esse contrato ainda não existe e precisa distinguir explicitamente:

- Administrador autorizado sem condomínio vinculado;
- Administrador com condomínio configurado;
- verificação indisponível ou inconclusiva;
- perfil sem autorização para o Setup.

Enquanto não houver confirmação confiável, a rota exibe um estado de erro com nova tentativa e mantém o restante da Administração inalterado. A confirmação precisa vir do servidor; não deve ser deduzida de nome vazio, falha em `/usuarios/me`, erro de conexão ou ausência de `condominio_id`. O backend também deverá autorizar todas as futuras operações de criação, pois a proteção React não substitui controle de acesso no servidor.

O rascunho das seis etapas permanece apenas em memória. Recarregar ou fechar a página descarta seu conteúdo; retomada persistente depende de contrato e persistência do backend.

Com a API, o primeiro acesso cria a senha de verdade. No modo mock, ele e a recuperação de senha são demonstrativos. A recuperação continua demonstrativa nos dois modos: não altera senhas nem envia mensagens.

## Execução e hospedagem

O build gera uma aplicação estática em dist. Um servidor de hospedagem deve servir os assets e encaminhar rotas da aplicação para index.html, pois a navegação usa BrowserRouter. pnpm dev e pnpm preview já atendem o desenvolvimento local; não constituem backend.

Os metadados de compartilhamento usam /og.png. Ao definir a hospedagem definitiva, configurar uma URL pública absoluta da imagem para os consumidores que a exigem. Nenhum provedor ou domínio é obrigatório para executar o projeto.

## Documentação funcional V2.0: o que depende do backend

Já feito só no frontend: componentes `NumberStepper`, `SearchableSelect` e `TimeSelect` (tipos `stepper`, `search` e `timeselect` no `DynamicForm`); Setup Wizard com quantidade de torres, nomes sugeridos, listas suspensas, duplicação de torre e aviso antes de descartar; Portaria sem acesso a chamados/ocorrências.

Aguardam contrato da API (não implementar no front antes):

- Térreo (andar zero, térreo sem apartamentos) e reexecução segura do Wizard (CONDO-01, CONDO-13).
- Encomenda para unidade vazia e sem destinatário identificado; dados do retirante e conferência do código (CONDO-05, 05.1).
- Visita sem autorização antecipada, com morador responsável e método de confirmação (CONDO-07).
- Reservas: horário de funcionamento e taxa da área, pagamento manual pelo ADMIN (CONDO-08). Decisão de produto pendente: o código atual usa aprovação pelo proprietário. (Reserva que atravessa a meia-noite já feita: campo "Termina no dia" e `dataFim` na API.)
- Ocorrências com 3 estados, mensagens e solução obrigatória (CONDO-09).
- Mudança de unidade com histórico e vínculos múltiplos (CONDO-11).

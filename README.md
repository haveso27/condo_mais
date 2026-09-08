# Condo+

Front-end de um sistema de gestão condominial com experiências específicas para **Morador**, **Portaria** e **Administração**.

O projeto está em fase de protótipo funcional. Todos os fluxos rodam no navegador com dados simulados; ainda não há autenticação real, API ou banco de dados.

## Tecnologias

- React
- React Router
- Vite
- JavaScript
- CSS
- Lucide React
- pnpm

## Como executar localmente

### Pré-requisitos

- Node.js 20 ou superior
- pnpm

### Instalação

```bash
git clone https://github.com/haveso27/condo_mais.git
cd condo_mais
pnpm install
pnpm dev
```

Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`.

No Windows, depois de instalar as dependências, também é possível executar o arquivo `Abrir Condo+.cmd`.

### Outros comandos

```bash
# Gerar a versão de produção
pnpm build

# Visualizar a versão de produção localmente
pnpm preview
```

## Acessos de demonstração

Na tela inicial, use os botões de acesso rápido ou os dados abaixo:

| Perfil | CPF | Senha |
| --- | --- | --- |
| Morador | `111.111.111-11` | `condo123` |
| Portaria | `222.222.222-22` | `condo123` |
| Administração | `333.333.333-33` | `condo123` |

> Esses dados são apenas demonstrativos. A tela de login não valida credenciais em um servidor.

## Módulos disponíveis

### Morador

- Dashboard e comunicados
- Cadastro e acompanhamento de visitantes
- Reservas de áreas comuns e consulta de disponibilidade
- Abertura e acompanhamento de chamados
- Aprovação de reservas vinculadas à unidade do proprietário
- Consulta de perfil e dados da unidade

### Portaria

- Controle de visitantes
- Entrada e saída de prestadores
- Registro e retirada de encomendas
- Avisos
- Chamados e ocorrências
- Histórico de operações

### Administração

- Cadastro de moradores e unidades
- Consulta de encomendas e visitantes
- Gestão de reservas, comunicados e chamados
- Configurações do condomínio

## Rotas principais

| Área | Rota inicial | Rotas complementares |
| --- | --- | --- |
| Autenticação | `/` | `/primeiro-acesso`, `/recuperar-senha` |
| Morador | `/morador` | `/morador/comunicados`, `/morador/visitantes`, `/morador/reservas`, `/morador/chamados`, `/morador/aprovacoes`, `/morador/perfil` |
| Portaria | `/portaria` | `/portaria/visitantes`, `/portaria/prestadores`, `/portaria/encomendas`, `/portaria/avisos`, `/portaria/chamados`, `/portaria/historico` |
| Administração | `/admin` | `/admin/moradores`, `/admin/unidades`, `/admin/encomendas`, `/admin/reservas`, `/admin/visitantes`, `/admin/comunicados`, `/admin/chamados`, `/admin/configuracoes` |

## Estrutura do projeto

```text
src/
├── components/   # Componentes reutilizáveis, formulários e modais
├── config/       # Configuração de tabelas, filtros e entidades
├── context/      # Estado compartilhado da aplicação
├── layouts/      # Estruturas visuais por perfil
├── mocks/        # Dados simulados
├── pages/        # Telas de autenticação, morador, portaria e admin
├── services/     # Regras de consulta e manipulação dos dados
└── styles/       # Estilos globais e responsividade
```

## Estado e dados simulados

O estado compartilhado está em `src/context/AppDataContext.jsx`. Os registros iniciais ficam em `src/mocks/appData.js`.

As alterações feitas pela interface existem somente durante a sessão atual. Ao atualizar a página, os dados retornam ao estado inicial.

Os arquivos em `src/services/` isolam as regras de cada domínio:

- visitantes
- reservas
- encomendas
- prestadores
- avisos
- chamados
- moradores e unidades

Essa camada foi criada para facilitar a troca gradual dos mocks por chamadas HTTP.

## Orientação para integração com o backend

Uma estratégia recomendada é manter a assinatura pública dos serviços e substituir internamente o acesso aos arrays por um cliente HTTP.

Recursos esperados na API:

| Recurso | Operações necessárias |
| --- | --- |
| Autenticação | login, primeiro acesso, recuperação e renovação de sessão |
| Moradores | listar, cadastrar, editar, ativar e desativar |
| Unidades | listar, cadastrar, editar e gerenciar vínculos |
| Visitantes | listar, cadastrar, autorizar, recusar, registrar entrada e saída |
| Prestadores | listar, cadastrar, registrar entrada e saída |
| Encomendas | listar, registrar recebimento, retirada e devolução |
| Reservas | listar, verificar disponibilidade, criar, aprovar, recusar e cancelar |
| Comunicados | listar, publicar, editar e encerrar |
| Chamados | listar, criar, comentar, priorizar e alterar status |
| Histórico | listar operações com filtros de data, usuário e tipo |
| Notificações | listar, marcar como lida e emitir eventos para os perfis envolvidos |

### Pontos importantes

- Definir autenticação e autorização por perfil no backend; as rotas ainda não são protegidas.
- Vincular moradores, proprietários e unidades por identificadores, não por textos exibidos na interface.
- Padronizar os status usados no front-end antes de fechar os contratos da API.
- Retornar datas em ISO 8601 e definir o tratamento do fuso horário no servidor.
- Implementar paginação, busca e filtros no servidor para grandes volumes.
- Preservar as atualizações entre módulos: por exemplo, uma encomenda registrada pela portaria deve gerar notificação para o morador.

## Fluxo de colaboração

Antes de começar uma alteração:

```bash
git checkout main
git pull origin main
git checkout -b feature/nome-da-alteracao
```

Depois de desenvolver e testar:

```bash
git add .
git commit -m "Descrição objetiva da alteração"
git push -u origin feature/nome-da-alteracao
```

Abra um Pull Request para revisão antes de integrar a alteração à `main`.

## Situação atual

- Front-end responsivo e compilando
- Fluxos principais funcionais com mocks
- Sem backend ou banco de dados
- Sem persistência após recarregar a página
- Sem testes automatizados
- Preparado para integração progressiva com uma API


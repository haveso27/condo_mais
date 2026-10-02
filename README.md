# Condo+

Front-end de gestão condominial com ambientes para Morador, Portaria e Administração.

## Tecnologias

React, React DOM, React Router, Lucide React, JavaScript, CSS e Vite com plugin React.

## Requisitos

- Node.js 22.13.0 ou superior (validado com 24.21.0).
- pnpm 11.19.0 e Git.
- Confira a instalação com `node --version` e `pnpm --version`.

As versões das dependências estão fixadas em package.json e pnpm-lock.yaml.

## Instalação

```sh
git clone https://github.com/haveso27/condo_mais.git
cd condo_mais
pnpm install --frozen-lockfile
```

Se necessário, instale o gerenciador com `npm install --global pnpm@11.19.0`. Não gere lockfiles de outros gerenciadores.

## Executando o projeto

```sh
pnpm dev --host 127.0.0.1
```

Abra o endereço impresso no terminal, normalmente http://127.0.0.1:5173. Ctrl+C encerra o servidor. Se a porta estiver ocupada, o Vite poderá selecionar outra; para escolher explicitamente, acrescente `--port 5174`.

## Build

```sh
pnpm build
pnpm preview --host 127.0.0.1 --port 4173
```

O build gera dist/, que não deve ser editado ou versionado. Execute build novamente após alterar o código antes de usar preview. Para hospedagem estática, configure fallback das rotas para index.html.

## Deploy (Vercel)

O `vercel.json` já define instalação com pnpm, build, pasta `dist` e o fallback das rotas para `index.html`. Sem esse fallback, recarregar uma página como `/admin/unidades` daria 404.

No projeto da Vercel, configure as variáveis:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | URL pública da API, sem barra no final (ex.: `https://condomais-api.onrender.com`) |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1`, para usar o pnpm exato do `package.json` |

`VITE_API_URL` é embutida no build: ao alterá-la, faça **Redeploy**. A URL de produção da Vercel precisa estar em `CORS_ALLOWED_ORIGINS` na API; URLs de preview mudam a cada deploy e não são liberadas. O passo a passo completo (Neon, Render e Vercel) está em `docs/DEPLOY.md` do [condomais-backend](https://github.com/ArthurFloro/condomais-backend).

## Testes

```sh
pnpm test
git diff --check
```

A suíte usa node:test e renderização React com Vite, sem framework adicional. Os servidores Vite dos testes (tests/viteTestServer.js) ignoram o `.env.local` e usam cache próprio: o resultado não depende da configuração local e rodar os testes não derruba um `pnpm dev` aberto. Verificações de foco, layout e navegação devem ser complementadas no navegador.

## Acessos de desenvolvimento

O login é por **CPF e senha**. Com a API ligada (seção “Conectando à API”), valem os usuários cadastrados no backend. Sem a API, o projeto usa contas fictícias locais:

| Ambiente | CPF | Senha |
|---|---|---|
| Administrador | 000.000.000-01 | CondoDev123! |
| Portaria | 000.000.000-02 | CondoDev123! |
| Morador | 000.000.000-03 | CondoDev123! |

Essas credenciais existem exclusivamente no modo mock. São públicas e fictícias, não segredos, e os CPFs são propositalmente inválidos. A fonte única é src/mocks/mockUsers.js.

No modo mock, o login rejeita credenciais incorretas, mas isso **não é segurança nem autorização**: as rotas ainda podem ser acessadas diretamente. No modo mock, primeiro acesso e recuperação são demonstrativos. Com a API, o primeiro acesso é real; a recuperação de senha continua demonstrativa e não envia e-mail.

## Estrutura

```text
public/             Logos, imagem de login e imagem de compartilhamento
src/
  components/       Componentes compartilhados
  config/           Configurações de entidades, catálogos e apresentação
  context/          AppDataContext: estado e ações em memória
  layouts/          Layouts por ambiente
  mocks/            Dados operacionais e contas fictícias locais
  pages/            Telas de acesso, Morador, Portaria e Administração
  services/         Adapters síncronos e regras locais
  styles/           CSS global e responsividade
tests/              Regras de negócio, regressão, apresentação e login
docs/
  INTEGRACAO-BACKEND.md
```

## Estado atual

- Front-end implementado, com experiências distintas para Morador e operação.
- Dados operacionais em src/mocks/appData.js; modificações ficam no Context e são descartadas ao recarregar.
- Apenas preferências dos cards do Morador usam localStorage; não há sessão autenticada.
- Autenticação demonstrativa, sem API, banco ou autorização reais.
- Morador é perfil de acesso; Proprietário/Inquilino são vínculos com unidade.
- Perfil do Morador é consulta. Notificações/perfil operacionais são demonstrativos.
- Backend e Banco de Dados serão integrados. Não utilizar dados reais ou tratar o projeto como sistema de produção.

## Integração com Backend

Leia [INTEGRACAO-BACKEND.md](docs/INTEGRACAO-BACKEND.md) para arquitetura atual, entidades, enums, datas, contratos pendentes e estratégia incremental.

Os services atuais retornam arrays/objetos de forma síncrona. A integração exigirá await, estados de carregamento/erro e reconciliação de respostas. Os mocks não devem ser importados literalmente para o banco nem usados como contrato definitivo.

### Conectando à API (desenvolvimento)

Sem configuração, o app usa apenas os mocks. Para ligar à API [condomais-backend](https://github.com/ArthurFloro/condomais-backend), copie `.env.example` para `.env.local` (ignorado pelo Git) e preencha `VITE_API_URL` com o endereço da API, por exemplo `http://localhost:8080`. Reinicie `pnpm dev` após alterar o arquivo.

Com a API ligada:

- o login autentica em `POST /auth/login` com CPF e senha de um usuário do backend. Um usuário recém-cadastrado ativa a conta em “Ativar minha conta” (CPF e nova senha), que chama `POST /auth/primeiro-acesso` e já entra no sistema;
- o perfil do usuário (`ADMIN`, `PORTARIA`, `MORADOR`...) decide a área aberta após o login;
- o token fica no `sessionStorage`: some ao fechar a aba, expira em 8 horas e é apagado em “Sair”;
- **Administração → Unidades** (com cadastro de torres) e **Administração → Moradores** usam a API para listar, criar, editar, excluir unidades e ativar/desativar moradores;
- a identidade de quem entrou (nome, unidade, vínculo) e o nome do condomínio vêm de `GET /usuarios/me`;
- **nenhum dado de demonstração aparece com a API ligada**: módulos ainda não integrados (comunicados, encomendas, visitantes, prestadores, reservas, chamados, histórico) começam vazios. Registros criados neles ficam só na memória do navegador até serem integrados;
- morador cadastrado pela Administração entra sem senha e a cria no primeiro acesso, com o CPF;
- na área do Morador aparece o **assistente virtual** (botão flutuante): ele responde perguntas como “Tem alguma encomenda para mim?” consultando, pela API (`POST /assistente/mensagens`), só os dados do morador logado. Ele precisa de `ANTHROPIC_API_KEY` configurada no backend; sem ela, o chat informa que está indisponível. No modo mock o botão não aparece.

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

## Testes

```sh
pnpm test
git diff --check
```

A suíte usa node:test e renderização React com Vite, sem framework adicional. Verificações de foco, layout e navegação devem ser complementadas no navegador.

## Acessos de desenvolvimento

Enquanto a autenticação com o backend não estiver integrada, o projeto utiliza contas fictícias locais para acessar os perfis.

| Ambiente | E-mail | Senha |
|---|---|---|
| Administrador | admin@condomais.local | CondoDev123! |
| Portaria | portaria@condomais.local | CondoDev123! |
| Morador | morador@condomais.local | CondoDev123! |

Essas credenciais existem exclusivamente no ambiente mock e deverão ser removidas quando a autenticação real for integrada. São públicas e fictícias, não segredos. A fonte única é src/mocks/mockUsers.js.

O login rejeita credenciais incorretas, mas isso **não é segurança nem autorização**: as rotas ainda podem ser acessadas diretamente. Primeiro acesso e recuperação são demonstrativos, não alteram essas contas nem enviam e-mail.

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

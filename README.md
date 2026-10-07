# GitHub Profile Builder

Aplicação web para organizar e melhorar a apresentação do seu perfil do GitHub.
Você entra com a sua conta do GitHub, cria rascunhos a partir do perfil atual,
edita os dados e o README de perfil, confere a prévia e aplica no GitHub
somente depois de revisar e confirmar.

> Nada é alterado no GitHub sem confirmação explícita na tela de revisão.

## Funcionalidades

**Rascunhos**
- Crie rascunhos a partir do seu perfil atual do GitHub (até 50 por conta).
- Renomeie, duplique e apague, um a um ou vários de uma vez.
- Se o README do seu perfil foi publicado por este app, um rascunho novo começa com as mesmas configurações.

**Perfil**
- Edite nome, bio, empresa, localização, site, usuário do X, e-mail público (entre os seus e-mails verificados), disponibilidade para contratação e redes sociais.
- Prévia do cartão de perfil enquanto você edita, com contagem de caracteres nos campos com limite.

**README de perfil**
- Três templates: Clássico (ícones), Minimalista (só texto) e Compacto (ícones menores e projetos em tabela).
- Idioma do README independente do idioma da interface: português ou inglês.
- Seções que podem ser ligadas, desligadas e reordenadas: saudação, introdução, tecnologias, projetos e contato.
- Títulos opcionais em todas as seções, com um título recomendado que pode ser trocado ou removido.
- Introdução em Markdown.
- Tecnologias de um catálogo com 200 itens, numa lista só ou separadas por categoria (linguagens, frameworks, bancos de dados, ferramentas).
- Até 6 dos seus repositórios públicos como projetos, com nome, descrição e linguagem lidos do GitHub.
- Contato em lista, em links numa linha ou em ícones, com ícones de 25 redes reconhecidas pelo endereço.
- Até 5 seções personalizadas (por exemplo, “Estudando” ou “Skills”) com título, texto e tecnologias.
- Prévia visual renderizada pela própria API de Markdown do GitHub, ou o Markdown puro.

**Aplicação no GitHub**
- Tela de revisão com o que muda em cada parte: perfil, redes sociais e README.
- Você escolhe quais partes aplicar; o README atual e o novo aparecem lado a lado.
- O app cria o repositório `usuario/usuario` quando ele ainda não existe (com aviso de que ele é público).
- Depois de aplicar, o app lê o GitHub de novo e só informa sucesso quando a mudança aparece lá.

**Interface**
- Português (Brasil) e inglês, com tema claro e escuro conforme o sistema.

## Como funciona

1. **Login com GitHub (OAuth).** Escopos pedidos: `user`, para editar o perfil e ler os e-mails verificados, e `public_repo`, para criar e atualizar o repositório público do README de perfil.
2. **Rascunhos.** Ficam guardados no PostgreSQL, ligados ao ID da sua conta do GitHub. O token de acesso fica só no cookie de sessão criptografado, nunca no banco.
3. **Prévia.** O README é gerado por uma única função, a mesma usada para publicar. Assim, o que você vê na prévia é exatamente o que vai para o GitHub.
4. **Aplicação.** Cada parte é enviada separadamente pela API do GitHub e conferida em seguida. Se algo falhar, a tela mostra o que foi aplicado e o que não foi.

## Stack

- [Next.js 16](https://nextjs.org) (App Router), React 19 e TypeScript
- Tailwind CSS 4
- [next-intl](https://next-intl.dev) para os idiomas (o idioma escolhido fica num cookie)
- PostgreSQL ([Neon](https://neon.tech)) com [Drizzle ORM](https://orm.drizzle.team)
- GitHub OAuth App e API REST/GraphQL do GitHub
- [iron-session](https://github.com/vvo/iron-session) para a sessão em cookie criptografado
- [Vitest](https://vitest.dev) para os testes
- Deploy na [Vercel](https://vercel.com) (região `gru1`, São Paulo)

## Rodar localmente

Pré-requisitos: Node.js 22 ou mais novo, um banco PostgreSQL (por exemplo, no Neon) e um GitHub OAuth App de desenvolvimento.

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env.local` e preencha os valores (veja [Variáveis de ambiente](#variáveis-de-ambiente)).

3. Crie as tabelas no banco:

   ```bash
   npm run db:migrate
   ```

4. Inicie o servidor:

   ```bash
   npm run dev
   ```

   Abra http://localhost:3000.

### OAuth App de desenvolvimento

Em https://github.com/settings/developers, abra **OAuth Apps → New OAuth App** e preencha:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback`

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `APP_URL` | URL pública do app, usada para montar a URL de callback do OAuth (ex.: `http://localhost:3000`). |
| `GITHUB_CLIENT_ID` | Client ID do GitHub OAuth App. |
| `GITHUB_CLIENT_SECRET` | Client secret do GitHub OAuth App. |
| `SESSION_SECRET` | Segredo da sessão, com pelo menos 32 caracteres. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. |
| `DATABASE_URL` | Connection string do PostgreSQL. |

Nunca faça commit do `.env.local`. Use credenciais diferentes em desenvolvimento e em produção.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento. |
| `npm run build` / `npm start` | Build e servidor de produção. |
| `npm run lint` | ESLint. |
| `npm test` | Testes (Vitest). |
| `npm run db:generate` | Gera uma migration SQL a partir de `lib/db/schema.ts`. |
| `npm run db:migrate` | Aplica as migrations no banco de `DATABASE_URL`. |

Para testar o fluxo completo à mão, siga o roteiro em [`docs/checklist-teste.md`](docs/checklist-teste.md).

## Estrutura

```
app/            Páginas e rotas (login, rascunhos, editor, aplicação)
components/     Componentes da interface
lib/github/     Cliente da API do GitHub (leitura e escrita)
lib/readme/     Gerador do README, templates, catálogo de tecnologias
lib/apply/      Plano e execução da aplicação no GitHub
lib/drafts/     Conteúdo e persistência dos rascunhos
lib/db/         Schema do banco (Drizzle)
messages/       Textos da interface (pt-BR e en)
drizzle/        Migrations SQL
```

## Deploy na Vercel

1. Envie o código para o GitHub.
2. Na Vercel, clique em **Add New → Project** e importe o repositório. O Next.js é detectado sozinho, e a região das funções vem do `vercel.json`.
3. Anote o domínio do projeto (ex.: `https://seu-projeto.vercel.app`).
4. Crie um **OAuth App de produção**, separado do de desenvolvimento:
   - Homepage URL: o domínio do passo 3
   - Authorization callback URL: `<domínio>/api/auth/callback`
5. Use bancos separados para produção e desenvolvimento. No Neon, por exemplo: o branch principal para produção e um branch `development` para o `.env.local`.
6. Em **Settings → Environment Variables** (ambiente *Production*), cadastre `APP_URL` (o domínio), `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, um `SESSION_SECRET` novo e o `DATABASE_URL` de produção.
7. Rode as migrations no banco de produção uma vez, a partir da sua máquina, com o `DATABASE_URL` de produção:

   ```bash
   npm run db:migrate
   ```

8. Faça um novo deploy (**Deployments → Redeploy**) para as variáveis valerem.

## Limites da API do GitHub

- Não é possível alterar a foto de perfil nem os repositórios fixados. O app mostra os fixados e explica como mudá-los no GitHub.
- Com o escopo `public_repo`, um repositório `usuario/usuario` privado não pode ser lido: ele aparece como “não encontrado”, e o app explica como torná-lo público.
- Um README escrito à mão não é importado para o rascunho. Ao aplicar o README, ele é substituído; a versão anterior continua no histórico de commits do repositório.

## Licenças e atribuições

- Ícones de tecnologias: [Devicon](https://devicon.dev) (MIT), versão fixada em `lib/readme/technologies.ts`. O ícone do LinkedIn também vem da Devicon.
- Ícones das redes sociais e versões claras de alguns ícones para o tema escuro: [Simple Icons](https://simpleicons.org) (CC0-1.0).
- Ícones de site, e-mail e links: [Material Design Icons](https://pictogrammers.com/library/mdi/) (Apache 2.0), servidos pela API do [Iconify](https://iconify.design).
- Logo do GitHub no botão de login: [Octicons](https://primer.style/octicons) (MIT).

As marcas pertencem aos seus donos.

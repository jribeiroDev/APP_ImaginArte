# Guia de publicação na Vercel

Este projeto usa Next.js, Drizzle ORM e Neon PostgreSQL. As credenciais da base de dados devem ficar apenas nas variáveis de ambiente da Vercel.

## 1. Criar a base de dados no Neon

1. Acede a [neon.tech](https://neon.tech) e cria uma conta ou inicia sessão.
2. Clica em **New project** e cria um projeto PostgreSQL, por exemplo `imaginarte`.
3. Escolhe a região mais próxima dos teus utilizadores.
4. Abre **SQL Editor** no projeto.
5. Abre o ficheiro [`database/schema.sql`](./database/schema.sql), copia todo o conteúdo e executa-o no SQL Editor.
6. Em **Connect**, copia a connection string com `sslmode=require`. Usa a opção pooled quando estiver disponível.

## 2. Testar localmente (opcional, recomendado)

Na raiz do projeto, cria `.env.local` a partir de `.env.example`:

```powershell
Copy-Item .env.example .env.local
```

Preenche os valores:

```env
DATABASE_URL=postgresql://utilizador:password@ep-exemplo.eu-central-1.aws.neon.tech/imaginarte?sslmode=require
AUTH_SECRET=uma-chave-aleatoria-longa-e-segura
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Não coloques `.env.local` no Git. O Next.js carrega ficheiros `.env*` a partir da raiz do projeto, mesmo quando o código está dentro de `src/`.

Depois valida:

```powershell
npm install
npm run typecheck
npm run lint
npm run build
```

## 3. Publicar o código no GitHub

1. Cria um repositório novo no GitHub.
2. Na pasta do projeto, executa:

```powershell
git add .
git commit -m "preparar base de dados Neon e deploy Vercel"
git branch -M main
git remote add origin https://github.com/UTILIZADOR/REPOSITORIO.git
git push -u origin main
```

Substitui `UTILIZADOR/REPOSITORIO` pelos dados reais do repositório.

## 4. Criar o projeto na Vercel

1. Acede a [vercel.com](https://vercel.com) e inicia sessão com GitHub.
2. Clica em **Add New → Project**.
3. Seleciona o repositório do ImaginArte e clica em **Import**.
4. Mantém o framework como **Next.js** e deixa o **Build Command** como `npm run build`.
5. Em **Environment Variables**, adiciona:

   - `DATABASE_URL`: a connection string copiada do Neon.
   - `AUTH_SECRET`: uma chave aleatória longa, diferente da usada localmente.
   - `NEXT_PUBLIC_APP_URL`: o domínio Vercel, por exemplo `https://imaginarte.vercel.app`.

6. Seleciona **Production**, **Preview** e **Development** quando quiseres usar a mesma configuração nos três ambientes.
7. Clica em **Deploy**.

## 5. Confirmar o deploy

1. Abre o domínio fornecido pela Vercel.
2. Se aparecer um erro, consulta **Vercel → Project → Deployments → View Function Logs**.
3. Confirma em **Settings → Environment Variables** que `DATABASE_URL` está definido e que não contém aspas adicionais.
4. Sempre que alterares variáveis de ambiente, faz um novo redeploy em **Deployments → Redeploy**.

## Atualizações futuras da base de dados

Para alterações pequenas e controladas, cria uma nova migração Drizzle:

```powershell
npm run db:generate
npm run db:migrate
```

O comando `db:migrate` usa a `DATABASE_URL` do ambiente local. Para uma alteração pontual, também podes executar o SQL no Neon SQL Editor. Faz sempre backup ou confirma a alteração num branch/base de dados de teste antes de apagar ou renomear colunas.

## Notas importantes

- Nunca publiques `DATABASE_URL` ou `AUTH_SECRET` no GitHub, no código cliente ou em variáveis com prefixo `NEXT_PUBLIC_`.
- Valores monetários estão guardados em cêntimos (`price_cents`, `total_cents`) para evitar erros de arredondamento.
- O ficheiro SQL cria tabelas, enums e índices de forma segura para execução repetida.

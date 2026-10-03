# Imaginarte

Mobile-first order management app built with Next.js, React, TypeScript, Tailwind CSS, Drizzle ORM and Neon PostgreSQL.

## Local development

```powershell
npm install
npm run dev
```

The interface currently runs with local demo data so it can be reviewed without Neon credentials. Copy `.env.example` to `.env.local` and add a Neon pooled `DATABASE_URL` when connecting the production data layer.

The current login screen validates email and password locally and stores a browser session so the prototype can be used privately during development. For production, this gate should be connected to the Neon `users` and `sessions` tables already defined in `src/lib/db/schema.ts`.

## Neon and Vercel

The complete Portuguese deployment guide is in [`DEPLOY_VERCEL.md`](./DEPLOY_VERCEL.md).
The standalone SQL schema to run in Neon SQL Editor is [`database/schema.sql`](./database/schema.sql).

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript validation
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:migrate` — apply migrations to Neon

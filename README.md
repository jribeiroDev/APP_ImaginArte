# Imaginarte

Mobile-first order management app built with Next.js, React, TypeScript, Tailwind CSS, Drizzle ORM and Neon PostgreSQL.

## Local development

```powershell
npm install
npm run dev
```

The interface currently runs with local demo data so it can be reviewed without Neon credentials. Copy `.env.example` to `.env.local` and add a Neon pooled `DATABASE_URL` when connecting the production data layer.

## Neon setup

1. Create a Neon PostgreSQL project.
2. Copy the pooled connection string into `DATABASE_URL`.
3. Configure the endpoint with Scale to Zero disabled if the database must remain active when idle.
4. Run `npm run db:generate` and `npm run db:migrate`.
5. Add the same variables to the Vercel project.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript validation
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:migrate` — apply migrations to Neon

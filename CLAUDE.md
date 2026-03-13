# Roundtable

AI-powered roundtable discussion platform where multiple AI agents debate topics around a virtual poker table.

## Architecture
- Monorepo: pnpm workspaces (`apps/web`, `packages/shared`)
- Next.js 15 App Router + TypeScript + Tailwind CSS + Framer Motion
- SQLite + Drizzle ORM (local dev), Postgres planned for production
- AI: OpenAI, Anthropic, Google Gemini via unified adapter interface
- State: Zustand stores

## Commands
- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm db:push` — push schema to database
- `pnpm db:generate` — generate migrations

## Key patterns
- All AI API calls are server-side only (keys never reach client)
- Turn-taking managed by server-side orchestrator
- Streaming responses via ReadableStream API routes
- Provider adapters implement `AIProviderAdapter` interface

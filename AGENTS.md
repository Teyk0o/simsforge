# AGENTS.md for SimsForge

SimsForge is an open-source mod manager for The Sims 4. Full-stack monorepo: Next.js/Tauri frontend (/app), Express.js/PostgreSQL backend (/backend).

## Project Structure
```
simsforge/
├── app/                      # Frontend: Next.js 14 + React 18 + Tauri 2
│   ├── src/app/             # Pages: library/, profiles/, settings/, splash/
│   ├── src/components/      # UI: mod/, profile/, layouts/, ui/, providers/
│   ├── src/lib/             # Services: API client, CurseForge, fake detection
│   └── src-tauri/           # Rust desktop config
└── backend/                  # Backend: Express.js + Prisma + PostgreSQL
    ├── src/controllers/     # Route handlers
    ├── src/services/        # CurseForge API, fake mod reports
    └── src/app.ts           # Express setup
```

Reference README.md for full details.
Update README.md after significant changes (new features, setup steps, screenshots).

## Tech Stack
- Frontend: Next.js 16.1, React 19.2, TypeScript 5.9 strict, Tailwind CSS 4.1, Axios 1.13, Tauri 2.9 (Windows MSI)
- Backend: Node.js 18+, Express.js 5.2, TypeScript 5.9, Prisma ORM, Zod 4.3, Winston, Helmet 8.1
- Tools: ESLint, Prettier, npm 9+, PostgreSQL 12+, Rust (Tauri build)

## Commands
Always run from repo root.

### Prerequisites
```
# Install deps
Per package ex: cd app/backend && npm install
# Database
cd backend && npm run db:push
```

### Development
```
# Backend dev server
cd backend && npm run dev  # http://localhost:5000

# Tauri desktop dev
cd app && npm run tauri dev

# Lint all
npm run lint --workspace=app && npm run lint --workspace=backend
# Format
npm run format --workspace=app && npm run format --workspace=backend
```

### Build
```
# Frontend web
cd app && npm run build

# Desktop MSI (Windows)
cd app && npm run build:tauri  # Output: src-tauri/target/release/bundle/msi/
```

## Testing Instructions
No tests implemented yet. Before any commit/PR:
```
# Lint and type check
npm run lint --filter=app && npm run lint --filter=backend
# Manual: Start backend/frontend, test mod search/CurseForge integration, fake mod reports
```
Add tests for changes. Run full stack manually. Ensure no Zod validation fails.

## Git Workflow
1. `git pull origin main --rebase`
2. `git checkout -b <type>/<scope>` (ex: `feat/mod-search`)
3. Develop on branch, atomic commits.
4. Lint/format before commit.
5. `git push -u origin <branch>`
6. Update README.md after significant changes (new features, setup steps, ...).
7. Create PR to main with:
   - Title: `[<type>/<scope>] <description>`
   - Description: Changes, test plan, screenshots if UI
8. One PR per feature. Merge only after CI/lints pass.

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

## Code Style
- English only: code, comments, commits, docs.
- TypeScript strict mode everywhere.
- Frontend: Functional components/hooks. Forms like `app/components/DashForm.tsx`. Tables like `app/components/Table.tsx`.
- Backend: Zod validation all inputs. Services for business logic.
- No direct fetch in components: Use `app/lib/api/client.ts`.
- Security: Validate/sanitize all inputs. Use Helmet/CORS. Never trust user inputs.

Good examples:
- UI: `app/components/ui/`
- API: `backend/src/services/curseforge.ts`

Avoid: Class components, direct HTTP in UI, unvalidated inputs.

## Boundaries
- Never commit without lint/format.
- No pushes to main.
- Respect env vars (DATABASE_URL, NEXT_PUBLIC_BACKEND_URL).
- Fixed window 1280x720 for Tauri.
- Report issues if blocked.
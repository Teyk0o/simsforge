![banner.png](assets/banner.png)

![Backend Coverage](https://img.shields.io/badge/Coverage_96.4%25-C21325?style=for-the-badge&logo=jest&logoColor=white)
![Frontend Tests](https://img.shields.io/badge/161_tests_passed-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

SimsForge is an open-source mod manager for The Sims 4. It provides a desktop application for mod discovery, installation, and management through integration with CurseForge, along with a system for detecting and reporting fake/malicious mods to protect the community.

## Overview

SimsForge is a full-stack monorepo application featuring:

- **Desktop Application**: Next.js with Tauri for native Windows client
- **REST API Backend**: Express.js server with PostgreSQL database
- **CurseForge Integration**: Search, browse, and manage The Sims 4 mods from CurseForge
- **Fake Mod Detection**: Report and track suspicious/malicious mods with community contributions

## Architecture

```
simsforge/
├── app/                      # Frontend: Next.js 14 + React 18 + Tauri 2
└── backend/                  # Backend: Express.js + PostgreSQL
```

## Technology Stack

### Frontend (`/app`)
- **Framework**: Next.js 16.1 with React 19.2
- **Styling**: Tailwind CSS 4.1 + PostCSS
- **Desktop**: Tauri 2.9 (Windows MSI bundler)
- **Language**: TypeScript 5.9
- **HTTP Client**: Axios 1.13
- **UI Components**: Phosphor Icons 2.1
- **i18n**: i18next 24.2 + react-i18next 16.2 + i18next-browser-languagedetector 8.1
- **Utilities**: Tailwind Merge, clsx

**Key Features**:
- Responsive web application
- Native Windows desktop client
- **Multi-language support** (English, French, Spanish, Portuguese, Hindi, Russian, Chinese)
- Mod discovery and search interface
- Virtual list rendering for performance
- CurseForge integration for mod browsing
- Real-time game console for viewing Sims 4 logs
- Auto-installation of Sims Log Enabler mod
- **Parallel disk operations** with auto-detected concurrency based on disk speed (HDD/SSD/NVMe)

### Backend (`/backend`)
- **Runtime**: Node.js 18+ with npm 9+
- **Framework**: Express.js 5.2
- **Language**: TypeScript 5.9 (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod 4.3 schema validation
- **Logging**: Winston 3.19
- **Security**: Helmet 8.1, CORS

**Key Services**:
- Mod metadata and integration with CurseForge API
- Fake mod detection and reporting system
- RESTful API for mod discovery and management
- Tools distribution API for helper mods (Sims Log Enabler)

## Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **PostgreSQL**: 12+ for backend database
- **Rust** (optional): Required for building the Tauri desktop client

### Installation

Clone the repository:
```bash
git clone https://github.com/Teyk0o/simsforge
cd simsforge
```

Install dependencies for each package:

```bash
# Frontend
cd app
npm install
cd ..

# Backend
cd backend
npm install
cd ..
```

### Environment Variables

#### Backend (`/backend/.env`)
```env
# Server
NODE_ENV=development
PORT=5000
API_BASE_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/simsforge

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=info
```

#### Frontend (`/app/.env.local`)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### Development

#### Running the Backend

```bash
cd backend
npm run dev
```

The API server will start on `http://localhost:5000`.

#### Running the Frontend

```bash
cd app
npm run dev
```

The development server will start on `http://localhost:3000`.

Or to run the desktop client:

```bash
cd app
npm run tauri dev
```

#### Building the Desktop Client

```bash
cd app
npm run build:tauri
```

This generates a Windows MSI installer in `src-tauri/target/release/bundle/msi/`.

### Database

#### Setting up PostgreSQL

1. Create a new PostgreSQL database:
```sql
CREATE DATABASE simsforge;
```

2. Push the Prisma schema:
```bash
cd backend
npm run db:push
```

## Project Structure

### Frontend (`/app`)

```
src/
├── app/                    # Next.js app directory
│   ├── library/           # Mod library/browsing
│   ├── profiles/          # Mod profiles management
│   ├── settings/          # App settings
│   └── splash/            # Splash/welcome screen
├── components/            # Reusable React components
│   ├── mod/              # Mod browsing components
│   ├── profile/          # Profile management components
│   ├── console/          # Game console for real-time logs
│   ├── layouts/          # Layout components
│   ├── ui/               # Generic UI components
│   └── providers/        # Context providers
├── context/              # React context for state management
├── hooks/                # Custom React hooks (search, cache, view modes)
├── i18n/                 # Internationalization configuration and locales
│   ├── index.ts          # i18next configuration
│   └── locales/          # Translation files (en-US, fr-FR, es-ES, etc.)
├── lib/                  # Services (API client, CurseForge, fake detection)
├── types/                # TypeScript type definitions
└── src-tauri/            # Tauri desktop application
    ├── src/              # Rust backend
    └── tauri.conf.json   # Tauri configuration
```

### Backend (`/backend`)

```
src/
├── config/           # Configuration (database, environment)
├── controllers/      # Route handlers
├── services/         # Business logic (CurseForge, fake detection)
├── routes/           # API route definitions
├── middleware/       # Express middleware
├── types/            # TypeScript type definitions
├── utils/            # Helper utilities (logging, errors)
└── app.ts            # Express app setup
```

## Internationalization (i18n)

SimsForge supports multiple languages with automatic language detection based on browser/OS settings.

### Supported Languages

- 🇺🇸 **English (US)** - `en-US` (default)
- 🇫🇷 **French** - `fr-FR`
- 🇪🇸 **Spanish** - `es-ES`
- 🇧🇷 **Portuguese (Brazil)** - `pt-BR`
- 🇮🇳 **Hindi** - `hi-IN`
- 🇷🇺 **Russian** - `ru-RU`
- 🇨🇳 **Chinese (Simplified)** - `zh-CN`

### Features

- **Automatic Language Detection**: Detects user's preferred language from browser/OS settings
- **Manual Language Selection**: Users can change language in Settings → Application → Language
- **Persistent Preference**: Language choice is saved in localStorage
- **Complete Coverage**: All UI text, buttons, messages, and tooltips are translated
- **No Reload Required**: Language changes apply instantly without page refresh

### Implementation

The i18n system uses `i18next` with:
- **react-i18next** for React integration
- **i18next-browser-languagedetector** for automatic language detection
- Translation files located in `app/src/i18n/locales/`
- Fallback to English (US) if selected language is unavailable

### Adding Translations

Translation files are JSON-based and located in `app/src/i18n/locales/[locale].json`:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "settings": {
    "title": "Settings"
  }
}
```

To add a new language:
1. Create a new locale file: `app/src/i18n/locales/[locale-code].json`
2. Add the locale to `SUPPORTED_LANGUAGES` in `app/src/i18n/index.ts`
3. Add language name and flag to `LANGUAGE_NAMES` and `LANGUAGE_FLAGS`

## API Documentation

The backend provides a REST API with the following main endpoints:

- **CurseForge Integration**: `/api/v1/curseforge/*` - Mod search, metadata, categories
- **Fake Mod Detection**: `/api/v1/reports/*` - Report suspicious mods, retrieve detection data
- **Tools Distribution**: `/api/v1/tools/*` - Download helper tools (Sims Log Enabler)

## Testing

### Backend

The backend has comprehensive unit and integration tests using Jest.

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npx jest tests/unit

# Run only integration tests
npx jest tests/integration
```

**Current Coverage:**

| Metric | Coverage |
|--------|----------|
| Statements | 96.54% |
| Branches | 85.54% |
| Functions | 96.36% |
| Lines | 96.40% |

Test suites cover:
- **Unit tests**: Controllers, services, routes, middleware, utilities
- **Integration tests**: Full HTTP endpoint testing with mocked dependencies

### Frontend

The frontend uses Vitest with @testing-library/react for unit testing.

```bash
cd app

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

Test suites cover:
- **Utilities**: Formatters, path sanitizer, text normalizer, concurrency pool
- **Hooks**: useDebounce
- **Services**: FakeScoreService, LogEnablerService, GameLogService, DiskPerformanceService
- **API Client**: Axios instance creation, interceptors, HTTP helpers

## Code Quality

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd app
npm run lint
```

### Code Formatting

```bash
# Backend (using Prettier)
cd backend
npm run format
```

## Building for Production

### Frontend (Web)

```bash
cd app
npm run build
```

### Desktop Client

```bash
cd app
npm run build:tauri
```

This creates a Windows MSI installer with the following specifications:
- **Window Size**: 1280x720 (fixed, non-resizable)
- **Bundler**: Windows MSI installer
- **Output**: `src-tauri/target/release/bundle/msi/`

## Development Guidelines

### Code Standards

- **Language**: English for all code, comments, commits, and documentation
- **Type Safety**: Full TypeScript strict mode enabled
- **Code Quality**: ESLint and Prettier enforced across all packages

### Git Workflow

1. Create a feature branch following Conventional Branch Names: `type/scope/description`
   - Examples: `feat/sheep-ai`, `fix/auth-bug`, `docs/api-guide`

2. Make atomic commits following Conventional Commits:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation changes
   - `test:` adding or updating tests
   - `refactor:` code restructuring
   - `perf:` performance improvements
   - `chore:` build/dependencies/etc

3. Ensure code quality standards before pushing:
   ```bash
   npm run lint
   npm run format
   ```

4. Submit a pull request with:
   - Clear description of changes
   - Reference to any related issues
   - Test plan and verification steps

## Security

**NEVER TRUST USER INPUT. ALWAYS VALIDATE AND SANITIZE.**

- **API Security**: CORS configuration, helmet security headers for HTTP headers
- **Input Validation**: Zod schema validation on all user inputs
- **Database**: PostgreSQL with Prisma ORM providing parameterized queries

## Contributing

1. Follow the [Code Standards](#code-standards) section
2. Create a feature branch following Conventional Branch Names: `type/scope/description`
3. Implement your changes
4. Ensure code quality with linting and formatting
5. Submit a pull request with detailed description and test plan

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

## Project Status

SimsForge is in active development.

## Support

For issues, feature requests, or questions:
1. Review existing issues in the repository
2. Create a detailed issue report with reproduction steps

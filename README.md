![banner.png](assets/banner.png)

SimsForge is an open-source mod manager and distribution platform for The Sims 4. It features a desktop client for one-click installation and automatic updates, alongside a centralized web hub that empowers creators through ethically-aligned early access monetization. Fully compliant with EA's modding policy, the project aims to unify the fractured community ecosystem while ensuring content remains accessible to all players.

## Overview

SimsForge is a full-stack monorepo application that provides:

- **Web & Desktop Application**: Modern Next.js frontend with Tauri desktop client for Windows
- **REST API Backend**: Express.js server with PostgreSQL database
- **Mod Integration**: Custom CurseForge API wrapper for comprehensive mod metadata
- **Creator Tools**: Dashboard for mod publishers to manage releases and analytics
- **Payment Integration**: Stripe support for monetization and early access content

## Architecture

```
simsforge/
├── app/                      # Frontend: Next.js 14 + React 18 + Tauri 2
└── backend/                  # Backend: Express.js + PostgreSQL
```

## Technology Stack

### Frontend (`/app`)
- **Framework**: Next.js 16.1 with React 19.2
- **Styling**: Tailwind CSS 4.1 + PostCSS 8.5
- **Desktop**: Tauri 2.9 (Windows MSI bundler)
- **Language**: TypeScript 5.9
- **HTTP Client**: Axios 1.13
- **UI Components**: Phosphor Icons 2.1
- **Utilities**: Tailwind Merge 3.4, clsx 2.1

**Key Features**:
- Responsive web application
- Native Windows desktop client
- Mod discovery and management interface
- Creator dashboard
- User settings and account management
- Virtual list rendering for performance

### Backend (`/backend`)
- **Runtime**: Node.js 18+ with npm 9+
- **Framework**: Express.js 5.2
- **Language**: TypeScript 5.9 (strict mode)
- **Database**: PostgreSQL 8.16 with migrations
- **Authentication**: JWT + Argon2 password hashing
- **Validation**: Zod 4.3 schema validation
- **Logging**: Winston 3.19
- **Testing**: Jest 30.2 with 70% coverage threshold
- **Security**: Helmet 8.1, CORS, Rate Limiting 8.2
- **Payment**: Stripe 20.1

**Key Services**:
- User authentication and authorization
- Mod management and metadata
- Creator dashboard functionality
- File upload and storage
- Search capabilities (Fuse.js)
- Caching layer
- Payment processing (Stripe)

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
JWT_SECRET=your_jwt_secret_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/simsforge

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret

# File Storage
UPLOAD_DIR=./uploads
```

#### Frontend (`/app/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
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
npm run tauri dev
```

The development server will start on `http://localhost:3000`.

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

2. Run migrations:
```bash
cd backend
npm run migrate
```

## Project Structure

### Frontend (`/app`)

```
src/
├── app/              # Next.js app directory
│   ├── api/          # API routes
│   ├── auth/         # Authentication pages
│   ├── dashboard/    # Creator dashboard
│   ├── mods/         # Mod browsing interface
│   └── settings/     # User settings
├── components/       # Reusable React components
├── context/          # React context for state management
├── hooks/            # Custom React hooks
├── lib/              # Utilities and services
├── types/            # TypeScript type definitions
└── utils/            # Helper functions
```

### Backend (`/backend`)

```
src/
├── config/           # Configuration (database, environment)
├── controllers/      # Route handlers
├── repositories/     # Data access layer
├── services/         # Business logic
├── routes/           # API route definitions
├── middleware/       # Express middleware
├── database/         # Migrations and schemas
├── validators/       # Input validation (Zod)
├── types/            # TypeScript type definitions
└── utils/            # Helper utilities
```

## API Documentation

The backend provides a REST API with the following main endpoints:

- **Authentication**: `/api/auth/*`
- **Mods**: `/api/mods/*`
- **Creators**: `/api/creators/*`
- **Users**: `/api/users/*`
- **Settings**: `/api/settings/*`
- **Categories**: `/api/categories/*`
- **Tags**: `/api/tags/*`
- **CurseForge Integration**: `/api/curseforge/*`

## Testing

### Run Backend Tests

```bash
cd backend
npm run test
```

### Run Tests with Coverage

```bash
cd backend
npm run test:coverage
```

### Test Frontend Components

```bash
cd app
npm run test
```

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
- **Testing**: Target 70% code coverage for backend
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

3. Ensure all tests pass before pushing:
   ```bash
   npm run test
   npm run lint
   ```

4. Submit a pull request with:
   - Clear description of changes
   - Reference to any related issues
   - Test plan and verification steps

## Security

**NEVER TRUST USER INPUT. ALWAYS VALIDATE AND SANITIZE.**

- **Authentication**: JWT-based with secure token management
- **Password Security**: Argon2 hashing
- **API Security**: Rate limiting, CORS configuration, helmet headers
- **Input Validation**: Zod schema validation on all user inputs
- **Database**: PostgreSQL with prepared statements
- **Role-Based Access**: Middleware-enforced authorization levels

## Contributing

1. Follow the [Code Standards](#code-standards) section
2. Create a feature branch with a descriptive name
3. Implement your changes with tests
4. Ensure all tests pass and code is formatted
5. Submit a pull request with detailed description

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

## Project Status

SimsForge is in active development.

## Support

For issues, feature requests, or questions:
1. Review existing issues in the repository
2. Create a detailed issue report with reproduction steps

# Agentic Web Development Boilerplate

A modern web application boilerplate designed for AI Agent development, built with Next.js 15, TypeScript, and hexagonal architecture principles.

## Features

- **Modern Tech Stack**: Next.js 15 with React 19, TypeScript, and Tailwind CSS v4
- **Hexagonal Architecture**: Clean architecture with domain-driven design principles
- **Type Safety**: Full TypeScript support with Zod validation and branded types
- **Error Handling**: Robust error handling with neverthrow Result types
- **Database**: SQLite with Drizzle ORM for local development
- **UI Components**: Pre-configured shadcn/ui components
- **Testing**: Vitest for unit and integration testing
- **Code Quality**: Biome for linting and formatting

## Architecture

This project follows hexagonal architecture with three main layers:

- **Domain Layer** (`src/core/domain/`): Business logic, types, and port interfaces
- **Application Layer** (`src/core/application/`): Use cases and application services
- **Adapter Layer** (`src/core/adapters/`): External service implementations

## Getting Started

### Prerequisites

- Node.js 22.x or later
- pnpm package manager

### Installation

#### 1. Clone the repository

```bash
git clone <repository-url>
cd web-template-for-agent
```

#### 2. Install dependencies

```bash
pnpm install
```

#### 3. Set up environment variables

```bash
cp .env.example .env
```

#### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Lint code with Biome
- `pnpm lint:fix` - Lint and fix issues
- `pnpm format` - Format code with Biome
- `pnpm typecheck` - Type check with TypeScript
- `pnpm test` - Run tests with Vitest

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   └── {domain}/      # Domain-specific components
│   └── styles/            # Global styles
├── core/                  # Backend architecture
│   ├── domain/            # Domain layer
│   │   └── {domain}/
│   │       ├── types.ts   # Domain entities and DTOs
│   │       └── ports/     # Port interfaces
│   ├── application/       # Application layer
│   │   ├── context.ts     # Dependency injection context
│   │   └── {domain}/      # Use cases and services
│   └── adapters/          # Adapter layer
│       └── {service}/     # External service implementations
├── actions/               # Server actions
└── lib/                   # Shared utilities
```


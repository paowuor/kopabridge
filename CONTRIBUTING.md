# Contributing to KopaBridge

Thank you for contributing to KopaBridge

KopaBridge is a unified energy data infrastructure platform designed to normalize PAYGo solar and IoT financial data into standardized credit intelligence APIs.

---

# Engineering Principles

We prioritize:

- Security-first engineering
- Clean architecture
- Maintainable code
- Consistent formatting
- Documentation-driven development
- Scalable backend patterns

---

# Development Workflow

## Branch Strategy

Never commit directly to `main`.

Create feature branches using the following conventions:

```bash
feature/auth-module
feature/provider-connectors
feature/swagger-docs
fix/jwt-refresh-bug
refactor/prisma-service
```

---

# Commit Message Convention

Use meaningful commits following this format:

```bash
type(scope): description
```

Examples:

```bash
feat(auth): add JWT authentication strategy
fix(users): resolve email uniqueness validation
docs(readme): update setup instructions
refactor(prisma): simplify database service injection
chore(ci): add GitHub Actions workflow
```

## Allowed Types

- feat
- fix
- docs
- refactor
- chore
- test
- perf

---

# Code Style

## Formatting

This project uses:

- Prettier
- ESLint

Before Committing:

```bash
npm run format
npm run lint
```

---

# TypeScript Standards

## Required Practices

- Use strict typing
- Avoid `any`
- Prefer interfaces and DTOs
- Keep functions small and focused
- Use dependency injection properly
- Write reusable services

## Avoid

- Business logic inside controllers
- Massive files
- Hardcoded secrets
- Unhandled exceptions
- Duplicated logic

---

# API Standards

## REST Conventions

Use resource-based endpoints:

```txt
GET    /v1/users
POST   /v1/users
GET    /v1/users/:id
PATCH  /v1/users/:id
DELETE /v1/users/:id
```

All API routes must be versioned

```txt
/v1/users
/v1/providers
```

---

# Security Standards

KopaBridge handles sensitive financial and energy-related data.

Always:

- Validate inputs
- Sanitize data
- Use DTO validation
- Avoid logging secrets
- Encrypt sensitive credentials
- Use environment variables

Never commit:

- `.env`
- API keys
- Credentials
- Secrets

---

# Testing Expectations

All critical services should include:

- Unit tests
- Integration tests
- Error handling tests

---

# Documentation

When adding major features:

- Update README if necessary
- Add Swagger decorators
- Document environment variables
- Document breaking changes

---

# Pull Requests

Before opening a PR:

- Ensure lint passes
- Ensure tests pass
- Rebase against latest develop branch
- Add clear PR descriptions

---

# Architecture Goals

KopaBridge is designed as:

- API-first infrastructure
- Fintech-grade backend systems
- Eventual multi-provider normalization platform
- Consent-driven data interoperability layer

Maintain scalability and modularity in all engineering decisions.
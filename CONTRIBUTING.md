# Contributing to Aura

Thanks for your interest in contributing. This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.x
- Docker (optional, for full stack testing)

### Development Setup

```bash
git clone https://github.com/ioeldev/aura.git
cd aura

cd backend && bun install
cd ../frontend && bun install

# Run from repo root
bun dev
```

The dev server typically runs at `http://localhost:5173` (frontend) with the backend on port `2655`.

## How to Contribute

1. **Fork** the repository and create a branch (`git checkout -b feature/your-feature`).
2. **Make your changes** — follow the existing code style.
3. **Test** your changes locally.
4. **Commit** with clear messages (`feat: add X`, `fix: resolve Y`).
5. **Push** to your fork and open a **Pull Request** against `main`.

## Pull Request Guidelines

- Keep PRs focused and reasonably small when possible.
- Describe what changed and why.
- Ensure your branch is up to date with `main` before submitting.

## Code Style

- Use the project's existing formatting and conventions.
- Run `bun run build` (or equivalent) to ensure the project still builds.

## Questions?

Open an [Issue](https://github.com/ioeldev/aura/issues) for discussion.

# Contributing to FIDScript Deploy

Thank you for your interest in contributing to FIDScript Deploy.

---

## Development Workflow

1. Read `CLAUDE.md` to understand the project structure and workflow
2. Read `AGENT_STATUS.md` to know the current phase
3. Read the relevant phase document in `docs/phases/phase-XX.md`
4. Read the relevant service specification in `docs/services/[service].md`
5. Make changes following the Development Rules in CLAUDE.md
6. Write tests for all changes
7. Update `AGENT_STATUS.md` after completing phase deliverables

---

## Code Standards

- **150 Line Limit**: Split files exceeding 150 lines
- **Feature-Based Structure**: Organize code by feature, not by type
- **No Emojis in UI**: Use text or icon components only
- **API First**: Implement API endpoints before dashboard components
- **Provider Abstraction**: Never hardcode external services

---

## Branch Strategy

- `main` - Production-ready code
- `feat/[feature-name]` - New features
- `fix/[issue-name]` - Bug fixes
- `phase-XX` - Phase-specific work

---

## Commit Messages

Format: `type(scope): description`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

---

## Testing

All changes must include tests:

```bash
pnpm test
```

---

## Questions

For questions, open an issue on the repository.

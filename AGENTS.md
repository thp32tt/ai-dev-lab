# Instructions for coding agents

This repository is a deliberately small project used to evaluate AI-assisted software development.

## Rules

1. Read `README.md` and `BACKLOG.md` before changing code.
2. Keep changes scoped to the assigned backlog item unless a supporting change is required for correctness, tests, or CI.
3. Preserve existing API behavior unless the assigned task says otherwise.
4. Add or update automated tests for every behavior change.
5. Prefer the Python standard library over new dependencies when reasonable.
6. Never commit secrets, tokens, local databases, virtual environments, or generated caches.
7. Run `pytest` before declaring the task complete.
8. Summarize changed files, behavioral changes, test results, and any remaining risks.

## Architecture

- `app/main.py`: HTTP API and static-file entry point
- `app/db.py`: SQLite connection and schema initialization
- `static/index.html`: intentionally dependency-free browser UI
- `tests/`: API-level regression tests
- `.github/workflows/ci.yml`: continuous integration

## Definition of done

A task is complete only when:

- the requested behavior is implemented,
- tests cover the important success and failure paths,
- existing tests still pass,
- documentation is updated when the public behavior changes,
- the solution does not introduce unnecessary complexity.

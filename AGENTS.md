# UW2 웹포팅 최우선 정책 (2026-11-03)

uw2-web/** 작업에서는 uw2-web/AGENTS.md와 uw2-web/docs/ORIGINAL_DOS_TO_WEB_DISASSEMBLY_MASTER_PLAN_20261031.md가 아래 AgentBoard 지침과 과거 P1/P3 로드맵보다 우선한다.

웹포팅 개발 계속진행해 = 실제 JavaScript/Canvas 브라우저 게임 기능 개발. DOS/8086/MZ/EMS/BIOS/VGA/OPL/PIC/PIT/FMDRV 게스트 에뮬레이터 신규 개발·수정·테스트 추가는 자동개발에서 전면 금지한다. GitHub CI의 uw2-web/tools/enforce-webport-scope.mjs가 에뮬레이터 파일 변경 및 실제 게임 기능 없는 커밋을 거부한다.

## Scope

This priority applies only to the `uw2-web-port` branch and the `uw2-web/**` game tree. VR, DX11, DX9Ex, DXVK, and localization work are unaffected. The executable UW2 scope guard lives on `uw2-web-port`; the `main` copy of this policy is guidance, not a substitute for an enforcing CI run.

---
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

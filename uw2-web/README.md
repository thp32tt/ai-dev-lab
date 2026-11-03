# 대항해시대 II — 독립 브라우저 웹게임

**2026-11-03 사용자 정책:** 한국어 DOS 원작의 게임 화면·규칙·상태·오디오·저장을 네이티브 JavaScript/Canvas/브라우저 저장소로 직접 포팅한다. **DOS/8086/EMS 에뮬레이터 개발은 중단·동결**한다.

- 최우선 개발 정책: [AGENTS.md](AGENTS.md)
- 유일한 자동개발·게임 완성 계획: [마스터 계획](docs/ORIGINAL_DOS_TO_WEB_DISASSEMBLY_MASTER_PLAN_20261031.md)
- 웹 게임 실행 경로: web/index.html → web/app.js. 원본 GRAPH/한국어 UI/항구·해상 이동/거래/10개 원본 저장 슬롯 및 별도 웹 임시저장·이어하기 기능을 보유한다.
- 과거 8086/MZ/INT21/EMS/가상 DOS CPU 및 관련 테스트 도구는 읽기 전용 분석 기록으로 유지하지만 **새로 수정하지 않으며 게임 개발 성과로 삼지 않는다**.
- 실기/동등성 경계: 여섯 주인공 전체 실제 신규게임, 전투·시나리오·엔딩 및 사용자 PC 최종 검증은 UNTESTED/HOLD다.

## 실행
원본을 가진 N100에서 python3 /home/chatgpt-runner/uw2-web/serve.py 를 실행한 경우 브라우저 http://192.168.0.48:18082 에서 접속한다. UW2_GAME_DIR와 UW2_WEB_PORT 환경변수로 원본 경로·포트를 지정한다. 원본 EXE/DAT/LZW 등 저작권 에셋은 GitHub에 올리지 않는다.

## 자동개발
자동 입력 '웹포팅 개발 계속진행해'를 받으면 GitHub 최신 HEAD와 AGENTS.md/마스터 계획부터 읽고, web/ 게임 입력→상태→화면 기능을 실제로 구현하고 연결 테스트한다. 에뮬레이터 연구·신규 DOS handler·CPU probe는 선택하지 않는다. 정확한 SHA와 CI를 검증하되 실브라우저/원본 DOS 비교는 별도 판정한다.

과거 개발 내역은 GitHub 이전 커밋 이력에 보존하며 현행 자동개발 할 일로 해석하지 않는다.

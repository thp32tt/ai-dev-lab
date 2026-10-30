# UW2 원본 완전 포팅 — P1 재배치 후보 그래프 + KOEI.COM 기동 경로 (2026-10-31)

## 작업 계약 / 원본 고정
- 마스터: `ORIGINAL_DOS_TO_WEB_DISASSEMBLY_MASTER_PLAN_20261031.md`.
- GitHub 브랜치: `thp32tt/ai-dev-lab@uw2-web-port`.
- 실물: 사용자 보유 한국어 DOS판; `original-baseline-20261031.json`에 있는 정확한 SHA-256과 맞지 않으면 분석 실패. 바이너리 원문, 그래픽, 오디오, 게임 데이터는 커밋하지 않는다.
- 게임의 UI·음악·게임 규칙·조작·콘텐츠를 수정하지 않는다. 아래는 **P1 역분석 작업**이며 원본 네이티브 포팅 전체 완료 증명이 아니다.

## 1. MZ 재배치 테이블 전수 감사
`tools/mz-relocation-callgraph.mjs`는 MZ relocation 엔트리를 하나씩 확인한다. 각 relocation 엔트리는 DOS 로더가 실행 이미지 내 16-bit **세그먼트 워드**에 로드 세그먼트를 더할 위치임을 명확히 한다. 이것만으로 far pointer나 CALL이 되는 것은 아니다.

세그먼트 워드 바로 앞의 opcode/offset 조합이 `9A off16 seg16`(far CALL) 또는 `EA off16 seg16`(far JMP)인지 비교해 후보를 추린다. **데이터 영역에 우연히 해당 바이트가 존재할 수 있으므로 후보로만 관리한다**. FF /3, /5 등의 간접 호출, 분할된/동적 제어 흐름, 오버레이, near CALL은 아직 대상에 포함하지 않는다.

| 원본 | MZ relocation 전체 | 9A형 후보 | EA형 후보 | 나머지 relocation | 예외 |
|---|---:|---:|---:|---:|---|
| MAIN.EXE | **5,245** | **5,036** | 0 | 209 | 원본 이미지 바깥 세그먼트 워드 0 |
| OPEN.EXE | **23** | 0 | 0 | 23 | 0 |
| END.EXE | **22** | 0 | 0 | 22 | 0 |
| GRPDRV.EXE | **6** | 1 | 1 | 4 | 1: initialized image 밖을 가리키는 세그먼트 값, 이것만으로 오류 단정 금지 |
| 합계 | **5,296** | **5,037** | **1** | **258** | 원본 파일 4개 |

- 정적 9A/EA 후보 합계 **5,038개**, 파일 내 상대 타깃 주소 기준 **351개 대상 그룹**(MAIN 349, GRPDRV 2).
- 전체 후보 인덱스: `docs/p1-far-transfer-candidates-20261031.json` (모든 원본 소스 raw 위치·정적 목적지 image offset을 기록; 원본 기계어 바이트는 저장하지 않음).
- 재생성 프로그램: `tools/p1-callgraph-export.mjs`. 실제 원본 SHA가 고정값과 다르면 거부.
- 실물 검사와 독립 synthetic regression: `tests/mz-relocation-callgraph.test.mjs`, `tests/p1-original-relocations.test.mjs`, `tests/p1-callgraph-snapshot.test.mjs` 모두 PASS.
- 음악 디스패처 `MAIN.EXE raw 0xE8CA`를 가리키는 기존 정본 direct FAR CALL **9곳** 모두 해당 실행 파일 relocation 데이터와 1:1 대응. 근거: `web/reverse-evidence.js` 및 `docs/BROWSER_M25_MAIN_MUSIC_CALL_INVENTORY_20261030.md`. 해당 9개가 어느 실제 화면에서 실행되는지는 별도 runtime/caller 검증 전 미확정이다.
- 중요: 숫자 5,038은 **해석된 함수 개수 / 완전한 게임 호출 그래프 / 분석 완료율이 아니다**.

## 2. KOEI.COM 실행기 — 원본 바이너리 바이트 검증
`KOEI.COM` SHA-256 `81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36`, 776 bytes.
- COM 시작의 상대 JMP로부터 실제 코드 진입 file raw `0x292`(PSP 런타임 오프셋 `0x392`) 계산 확인.
- shared DOS EXEC wrapper raw `0x115`에서 `MOV AX,4B00h; INT 21h`; 뒤이어 `AH=4Dh; INT 21h`로 반환 상태를 읽는 호출 경로 확인.
- 다음 4개 DOS 파일명 raw 문자열, `MOV DX,imm16`의 PSP-adjusted 주소, `E8 rel16` 공유 호출이 각각 일치.

| 파일명 | 문자열 raw | MOV DX raw | wrapper CALL raw | wrapper 목표 raw |
|---|---|---|---|---|
| FMDRV.COM | `0x13` | `0x254` | `0x257` | `0x115` |
| OPEN.EXE | `0x1D` | `0x25F` | `0x262` | `0x115` |
| MAIN.EXE | `0x26` | `0x269` | `0x26C` | `0x115` |
| END.EXE | `0x2F` | `0x277` | `0x27A` | `0x115` |

- OPEN 직후 raw `0x265`: `OR AH,AH; JNZ` — 비정상 반환 종류라면 MAIN 실행 경로 우회.
- MAIN 직후 raw `0x26F`: `OR AH,AH; JNZ` — 반환 종류 비정상이면 END 실행 우회.
- MAIN 직후 raw `0x273`: `OR AL,AL; JZ` — 반환 코드가 0이면 END 실행 우회.
- END.EXE 실행은 **무조건 수행하는 것이 아니라 위 분기에 종속**된 원본 경로다. 초기 네 파일 순서는 원본 정적 실행 사이트로 확인되었으며, DOS 런타임에서 모든 경로의 실동작까지 증명한 것은 아니다.
- 툴: `tools/koei-launch-chain.mjs`; 변조(이름, 반환 분기, 점프, CALL displacement, 해시) 검출 회귀 `tests/koei-launch-chain.test.mjs` **PASS**.

## 3. 계획 대비 현재 진척 및 다음 실행 순서
- **P0 PASS:** 원본 설치 80개 파일 중 분류한 게임 자산 61/61 현재 원본 해시와 일치.
- **P1 진행:** MAIN/OPEN raw↔REA 주소 매핑, MZ 4개 relocation 전수 구조 검사, 정적 far 후보 그래프 원본 재생성 일치, KOEI.COM 원본 조건부 launcher 경로 확인. 이는 P1 전체 완료가 아니다.
- 다음 P1: `KOEI.COM`의 실제 DOS 실행 시간/메모리/드라이버 등록을 DOS 참조 trace로 검증하고, GRPDRV/END/OPEN의 호출·인터럽트 경로 및 MAIN의 동적 호출·near CALL/게임 상태 조건을 증명. CALL 후보는 실제 코드 경계 확인 뒤에만 validated로 승격.
- 그 후 P2: 동일 입력의 실제 DOS 프레임버퍼, 타이밍, 메모리 상태, FMDRV/OPL 이벤트 및 원본 세이브 diff 기준을 만들고, 기존 웹 부분 구현을 검증된 원본 기반으로 한 단위씩 대체한다.
- **미검증/미완료:** P1 전체 역어셈블리, 모든 CALL 의미, 원본 DOS 동적 실행 대조, 원본 화면의 픽셀/타이밍/음원/세이브 bit-exact, 모든 시나리오/전투/엔딩, P2~P9. 완료율 또는 게임 동일성 주장을 하지 않는다.

## 4. 실제 재현 명령 (보유 원본 설치 경로 필요)
```bash
node uw2-web/tests/mz-relocation-callgraph.test.mjs
node uw2-web/tests/p1-original-relocations.test.mjs
node uw2-web/tests/p1-callgraph-snapshot.test.mjs
node uw2-web/tests/koei-launch-chain.test.mjs
node uw2-web/tools/koei-launch-chain.mjs "/path/to/user/KOEI.COM"
node uw2-web/tools/mz-relocation-callgraph.mjs "/path/to/user/MAIN.EXE"
```

이 단위의 변경은 추적도구·근거 그래프·원본 해시 재생성 테스트·문서에 한정되며 현재 웹 게임 엔진 소스/리소스를 수정하지 않는다.

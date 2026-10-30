# UW2 원본 무변경 포팅 계획 실행 기록 — P0 완료 / P1 착수
날짜: 2026-10-31 KST

**정본:** 사용자 보유 한국어판 DOS 파일. 코드 브랜치 `thp32tt/ai-dev-lab@uw2-web-port`.
**적용 계약:** `ORIGINAL_DOS_TO_WEB_DISASSEMBLY_MASTER_PLAN_20261031.md`. 원본 바이너리·리소스는 읽기 전용, 게임 플레이 코드/화면/음악은 이 작업에서 **수정하지 않음**.

## P0 실제 산출물 — PASS (자산 기준선)
- `tools/original-inventory.mjs`: 원본 폴더 최상위 80개 일반 파일 SHA-256/크기 조사, 모든 EXE의 MZ header·CS:IP·SS:SP·재배치 테이블 주소 범위 검증, COM의 로딩 기본 형식 분리. 헤더 오류/핵심 누락/확정 해시 변경은 fail-closed.
- `docs/original-baseline-20261031.json`: 핵심 실행 모듈 6개 + 데이터/리소스 후보 55개 = **61개**의 실제 크기·SHA 기록. 설치 폴더의 기타 문서·편집 도구 등 19개는 공개 baseline에서 제외; 이것을 곧 원본 61개 전체의 인증이라고 주장하지 않는다.
- `web/reverse-evidence.js`의 이미 고정된 OPEN/MAIN/FMDRV/KOEI/D2 해시에 더하여 `END.EXE`/ `GRPDRV.EXE` 실제 해시 확정. 기존 정보 수정 없음.
- `tests/original-inventory.test.mjs`: 합성 MZ relocation/image/entry/신뢰 실패 검사 PASS.
- `tests/original-baseline.test.mjs`: N100에 있는 사용자 보유 실물 **61/61 SHA-256 PASS**, 원본 파일 쓰기 작업 없음.

### 핵심 실행 파일 검사
| 파일 | 크기 (byte) | MZ 헤더 | 원본 이미지 | RELOC 수 | DOS CS:IP | SHA 정본 |
|---|---:|---:|---:|---:|---|---|
| KOEI.COM | 776 | COM | 776 | 해당 없음 | COM loader +0100h | `81968de0…a96` |
| FMDRV.COM | 5,162 | COM | 5,162 | 해당 없음 | COM loader +0100h | `0e859627…6db` |
| OPEN.EXE | 42,167 | 512 | 41,655 | 23 | 0000:2CE6 | `f7ddc1ad…7eb` |
| MAIN.EXE | 288,823 | 21,504 | 267,319 | 5,245 | 0000:32F4 | `1718bbbb…7747` |
| END.EXE | 52,241 | 512 | 51,729 | 22 | 0000:668E | `9265ca5e…1a30` |
| GRPDRV.EXE | 22,063 | 512 | 21,551 | 6 | 0000:0000 | `bf9d3c82…9064c` |

※ 위의 SHA 접두/접미는 편의 표시이며 **정확한 전체 64글자 SHA-256**은 GitHub의 `original-baseline-20261031.json`을 기준으로 한다. RELOC는 MZ 헤더에 적힌 항목 수로, '역어셈블리 완료 함수 수'가 아님.

## P1 원본 파일 ↔ Ghidra 주소 교차검증 — 첫 단위 PASS
- `tools/rea-source-map.mjs`, `tests/rea-source-map.test.mjs`: 원본 MZ 이미지 file offset ↔ Ghidra 16-bit load linear 주소(베이스 `0x10000`) 역변환, 원본 로딩 이미지 끝과 uninitialized DATA/BSS 분리.
- **MAIN.EXE** raw `0x5400..0x46737` ↔ REA loaded `0x10000..0x51437` (이미지 267,319 bytes): REA CODE 파티션 5개 연속, BSS `0x51437..0x554B7` 16,512 bytes, entry `0x132F4`. REA 자동 탐지 1,261 함수 **후보**. 재배치 5,245개.
- **OPEN.EXE** raw `0x200..0xA4B7` ↔ REA loaded `0x10000..0x1A2B7` (이미지 41,655 bytes): REA CODE 파티션 3개 연속, BSS `0x1A2B7..0x1D3A7` 12,528 bytes, entry `0x12CE6`. REA 자동 탐지 248 함수 **후보**. 재배치 23개.
- 원본 바이트 기반으로 P1 주소·이미지 크기·REA CODE 범위·BSS 시작·entry 역변환 검사 PASS. 기존 `main_analyze.stdout.json`, `open_analyze.json`, `main_entry_decompile.json`, `open_entry.json`와 대조.
- 예: MAIN의 raw `0xE8CA` 음악 디스패처는 이미지 `0x94CA` → REA `0x194CA`. REA 주소와 raw file offset을 무심코 동일시하면 잘못된 코드를 역분석하므로 포팅 함수 증거에는 두 좌표를 모두 기록한다.

## 지금까지 **아직 미완료 / 판정 불가**
1. 위 1,261/248 **후보가 전부 실제 함수인지, 모든 간접 분기·오버레이·DOS 호출을 포함하는지 검증하지 않음**. P1 전체 역어셈블리 완료율 계산 금지.
2. `END.EXE`, `GRPDRV.EXE`, `KOEI.COM`, `FMDRV.COM`의 end-to-end 디스어셈블리 및 원본 호출 체인 추적 미완료. MAIN/OPEN의 BSS는 원본 파일 바이트가 아님.
3. 원본 DOS 참조 실행의 frame/palette/audio/게임 상태 differential corpus는 P2 작업 대상이며 아직 없음.
4. 기존 브라우저 런타임은 부분 재현. **원본 전체와 동등한 게임이라고 선언하지 않음**. 오프닝의 blit/timing, 항구·해상 음악, 전투·전 시나리오 등은 계속 HOLD.
5. 55개 리소스 후보의 해시는 **현재 실물과 고정한 기준선**이지, 그 자체로 콘텐츠의 정품 여부/로직 의미를 증명하지 않는다.

## 바로 다음 P1 작업 순서
1. MZ relocation 5,245/23개를 코드·데이터 타깃으로 분류하고 인식되지 않은 far-pointer/간접 call 경로를 추적.
2. `KOEI.COM` → `OPEN.EXE` → `MAIN.EXE` → `END.EXE` 실행 전환 및 `GRPDRV.EXE`/`FMDRV.COM` 인터럽트 연결의 원본 조건을 증명.
3. 6인 시작 화면·메뉴·세이브/로드, 항구/항해, 거래, 전투, EVENT/SNR 각 7개를 raw offset call graph에 연결. 미확정 기능은 차단.
4. P2 DOS 참조 trace를 만들어 입력/화면/팔레트/OPL/게임 상태 비교가 가능한 것부터 네이티브 JS/WASM 구현을 교체.

**중복 집계:** 이 문서는 구현·테스트·동일 실행 readback에 대한 증거 기록이지 원본 포팅 전체 완료 선언이 아니며, 동일 성과를 커밋 수만큼 점수화하지 않는다.

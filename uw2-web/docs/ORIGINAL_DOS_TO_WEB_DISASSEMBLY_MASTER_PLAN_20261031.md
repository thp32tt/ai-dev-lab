# 대항해시대 II 한국어 DOS 원본 → 웹 완전동작 포팅 마스터 계획
- 수립: 2026-10-31 KST; 개정: 2026-10-31 KST (전체 디컴파일/하이브리드 런타임 우선)
- 기준: `thp32tt/ai-dev-lab@uw2-web-port`; 실제 한국어판 DOS 설치 파일만 정본. REA/Ghidra 분석은 참고 출력이며 **실행 파일의 실제 바이트, DOS 참조 실행 결과**로 재확인한다.
- 목표: **원본과 동일한 게임**을 브라우저에서 실행. 개조판·편의기능 추가·대사 재작성·현대식 밸런스 조정·새 인터페이스·임의의 음악/장면/동작 생성 **금지**.
- 진행 상태 (2026-10-31 KST): **P0 원본 61개 해시 검증 PASS; P1 MAIN/OPEN 원본↔Ghidra 주소·BSS 검증 PASS, MZ 4개 실행 파일 재배치 5,296건 전수 검사 PASS, 정적 far 제어 이전 후보 5,038건/351개 타깃 그룹 추출 PASS, KOEI.COM 조건부 DOS EXEC 기동 경로 실물 검사 PASS.** P1 전체 함수·간접/near 호출·동적 상태 분석 미완료. P3 CPU/BIOS/DOS 일부 구현 및 원본 KOEI.COM 기본 26명령 부분 실행, 명시적 합성 DOS 환경에서 4분기 최대 190명령 실행/INT66h 중단 확인까지 진행했으나 실제 초기 DOS IVT·PSP·FMDRV 하드웨어/참조 실행 스냅샷 미확보로 실제 DOS 실행·게임 부팅은 HOLD; FMDRV 원본 바이트의 합성 조건 30,644명령 상주·원본 INT66h 핸들러 29명령 호출·복귀는 별도 PASS(음악 재현 아님); P2 실제 기준 트레이스와 P4~P9 전체 원작 동등성은 미완료. 근거: `ORIGINAL_P0_P1_EXECUTION_20261031.md`, `ORIGINAL_P1_RELOCATION_LAUNCHER_20261031.md`, `p1-far-transfer-candidates-20261031.json`. **제어 이전 후보 수는 포팅 완료율/검증된 함수 수가 아님.**

## 1. 변경 금지 계약 (전 단계 공통)
1. 한국어 DOS 원본의 화면(해상도·팔레트·폰트·좌표·애니메이션·순서·타이밍), 입출력, 음악/효과음, 게임 규칙(16-bit 정수 오버플로·난수·틱), 이벤트/시나리오/엔딩, 저장/불러오기 형식을 동일하게 유지한다. 웹 API로 대체하는 외피만 허용하고, 게임에 보이는 결과는 바꾸지 않는다.
2. 원본을 모르는 상태에서는 **정확히 모른다**고 표시하고 개발 게이트를 차단한다. 파일명/호출 주소/코드 흐름만으로 의미를 추측해 구현하지 않는다. 영문판·HORIEDIT·다른 포팅 코드는 검증 힌트일 뿐 한국어판 근거가 아니다.
3. 브라우저 Native 실행을 최종 목표로 유지하되, **원본 DOS 실행(도구 기반 참조)**을 판정 기준으로 사용한다. 단순 DOS 에뮬레이터만 붙여 놓고 네이티브 역어셈블리 포팅 완료라고 선언하지 않는다. 역으로 충실한 참조 실행이 없는데 JS의 그럴듯한 화면을 ‘원본 동일’이라고 하지 않는다.
4. 실제 게임 화면에 웹 전용 컨트롤러, 진단 패널, 근사 팔레트/그림/음악, 임의 선택지, 데모 기능을 추가하지 않는다. 개발자 진단은 화면/배포 경로와 격리한다. 기존 구현의 비원본 요소는 우선 격리/교체 대상이며 검증 전 '완료'가 아니다.
5. 저작권 원본 EXE/COM/DAT/LZW/MML·세이브 원본 바이트는 GitHub에 올리지 않는다. 사용자 보유 파일을 로컬에서만 열고 GitHub에는 SHA-256, 구조적 메타데이터, 주소/근거, **직접 작성한 코드와 테스트**만 남긴다. 자산이 없으면 정확성 검사를 실패로 처리한다.

## 2. 고정 입력과 추적 기준
- 실행 체인: `KOEI.COM` / `OPEN.EXE` / `MAIN.EXE` / `END.EXE` / `GRPDRV.EXE` / `FMDRV.COM`; 연결/기동 순서는 DOS 참조에서 별도 확정.
- 리소스 체인: `D2.MML`, `MENU.DAT`, `MESSAGE.DAT`, `SNR0..6.{DAT,MES}`, `EVENT0..6.DAT`, `KOUKAI2.DAT`, `WORLDMAP.LZW`, `DATA1.LZW`, `PORTMAP.LZW`, `PORTCHIP.LZW`, `CHAR.LZW`, `KAO.LZW`, `GRAPH*.DAT`, `OPGRAPH.LZW`, `ENDGRP.DAT`, `ALL_FONT.16P`, `HANKAKU.FNT`, 그 외 사용자 원본 파일 **전부**.
- 이미 증명된 최소 고정점: 한국어 OPEN 장면 12개/OPGRAPH 14파트 108레코드, MAIN 시스템 메뉴 #56, 여섯 주인공 선택 및 음악 분기, FMDRV INT 66h 호출, MAIN 음악 테이블. `web/reverse-evidence.js`와 `docs/BROWSER_M21..M25` 참조. 미검증 의미를 추가하지 않는다.
- 소스 브랜치의 최근 선행 작업은 `uw2-web-port@3a3cf1122d8dad428ca11372461e8d2037c90c9a` (계획 수립 시점)이다. 이후 각 산출물은 자체 SHA/증거를 별도 기록한다.
- 분석 데이터 모델: `artifact SHA -> MZ/COM segment/address -> function/basic block -> callsite -> memory layout -> game-state transition -> browser implementation -> differential test`의 **역추적 가능한 링크**.


## 3-A. REA/Ghidra 전체 디컴파일 우선 및 JS/WASM 실행 엔진 설계 (2026-10-31 공식 개정)

**우선순위 변경:** 기존 P0~P9 목표와 원본 무변경 계약은 유지한다. 개별 메뉴·상점·항해 기능을 추정해서 계속 덧붙이는 방식보다, 먼저 **원본 실행 모듈 전체를 배치 분석해 함수/기본블록/미해결 코드 영역을 추출하고**, 실제 8086 동작을 보존하는 **공통 실행 상태 + IR + 직접 변환 JS/WASM 블록 + 원본 명령 실행 폴백**을 구현한다. 기존 웹 포팅 모듈은 폐기/덮어쓰지 않고 원본 근거를 검증한 부분부터 연결한다.

### A. 전체 역어셈블리·디컴파일 파이프라인 (P1 최우선)
1. 입력 고정: 소유 한국어판 KOEI.COM, OPEN.EXE, MAIN.EXE, END.EXE, GRPDRV.EXE, FMDRV.COM과 필요한 로딩 오버레이를 기존 SHA-256 인벤토리로 검증한다. 현재 원본 확인 실적(61개 해시, MZ relocation 5,296건, 9A/EA 후보 5,038건, MAIN/OPEN REA 함수 후보 1,261/248개)은 보존하며 **후보를 검증 완료 함수 수로 간주하지 않는다**.
2. REA 6.5.0/Ghidra 12.1.4의 기존 분석 프로젝트 및 실제 지원되는 추출/자동화 인터페이스를 조사한 다음, 모듈별 전체 메모리 영역에 대해 batch disassembly/decompile/CFG/xref/callsite/global access를 추출한다. 자동화 API 명칭이나 결과 구조는 실제 도구 확인 전 임의로 가정하지 않는다.
3. 함수 후보와 **함수로 인식하지 못한 실행 코드**, 오류 반환, 데이터/코드 경계 충돌, BSS/overlay, 간접 호출(FF /3,/5 등), near/far call/ret, DOS/BIOS/드라이버 인터럽트·I/O 포트를 모두 별도 갭으로 목록화한다. 디컴파일에 성공한 의사코드도 원본 의미 검증 전에는 확정 소스로 쓰지 않는다.
4. 원본 오프셋, 세그먼트:오프셋, REA/Ghidra 주소, load image/BSS를 분리한 stable ID를 사용한다. 각 기록에는 module SHA, byte region, basic block, direct/indirect edges, 읽기/쓰기 상태, 추출 성공/실패 사유, 실제 증거·도구 버전·출력 해시를 남긴다.
5. 모듈별 범위 청크를 만들어 중간 체크포인트부터 재시도한다. 이미 성공한 코드를 매 실행 처음부터 분석하지 않는다. 전체 로딩 범위에서 identified code / data / unresolved / failed byte range가 빠짐없이 계량될 때만 batch inventory가 끝났다고 판단한다. **디컴파일 추출이 끝나도 포팅 완료는 아님**.
6. 공개 저장소에는 직접 작성한 도구/테스트/런타임과 필요한 비저작권 구조 메타데이터·해시만 남긴다. 원본 바이너리/리소스, 대량의 디컴파일 유사 원문, 원작 저작권 소스에 준하는 재구성 코드를 공개 GitHub에 덤프하지 않는다. 원본과 상세 추출 데이터는 권한 있는 로컬 분석 환경에서 유지한다.

### B. 8086 의미 보존 코어 + 공통 IR + JS/WASM 하이브리드 (P3)
1. 공통 실행 상태에 8/16비트 레지스터, FLAGS(CF/ZF/OF 등), segment:offset 및 20-bit 실주소 wrap, stack, CALL/RET/IRET/near/far control transfer, 원본 16-bit 산술과 정수 오버플로, relocation/overlay, 메모리·시간·난수 상태를 정의한다.
2. 디컴파일 C 의사코드를 기계적으로 JS로 번역하지 않는다. 검증된 명령/블록을 **입력 상태→명령 의미→부작용→다음 주소** IR로 변환하고, 빠르고 검증된 영역만 JS 또는 WASM 네이티브 블록으로 올린다.
3. 복원되지 않은 명령/간접 호출은 **동일 CPU·메모리·전역 상태**를 쓰는 bounded 8086 실행 폴백으로 넘긴다. 임의로 함수 의미·게임 이벤트·화면·음악을 만들어 우회하지 않으며, 폴백의 원본 바이트 이용은 사용자 로컬 보유 원본/권리 준수 조건에서만 수행한다.
4. DOS 파일/인터럽트/시계/키보드, VGA 화면/팔레트, FMDRV INT 66h/OPL, 원본 세이브 I/O 등은 별도 장치 어댑터로 연결한다. 원본에서 확인되지 않은 PC-98/다른 장치나 새로운 GUI 기능을 임의 추가하지 않는다.
5. KOEI → OPEN → MAIN → 조건부 END 실제 실행 분기를 최소 수직 slice로 먼저 통과시킨다. OPEN에서 비정상 종료 시 MAIN을 실행하지 않는 기존 정적 검증과 실제 DOS 종료코드/Enter 건너뛰기 관찰은 구분한다. 이후 6인 선택→항구→항해→전투→이벤트→엔딩으로 확장한다.
6. DOS 에뮬레이터에서 원본을 보여주는 단순 웹 화면 전달은 디버깅/대조 oracle로만 허용하고 최종 원본 네이티브 웹 포팅 완료로 취급하지 않는다.

### C. 실제 원본 비교 및 정확성 승인 (P2~P9)
- P2의 동일 입력·시간·난수 고정 DOS 참조 실행에서 call/branch/register/memory/save/video/palette/OPL trace를 채집한다. 확보하지 못한 부분은 UNTESTED/HOLD다.
- 각 블록은 synthetic unit 통과와 DOS trace 정합성을 **별도 판정**한다. 프로그램 화면을 단순히 비슷하게 표시하는 것만으로 원본 동일성을 주장하지 않는다.
- 함수 처리 현황은 DISCOVERED / DECOMPILED / VERIFIED / FAILED / UNRESOLVED, 테스트는 STATIC / SYNTHETIC / ORIGINAL_DOS / BROWSER / FULL_GAME으로 분리 보고한다. 지표의 분모는 확인한 실제 로딩 코드 바이트 및 통제된 실행 경로이며 후보 함수 개수로 포팅 완료율 계산 금지.
- 기존 P4~P8 기능은 유지하되 추측/근사 경로를 원본 참조로 교체한다. 6인 전 경로·시나리오·게임 종료·세이브·음악·픽셀·브라우저 장기 동작을 검증한 P9만 FULL_GAME_COMPLETE로 승인한다.

### D. 자동 C 슬롯 실행 정책 — 한 문장으로 연속개발 (00/30분 KST 유지)

- **채팅창에 보내는 메시지는 항상 `웹포팅 개발 계속진행해` 한 문장뿐이다.** 자동 컨트롤러는 TASK_ID/PRODUCTION_ID/EVENT_ID, 장문 작업지시, 커밋 1건 단위 완료 판정, 30분 강제 새 대화, 개별 기능 승인 대기를 대항해시대 작업에 적용하지 않는다.
- 매시 00분·30분(KST)에 기존 개발 채팅으로 이어서 보낸다. 응답 생성·실제 개발 중에는 보내거나 강제로 끊지 않고 전송할 한 문장을 예약해 두었다가 채팅이 입력 가능한 상태가 되면 보낸다. 정상 채팅은 계속 재사용하고, 대화 한도나 UI 복구 불가 상황에만 새 대화를 연다.
- **진행 기준 문서는 이 마스터 계획 하나다.** 매 실행은 GitHub `uw2-web-port` 최신 소스, 원본 증거와 이 계획을 기준으로 직전 미완료 코드·주소 범위부터 개발한다. 반복 기획·짧은 신규 미션 쪼개기·새 ID 생성은 하지 않는다. 중간 커밋은 진척일 뿐이며 원본 게임 전체 기능 완성·대조·검증 전에는 종료하지 않는다.
- 개발 우선순위는 이 문서 3-A절의 **REA/Ghidra 전체 배치 추출 → 공통 8086 CPU/IR와 JS/WASM 실행 코어 → 원작 DOS 참조 트레이스 대조 → 6인 게임 전 기능 수렴**을 그대로 따른다. 필요할 때만 원본에 근거한 작은 구현을 커밋하고 작업 자체는 계속 이어간다.
- 코드·테스트·기존 근거 자료는 삭제하지 않고 유지한다. 채팅용 중복 지침/자동 큐 메타데이터만 없앤다. 원본 실행 파일·저작권 자산을 공개 저장소에 추가하지 않는다.
- 기존 자동 CI를 사용할 수 있지만 빌드/테스트 성공만으로 원작 웹포팅 전체 완료로 간주하지 않는다. 실제 원본 DOS/브라우저 테스트를 수행하지 않았으면 통과했다고 쓰지 않는다.
- N100은 GitHub·ChatGPT 로컬로 해결할 수 없는 기존 원본/REA/Ghidra 확인 등 필요한 경량 작업에만 사용한다. 대규모 신규 clone/worktree/반복 전체 빌드는 피한다.

### E. 다음 작업 산출물 (P1 재개)
- P1-BATCH-001: 실제 설치된 REA/Ghidra 인터페이스 조사 및 모듈별 full-code batch manifest + 실패/갭 export 도구와 합성 fixture 테스트.
- P1-BATCH-002: MAIN/OPEN 1,261/248 자동 후보의 결과를 전체 코드 범위와 교차해 디컴파일 성공/실패/unknown 및 indirect transfer 갭을 분리; KOEI/END/GRPDRV/FMDRV로 확대.
- P3-CORE-001: 원본 부팅 분기에 필요한 16-bit register/flags/segment/near-far transfer/exit-code 의미를 공유 IR+웹 실행 코어에서 돌리고 original DOS trace와 비교. 미실행 original/binary 테스트를 PASS로 적지 않는다.


### F. 기존 REA 기록과 원본 실행 파일의 명령어별 증거 연결 (2026-10-31 KST)
- 신규 직접 작성 도구: `tools/p1-instruction-ledger.mjs`, `tools/p1-rea-snapshot-bridge.mjs`; 별도 합성 회귀 2종. 이미 저장된 REA/Ghidra function-dossier `assembly` + `basic_blocks`의 주소 범위를 **사용자 보유 동일 SHA 원본 MZ 바이트**에 대응하고, 명령어 단위 SHA/후보 주소, 직접·간접 제어흐름, 관측되지 않은 전체 이미지 영역을 계산한다. byte/code boundary 충돌과 원본 SHA 불일치는 거부한다. 원본 바이트·디컴파일 원문은 커밋하지 않는다.
- N100 기존 기록과 실제 정본 비교: `MAIN.EXE` SHA `1718bbbbcdd938dfe44403d9bd5254dfc02d431217dea39ae5fb3fcde1597747`; 기존 REA 스냅샷의 **함수 상세 기록 4건 / 어셈블리 행 864개 / 명령어 후보 864개 / 후보 영역 2,126바이트 / 미관측 265,193바이트 / 정적 제어흐름 미해결 120건**. 이미지 전체 267,319바이트. 이 4건은 REA가 자동 탐지한 1,261개 함수 후보의 전체 출력이 아니다.
- `OPEN.EXE` SHA `f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65`: 기존 REA snapshot에는 `analyze_function` 상세 record가 **0건**이므로 41,655바이트 전체가 아직 미관측으로 남는다. 일반 의사코드 텍스트를 명령어 경계로 추측하여 승격하지 않는다.
- 증거 범위: 원본 정적 SHA + 기존 REA 12.1.4 상세 출력의 소규모 실물 대조, GitHub Actions exact-SHA 합성 정적 검증. **실제 DOS 실행 트레이스·브라우저 원작 동등성·음악/화면·저장·전체 게임: UNTESTED / HOLD.** `verifiedCodeBytes=0`; 이 숫자들로 완성률 계산 금지.
- 이어서 기존 분석 툴의 실제 지원 인터페이스를 확인한 뒤 모듈 전체 범위의 상세 함수/기본블록/명령어를 **작은 재개 가능 청크**로 추출해 위 도구에 전달한다. 특별히 MAIN 미관측 265,193바이트, OPEN 상세 기록 0건, 간접 제어 이전 미해결을 우선 줄이며 해당 엔진의 CPU/DOS 참조 실행·영상·OPL 대조를 계속한다.


### G. 동일 원본 SHA 기준 REA 상세 스냅샷 누적 병합 (2026-10-31 KST)

- 구현: `tools/p1-rea-batch-merge.mjs`가 이미 존재하는 `p1-rea-snapshot-bridge.mjs`와 `p1-instruction-ledger.mjs`를 이용해 재개 가능한 **다중 REA/Ghidra 증거 스냅샷 병합**을 제공한다. 사용자 보유 MZ 원본 바이트의 SHA를 재확인하고 소스 스냅샷을 SHA-256으로 식별·정렬해 동일 추출 재전달에 무관하게 집계한다.
- 각 원본의 Ghidra 버전 및 추출 해시를 유지한다. 같은 주소에서 길이/바이트 지문/명령 흐름/타깃이 다르면 전체 병합을 중단하며, 서로 다른 시작 주소의 명령어 바이트 영역 겹침은 기존 엄격한 명령어 장부가 거부한다. MAIN/OPEN 주소는 REA의 선형 주소이며, DOS 실주소 세그먼트:오프셋 또는 실행된 명령 주소로 자동 승격하지 않는다.
- 출력은 함수 **상세 기록 수**, 어셈블리 행 수, 명령어 후보 수/바이트, 원본 이미지 미관측 범위, 간접·미해결 제어이전 수, 다음 미관측 범위를 분리한다. 원본 코드 바이트/디컴파일 텍스트나 로컬 경로를 공개 출력하지 않는다. 모든 지표의 `verifiedCodeBytes=0`, `verifiedFunctionCount=0` 상태를 DOS 대조가 생길 때까지 유지한다.
- 실제 한국어판 보유 원본 + 기존 REA 스냅샷으로 읽기 전용 대조: MAIN SHA `1718bbbbcdd938dfe44403d9bd5254dfc02d431217dea39ae5fb3fcde1597747`, 상세기록 4·행 864·고유 후보 864·바이트 2,126·미관측 265,193·미해결 정적 흐름 120(`HOLD_UNRESOLVED_FLOW`); OPEN SHA `f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65`, 상세기록 0·고유 후보 0·미관측 41,655(`HOLD_INCOMPLETE`). **새 상세 함수의 원본 역어셈블리 결과를 생성한 것은 아니므로 앞선 수치에서 범위가 늘어난 것처럼 보고하지 않는다.**
- 합성 병합/충돌·기본 장부 회귀: `tests/p1-rea-batch-merge.test.mjs` 추가, `UW2 Web Fidelity Static Gate` exact SHA `495dbdba4d6193d41a414e9068f04dd22b19c233`의 GitHub Actions `synthetic-static` 작업 **SUCCESS** (run `41150831677`). 원본 DOS 플레이/항구·항해·전투/세이브·브라우저·음악/픽셀 동등성은 모두 **UNTESTED**.
- 다음 지속 작업: MAIN과 OPEN의 기존 전체 자동 식별 함수 후보를 **REA/Ghidra 지원 인터페이스로 상세 함수+기본블록+명령어 레벨로 추출하고**, 결과를 작은 재개 가능한 스냅샷으로 반복 수집한다. 출력은 이 병합 도구로 같은 원본에 추가 누적한다. 실제 명령 커버리지가 늘기 전에는 게임 화면이나 임의 로직을 구현했다고 간주하지 않는다. 나머지 실행 모듈과 원본 DOS 실행/장치/저장 참조 트레이스까지 같은 경로로 확대한다.


### H. 네이티브 Ghidra 12.1.4 배치 추출 실기 및 원본 SHA 검증 (2026-10-31 KST)

- 신규 직접 작성 실행 도구: \`tools/Uw2GhidraInstructionChunk.java\` (설치된 Ghidra 12.1.4의 \`GhidraScript\`, 함수 시작점·원본 로딩 이미지 내 명령어 경계·제어흐름 분류의 **메타데이터만** 제한된 청크로 출력), \`tools/run-ghidra-p1-chunk.py\`, \`tools/run-ghidra-p1-batch.py\` (소유 원본 MZ 파일의 길이 및 pinned SHA-256 선행 검증, 1회 Ghidra headless 분석에서 최대 64KiB 여러 청크 내보내기), \`tools/p1-ghidra-chunk-import.mjs\` (원본 파일 raw bytes와 분석 메타데이터를 **다시 대조**해 명령어별 SHA·전체 이미지 미관측 범위·미해결 정적 제어이전·재실행 중복·청크 충돌 등을 검증). \`tests/p1-ghidra-chunk-import.test.mjs\` 합성 회귀를 필수 GitHub Actions 게이트에 추가했다.
- 도구 제작 후 실제 설치된 Ghidra로 컴파일 오류를 수정하고, 원본 보유 N100에서 4개 한국어판 실행 파일의 실제 해시와 바이트를 read-only로 대조한 **Ghidra 12.1.4 정적 스캔**을 수행했다. \`MAIN.EXE\`는 1회 headless 실행에서 5개 청크, 다른 3개는 각 1개 청크로 전체 **초기화 이미지의 분석 범위**를 넘겼다. 누락·초과 청크·서로 충돌하는 명령 바이트 경계는 import에서 실패한다. 공개 GitHub에 원본 파일·전체 어셈블리·디컴파일 원문이나 원본 스냅샷을 저장하지 않는다.
- 원본 이미지/명령어·함수 **후보** 정적 근거 (verifiedCodeBytes/verifiedFunctionCount는 아래 모든 모듈에서 **0**):
  
  | 원본 SHA 확인 모듈 | 초기화 이미지 바이트 | 명령어 후보 | 함수 시작점 후보 | 후보 명령어 바이트 | 미관측 이미지 바이트 | 정적 제어이전 미해결 |
  | --- | ---: | ---: | ---: | ---: | ---: | ---: |
  | OPEN.EXE | 41,655 | 13,418 | 248 | 27,254 | 14,401 | 81 |
  | MAIN.EXE | 267,319 | 82,660 | 1,261 | 204,557 | 62,762 | 4,799 |
  | END.EXE | 51,729 | 11,864 | 259 | 24,266 | 27,463 | 90 |
  | GRPDRV.EXE | 21,551 | 453 | 10 | 970 | 20,581 | 15 |
  | **정적 스캔 합계** | **382,254** | **108,395** | **1,778** | **257,047** | **125,207** | **4,985** |

- 주의: Ghidra가 자동 식별한 명령어 후보 및 함수 시작점 수는 **검증된 코드/게임 함수/완료율이 아니다**. 미관측 125,207바이트에는 원본 **데이터와 아직 분석되지 않은 코드**가 섞여 있을 수 있고, 함수/제어흐름 경계·재배치·오버레이·런타임 소유 상태의 참조 트레이스가 없다. OPEN/MAIN의 이전 제한적 REA 스냅샷과 달리 **전체 초기화 이미지 범위를 조사하는 도구 경로가 처음으로 실기에서 동작**했지만, 디컴파일 완성이나 원작 웹게임 가동을 뜻하지 않는다.
- private artifact: \`rea-analysis/uncharted-waters-2/p1-chunks/\` (N100에만 저장, 체크포인트 자체는 GitHub에 푸시하지 않음). GitHub exact-SHA \`d234d99a4a40313f6de90490aa8f10895831e1d2\` \`UW2 Web Fidelity Static Gate\` synthetic-static 작업 **SUCCESS**, Actions run \`41153640239\` (이는 Java/Ghidra 원본 분석 자체를 Actions에서 재현한 것이 아니며 N100의 read-only 원본 분석과 분리 판정). 원본 DOS 실행/플레이·화면/오디오·항구/항해/교역/전투/세이브·브라우저 일치 여부 **UNTESTED / HOLD**.
- 다음 연속 작업: KOEI.COM·FMDRV.COM은 DOS COM 메모리 매핑/실제 실행 진입점이 달라 MZ exporter 재사용만으로 완료 처리하지 않는다. COM용 로더/원본 해시/세그먼트 주소 대응을 별도 증명하고 스캔한다. 이후 4개 MZ의 미관측 데이터/코드 경계 및 간접 호출 4,985건을 제어흐름·원본 스냅샷과 대조하고, 원본 DOS 런타임 trace를 확보한 뒤에만 verified 영역과 P3 실행 블록을 올린다.


### I. 원본 COM 재배치 없는 PSP+0x100 정적 분석 연결 (2026-10-31 KST)

- \`KOEI.COM\`·\`FMDRV.COM\` 원본 파일을 SHA-256 및 정확한 길이로 선행 검증한 후, 네이티브 Ghidra 12.1.4 \`BinaryLoader\`를 사용해 파일 시작을 분석 선형 주소 \`0x10100\`에 배치했다. COM 파일에는 MZ 헤더/entry/relocation 테이블이 없으므로 \`0x10000\` MZ 주소 대응을 사용하지 않는다. 재생 가능한 PC/DOS PSP 실행 상태는 아직 증명되지 않았다.
- 자동 로더는 엔트리 명령을 발견하지 못하여 처음에 후보 수 0으로 나왔고 이를 **분석 실패(누락)**로 취급했다. \`Uw2GhidraInstructionChunk.java\`는 **COM 형식에 한해서만** 실제 COM 진입점 PSP:0100h를 확인하고 임시 Ghidra 프로젝트에서 entry disassemble/createFunction을 수행하도록 수정했다. 원본 바이트는 변경하지 않는다. 이를 통해 실제 원본 정적 코드 후보를 얻었지만 스스로 코드/함수를 검증 완료로 승격하지 않는다.
- 신규 소스: \`tools/run-ghidra-p1-com.py\`, \`tools/p1-ghidra-com-import.mjs\`, 회귀 \`tests/p1-ghidra-com-import.test.mjs\`. importer는 모듈별 원본 SHA를 다시 계산한 뒤 Ghidra linear address에서 \`0x10100\`을 빼 원본 파일 오프셋으로 대응시키며, 잘못된 엔트리·겹친 바이트·무허가 타깃·원본 불일치를 거부한다. 결과에서 원본 바이트/어셈블리/ROM을 공개하지 않고 집계치만 출력한다.
- 실제 원본 읽기 전용 정적 결과:

  | 원본 COM | 원본 파일 바이트 | 명령어 후보 | 함수 시작점 후보 | 후보 바이트 | 미관측 바이트 | 정적 흐름 미해결 |
  | --- | ---: | ---: | ---: | ---: | ---: | ---: |
  | KOEI.COM | 776 | 141 | 2 | 321 | 455 | 20 |
  | FMDRV.COM | 5,162 | 339 | 2 | 754 | 4,408 | 9 |

- 모든 COM 수치는 **정적 Ghidra가 진입점부터 찾은 후보**이며 \`verifiedCodeBytes=0\`, \`verifiedFunctionCount=0\`. KOEI의 기존 REA 함수 후보 4건과 이번 Ghidra 시작점 후보 2건은 자동 함수 인식 범위가 다르므로 동일 함수 수로 비교하지 않는다. FMDRV의 실제 INT 66h/OPL 레지스터 동작, KOEI 실제 OPEN→MAIN→END child 종료, DOS PSP/메모리 할당 및 원본 플레이 실행은 여전히 **UNTESTED / HOLD**.
- 다음 작업: 근거 있는 원본 KOEI.COM near/far call 관계 및 FMDRV 장치 경계 원본 코드 후보를 상세 분류하고, 6개 실행 모듈의 각 미관측 바이트를 데이터/미분석 코드/세그먼트·overlay로 구분한다. DOS 참조 실행 트레이스가 확보되어야 JavaScript 공통 8086 실행 코어/원본 웹 실행의 검증 지표를 올릴 수 있다.


### J. 실제 KOEI.COM 바이트의 CPU·BIOS·DOS 부분 실행 진전 (2026-10-31 KST)

- 원본 SHA-256 \`81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36\`로 검증한 **사용자 소유 한국어판 KOEI.COM 원본 명령 바이트**를 이미 존재하는 \`RealMode8086\` 코어에 적재하여 \`tools/p3-koei-exec-probe.mjs\`로 제한된 step-by-step 실행 진단을 수행했다. CPU 바이트는 원본이나, PSP=\`0x200\`, 전체 메모리 초기화와 스택, BIOS teletype 소비 sink, 나중의 child EXEC 결과는 **명시적인 합성 조건**이다. 이는 **DOSBox/DOS 실제 기준 실행 트레이스가 아니다**.
- 관측된 첫 정지: 원본 entry부터 **6 명령어 실행 후** BIOS \`INT 10h\` \`AH=0Eh\`, \`AL=07h\`, \`BH=00h\`, \`BL=07h\` 호출. 신규 \`web/bios-int10.js\`는 이 **한 가지 서비스**의 문자·페이지·색상만 소비자가 제공한 동기 장치 sink로 넘기고, VGA·벨소리·커서 또는 반환 레지스터를 임의로 만들어 주지 않는다. 다른 BIOS 서비스는 명시적으로 실패한다.
- 다음 정지: 원본 \`KOEI.COM\` 파일 raw \`0x2AC\`에 **\`C1 EB 04\` = 80186 계열 \`SHR BX,4\`** 명령이 존재한다. 순수 8086 코어는 이를 지원하지 않으므로 기존 strict 8086 모드를 유지하는 \`enable80186Shifts:true\` 옵션을 추가했다. \`C0/C1\` immediate shift/rotate는 지원 근거가 생긴 범위만 게이트를 열고, count>31 및 다른 80186 명령은 무조건 실패한다. 비활성화 상태에서는 여전히 \`unsupported 8086 opcode\`. 구조적 원본 바이트 근거는 80186 opcode이지만 **원작이 어떤 CPU/BIOS 환경에서 성공적으로 실행됐는지까지 증명하지는 않는다**.
- 다음 진전: **23 명령어 실행** 뒤 KOEI의 \`INT 21h AH=25h, AL=24h\` 인터럽트 벡터 쓰기를 확인. \`web/realmode-8086.js\`는 게스트가 실제 전달한 \`DS:DX\` 대상만 IVT에 설치·교체하고, \`web/dos-int21.js\`는 DOS AH25/AH35를 지원한다. AH35는 현재 메모리에서 **명시적으로 알려진 벡터만** \`ES:BX\`로 반환한다. 비어 있는 DOS IVT 값을 원작 값인 것처럼 \`0000:0000\` 또는 에뮬레이터 함수로 만드는 것은 금지한다.
- 현재 원본 바이트 probe는 **26 명령어 실행 후** \`INT 21h AX=3565h\` (DOS 인터럽트 벡터 \`65h\` 조회)에서 정지한다. 실제 원본 DOS의 시작 시점 INT65h 벡터 내용·관련 드라이버 설치 순서는 확보되지 않았으므로 게이트는 **\`unknown initial DOS interrupt vector: fail closed\`**, child 실행 건수 0으로 유지한다. 이 수치는 진전된 원본 바이트 실행 경계이지 기동 완료나 게임/음악 재현 성공이 아니다.
- \`tests/bios-int10.test.mjs\`, \`tests/realmode-80186-koei-shift.test.mjs\`, \`tests/dos-int21-vectors.test.mjs\`는 합성 CPU·DOS 장치 의미 검증이며 필수 \`UW2 Web Fidelity Static Gate\`에 포함했다. \`tests/p3-koei-original-probe.test.mjs\`는 N100의 소유 원본을 로컬에서만 읽어 26단계 및 미해결 INT65h를 검증(**PASS**), CI 자산 없는 환경에서는 강제 실행하지 않는다. GitHub Actions 원본 자산 없는 합성 CI의 검증 SHA \`7df53e29861d06ef8625002eda2a2780738ce658\`, \`synthetic-static\` **SUCCESS**, Actions run \`41156164486\`. 기존 8086 레거시 오류 메시지 테스트를 잠시 위반했던 CI 회귀는 \`08c4657b3b925961c26e9697756ba7c3fb11a46a\`에서 복구, exact-SHA CI PASS.
- **다음 행동**: 동작이 검증된 DOS/BIOS 참조 환경에서 프로세스 생성 직전 INT65h 벡터·드라이버 설치 순서 및 KOEI의 PSP/환경/할당 상태를 채집해 명시적 입력 스냅샷으로 넣는다. 그 전에는 임의 벡터를 삽입해 OPEN/MAIN이 성공했다고 보이게 만들지 않는다. 원본 KOEI 구동 후에도 OPEN·MAIN·END, VGA/OPL/키보드, 세이브 및 게임 플레이까지 단계별 실제 참조 트레이스와 동일성을 검증해야 한다.

### K. KOEI 원본 바이트 4개 분기 실행 및 8086 EB 제어이전 버그 수정 (2026-10-31 KST)

- 정본 한국어판 KOEI.COM (SHA-256 81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36) 원본 바이트를 browser RealMode8086 코어에서 제한 실행. **기본 probe는 여전히 26 명령 후 DOS 초기 INT 65h 벡터를 몰라 정지**하며, 아래 130~190 단계 결과는 실제 DOS/PSP/BIOS 실행이 아닌 **사용자 소유 원본 명령 + 명시적으로 생성된 테스트용 IVT/PSP/비디오/메모리 할당/자식 종료코드**의 결합이다. child 프로그램 FMDRV/OPEN/MAIN/END 자체를 실행한 것이 아니다.
- 신규 웹 소스: web/dos-ivt-snapshot.js (외부 1,024바이트 IVT SHA-256 및 알려진 벡터 번호만 등록, 나머지 조회 실패), web/dos-psp-snapshot.js (256바이트 PSP 원본 형식/해시 검사, PSP:002Ch environment paragraph 외부 입력), web/bios-int10.js AH=0Fh 모드/열/페이지 조회 및 AH=00h 비디오 모드 설정을 외부 장치 상태에만 위임; 기존 AH=0Eh BEL은 외부 텔레타이프 장치에만 전달.
- web/dos-int21.js에는 PSP 환경 블록 해제 AH=49h, 부모 DOS 블록 크기 변경 AH=4Ah를 **외부 메모리 할당기**로 위임하는 fail-closed adapter를 추가했다. DOS AH=06h 직접 콘솔 입력/출력과 AH=09h 원본 DS:DX '$' 종료 바이트 출력은 외부 콘솔 어댑터에 보낸다. 원문을 추정·번역해 재작성하지 않으며, 입력이 없거나 문자열 종료가 없으면 실패한다. 정확한 DOS MCB/원본 컨솔/VDU 동작은 미검증.
- 핵심 실제 CPU 버그: 원본 KOEI.COM 파일 raw 0x27Dh의 EB 03 short JMP는 raw 0x282h로 가야 하는데, 기존 JS step 구현 `this.ip+s8(this.fetch8())`의 평가 순서가 fetch 전 IP로 계산해 raw 0x281h로 가면서 E9 rel16의 데이터 FE를 명령어로 오인했다. 이를 즉시값 fetch 이후 IP+signed8로 고쳤다. 합성 EB forward/backward/segment-wrap 회귀 및 **원본 KOEI 종료 경로**를 모두 통과했다. 게임 내용 자체는 바꾸지 않았다.
- 원본 KOEI executable bytecode + 명시적 합성 DOS 결과 분기 검증: 아래 모든 경로는 음악 드라이버 실제 INT 66h가 없으므로 마지막 INT 66h에서 fail-closed. child 호출은 실행 인터럽트 요청의 관측값일 뿐 원본 자식 실행/음악 동작 확인이 아니다.

  | 명시적 합성 자식 종료 조건 | 원본 명령 실행 횟수 | 관측된 DOS EXEC 요청 |
  | --- | ---: | --- |
  | OPEN 정상·MAIN 정상/종료코드 1 | 130 | FMDRV → OPEN → MAIN → END |
  | OPEN 비정상 종료 | 175 | FMDRV → OPEN |
  | MAIN 정상/종료코드 0 | 116 | FMDRV → OPEN → MAIN |
  | MAIN 비정상 종료 | 190 | FMDRV → OPEN → MAIN |

- 로컬 원본 SHA 검사: tests/p3-koei-original-probe.test.mjs 기본 26-step 게이트 PASS; tests/p3-koei-original-ivt-fixture.test.mjs 합성 PSP/BIOS/메모리로 130단계 및 원본 비디오 모드 복귀까지 PASS; tests/p3-koei-original-branch-matrix.test.mjs 원본 CPU 분기 4종 PASS. 원본 보유 디렉터리에서만 구동하며 GitHub Actions에는 원본 바이너리를 업로드하지 않는다.
- 합성 CI 테스트 추가: realmode-8086-jmp-short, dos-ivt-snapshot, dos-psp-snapshot, bios-int10-modes, dos-int21-memory, dos-int21-resize, dos-int21-console, dos-int21-string. 검증 SHA 3188080bbfd7d1b34a5ef1d676f4d7b628f45324의 GitHub Actions synthetic-static **SUCCESS**, run 41158909649. 실제 DOS trace나 브라우저 런타임 환경 검증으로 격상하지 않는다.
- 다음 연속 구현: FMDRV.COM 실제 DOS/TSR 상주 드라이버의 INT 66h 핸들러 설치·전역 상태·OPL I/O를 원본 바이트와 참조 실행으로 확인한 뒤 RealMode8086 같은 메모리에서 실행하도록 연결. DOS 초기 IVT 65h, PSP+환경 메모리, 메모리 MCB, 비디오 모드 값은 실제 DOS 기준 스냅샷을 확보하기 전에는 샘플값을 정상값으로 간주하지 않는다. 이후 FMDRV→OPEN→MAIN→END 프로그램 본문·게임 자산·항해/항구/교역/전투/세이브의 원작 실행 일치성을 각각 검증한다.

### L. FMDRV.COM 원본 바이트 상주 기동·INT66 종료 진입 (2026-10-31 KST)

- 입력: 사용자 소유 한국어판 `FMDRV.COM` 5,162바이트, SHA-256 `0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b`. 새 `tools/p3-fmdrv-exec-probe.mjs`는 실제 원본 COM 바이트를 `loadVerifiedCom`과 공유 RealMode8086 상태에 적재하고, 명령어·DOS 호출의 위치/레지스터를 한정된 횟수만 추적한다. **기존과 별도 원본 DOS 실기 트레이스가 아니며 합성 PSP·초기 IVT 및 하드웨어 입력은 참조 진실이 아니다.** 원본/역어셈블리/음악 자산은 공개 GitHub에 올리지 않는다.
- 기본 fail-closed 실행: FMDRV 원본 진입 후 **11개 명령어** 실행, `INT 21h AH=35h, AL=66h`(이전 INT66 벡터 조회)에서 초기 DOS IVT 불명으로 중단. 이후 소유자를 갖춘 **명시적 합성 벡터** `66h/65h/08h` 및 각 벡터의 합성 IRET 코드만 넣었을 때 원본 코드가 `AH=25h`로 INT66h, INT08h를 설치하는 요청을 관측했다. 이는 드라이버가 실제로 DOS에 설치되었다는 증명이 아니라 테스트용 DOS 커널의 IVT 추적이다.
- 이후 동일 실제 명령 바이트가 PIT `OUT 43h=36h`, `OUT 40h=00h`, `OUT 40h=10h`, 포트 `61h` 입출력, OPL `388h/389h` 쓰기 및 `IN 388h` 상태 읽기를 요청한다. `registerIOPort` 외부 콜백으로 원본 쓰기 이벤트만 전달한다. 포트 `61h` 읽기 및 OPL 상태 레지스터를 포함한 실제 하드웨어 반환값은 확보되지 않았다.
- 입력 OPL 상태를 명시적으로 **합성 `00h`**로 제공하면 FMDRV 원본 타이머 검출의 `CX=7530h` 대기 LOOP를 거쳐, **30,644개 원본 명령 실행 후** `INT 21h AX=3101h`, `DX=0026h`를 호출하여 DOS 상주 종료를 요청한다. `web/dos-int21.js`에 `AH=31h` 외부 메모리 소유자의 **명시적 승인** 없이는 종료하지 않는 상주 처리 계약과 `tests/dos-int21-tsr.test.mjs` 회귀 테스트를 추가. 합성 콜백 승인 시 `terminationType=3`, `returnCode=1`, `residentParagraphs=0x26`, `pspSegment=0x300` 기록. `0x26`은 해당 합성 실행에서 실제 코드가 제공한 값이지 일반 DOS 환경에서의 검증된 최종 메모리 배치가 아니다.
- 같은 메모리에 남겨 놓은 **실제 원본 FMDRV 상주 INT66 핸들러**를 합성 부모가 `AX=FF03h`로 호출하자 **29개 원본 명령**을 실행한 뒤 호출자 코드로 복귀하고, 원래의 합성 INT66 벡터(`0900:0000`)를 복원했다. `tests/p3-fmdrv-original-ivt-fixture.test.mjs` 원본 SHA/readback과 로컬 단일 기계어 코어 시험 **PASS**. 이 트레이스는 실기 DOS 프로세스 전환이 아닌 테스트의 `terminated` 해제/외부 CPU 레지스터 준비를 사용했다. 따라서 KOEI→FMDRV 연동 전체가 완료되었다거나 음악이 원본과 일치한다는 증거가 아니다.
- 원본이 없는 GitHub Actions에서도 `tools/p3-fmdrv-exec-probe.mjs` 문법 및 합성 `tests/dos-int21-tsr.test.mjs`는 강제 통과. exact-SHA validation-bearing source commit `c3bba7cdca8b555ad44fbdaf117eeef132aadb05`, `synthetic-static` **SUCCESS**, run `41160973225`. N100 원본 시험 두 구간(기본 11단계 게이트, 명시적 합성 환경에서 30,644단계 TSR 및 29단계 INT66 FF03h) 모두 PASS.
- 다음 단계: **실제 DOS 6.x 환경에서 FMDRV 설치 직전의 INT66/65/08 벡터, DOS PSP·MCB, PIT·OPL 상태 및 실음악 OPL 레지스터 기록**을 읽기 전용으로 채집하고, 원본 드라이버 레지스터/메모리/OPL 핸들러의 동일성 시험에 반영. 이어 KOEI.COM의 진짜 DOS EXEC와 원본 FMDRV 상주 메모리 공유, OPEN.EXE/MAIN.EXE의 진짜 CPU 바이트 실행으로 연결. 합성 IRET나 상태 `00h`을 게임 배포 경로의 기본값으로 넣지 않는다.


## 3. 실행 순서와 완료 게이트
| 단계 | 실제 수행 | 필수 GitHub 산출물 | PASS 게이트 |
| --- | --- | --- | --- |
| P0 원본 동결·전수 인벤토리 | 설치 루트의 파일명/길이/SHA, MZ 헤더/이미지/reloc/엔트리와 COM 식별, 오류 검출 | `tools/original-inventory.mjs`, `tests/original-inventory.test.mjs`, `docs/ORIGINAL_BASELINE_*.md` | 실제 원본 파일만 읽어 실행, 해시 검증; 잘못된/부재/변형된 원본은 FAIL; 원본 파일 비커밋 |
| P1 전체 정적 역어셈블리 | 실행 모듈 로더, 8086 주소·재배치/오버레이·far/near call·interrupt·전역·데이터 테이블 추적; 간접 호출 및 미해결 분기 포함 | 함수·기본블록/호출그래프·미해결 참조 인덱스, raw-offset pinned 검사 | 각 함수마다 코드/데이터 경계 및 호출 관계 근거; 미해결 영역 계량·표시, 추측 의미 0 |
| P2 원본 참조 실행 | 소유 원본의 DOS 참조 환경에서 boot/입력/프레임버퍼·palette·FMDRV/OPL·메모리·틱·세이브 이벤트 캡처 | 재현 가능한 입력 시퀀스/상태·화면·사운드 hash/diff 정의, 공개 가능한 메타데이터 | 동일 원본/동일 입력의 반복 실행 일치; 증거 부족 시 HOLD |
| P3 브라우저 DOS 의미 보존 코어 | 16비트 정수, DS/ES/SS 세그먼트, DOS 파일 I/O/시간/난수, VGA/PC-98 여부는 실제 확인, 키 입력·인터럽트·타이머·OPL 2 | 독립 코어·단위/스냅샷 테스트 | CPU/DOS 의존 의미가 참조 trace와 일치 |
| P4 OPEN/시스템/생성 | 로더→오프닝(모든 화면 전환, 정확한 시간·음악)→시스템 메뉴→세이브 읽기/쓰기→신규게임 6명 분기 | 상태기계, 분기·frame/golden tests | 6명 시작과 10 슬롯·초기 시나리오 일치; 임의 UI 금지 |
| P5 항구/세계 항해 | 월드·항구 그래픽, 좌표·벽·주민/NPC, 날씨/해류·항속·20분틱·선원·보급·발견, 기항 | 전이·정수 회귀, 원본 화면/상태 differential | 항구↔해상 왕복·경계/장기항해 원본과 동일 |
| P6 경제·상호작용 | 교역·시세·보급·상점·주점·조선소·은행·계약·정보·금/아이템·NPC·도시 상태 | 각 메뉴 주소→행동→save 필드 근거·테스트 | 원본 입력·출력·가격·확률·save 상태 일치 |
| P7 전투·시나리오·엔딩 | 함대 조우/기습/전술·해전, EVENT/SNR 0..6 분기, 인물·국가 AI, 엔딩/크레딧 | 6명 전 시나리오 함수/그래프 추적 + 리플레이 | 모든 도달 엔딩 및 사망/실패/분기 동일 |
| P8 저장·음악·화면 전수 수렴 | DOS 세이브 양방향 bit-exact, VGA 픽셀/타이밍, 원본 OPL 이벤트/PCM 비교, 화면 크기 및 키 입력 | 회귀 코퍼스·자동 비교 리포트 | 모든 정본 대조 시나리오 PASS, 임의 근사 경로 0 |
| P9 최종 인수 | 시작~엔딩, 6인, 새 게임/불러오기/세이브, 전투/무역/이벤트, 복수 브라우저·장기 안정성 | 인수 증적·변경 없는 원본 동등성 보고 | **전수 PASS 후에만 '원본 그대로 웹포팅 완료'** |

## 4. 단계 내부 반복 절차
1. 현재 GitHub HEAD·원본 파일 SHA·상위 단계 선행 조건 확인.
2. 실제 EXE raw bytes 및 REA/Ghidra 단편을 교차 대조. `module:segment:offset` / physical file offset / 호출자·전역 read/write 기록.
3. **근거가 닫힌 최소 단위 하나씩** JS/WASM으로 재현, 원본 리소스를 그대로 읽어 렌더링(새 그래픽·대사 금지).
4. 동일 입력·초기 상태·난수·시간으로 원본 trace와 비교. 불일치는 증거와 함께 `HOLD`, 원본에서 검증되지 않은 경로는 `UNVERIFIED`.
5. 테스트/문서/코드 GitHub 커밋 + blob/HEAD readback, 필요할 때만 N100 경량 검증/기존 런타임 반영. 새 단계는 기존 게이트를 깨지 않는다.
6. 최소 한 기능의 **원본 비교 + 회귀 PASS**가 없으면 완료 점수/완료 비율을 올리지 않는다. 추적만 완료한 기능은 '포팅 완료' 아님.

## 5. 기존 웹 포팅의 정확성 기술부채
- 이미 구현된 항구 이동·해상 틱·거래/건물 등은 원본 게임의 **일부 흐름을 부분 재현**한다. 주소·상태 전이·원본 참조 실행과의 비교가 없는 구현은 완료가 아니라 `HOLD`.
- 오프닝 원본 장면/레코드의 사용 순서가 밝혀져도 낮은 레벨 blit/wipe, palette, 시간은 아직 동일하다고 증명되지 않았다.
- 확인된 오프닝 BGM index 0 외의 메뉴/항구/해상 BGM은 의미 검증 전 **재생 매핑 금지**; 원본 FMDRV 및 VGA 이벤트 확인 필요.
- 현재 웹 전용 컨트롤/부가 화면, HTTP 뷰, 자동 이동 등은 배포용 원본 게임과 격리할 대상. **이 계획 작성만으로 기존 화면이 원본과 동일해진 것은 아니다.**

## 6. 최초 실행 기록 (P0-A는 이미 완료; 이제 P1-BATCH-001부터)
- 실행 파일(최소 KOEI.COM, OPEN.EXE, MAIN.EXE, END.EXE, GRPDRV.EXE, FMDRV.COM)과 전체 원본 설치 파일에 대해 크기·SHA-256 인덱스를 만들되 원본을 수정/업로드하지 않는다.
- MZ 이미지 크기, 헤더·relocation table, CS:IP/SS:SP 및 잔여 overlay를 **바이너리 구조로 검사**하는 재현 가능한 분석기를 만든다. 불명확한 구조는 '추정'으로 분리.
- 분석기 테스트는 합성 MZ/COM fixture로 실행하고 사용자 원본을 이용한 read-only P0 결과를 별도 문서에 기록한다.
- P0 산출물은 완료 뒤 P1 call graph 추출의 입력 계약으로 사용한다.

## 7. 현재 즉시 실행할 다음 작업
- 기존 P0-A는 원본 SHA 기준선과 4개 MZ 재배치 감사로 **이미 수행**됨. 새 C 슬롯 작업의 시작점을 P0로 되돌리지 않는다.
- 이 문서의 3-A/E 절에서 지정한 P1-BATCH-001/002 및 P3-CORE-001을 새 최우선 미완료 구현 단계로 취급한다.
- 기존 P0~P9 단계 완료 게이트는 폐기하지 않는다. **원본 전체 게임 동등성은 여전히 미완료**다.


## 8. 2026-10-31 09:06 KST P3 실행 코어 부분 체크포인트

- 실행 소스 SHA: 5fa82953372873ce44d6423dbdc146b8267d13c0; GitHub Actions synthetic static gate 41148278867 = SUCCESS. 이 SHA는 전체 원작 웹포팅 완료가 아니라 부분 실행 코어 체크포인트다.
- dos-int21.js + dos-readonly-files.js: INT 21h 3D00/3F/42/3E 읽기 전용 파일 열기/읽기/탐색/닫기, 호스트 제공 원본 bytes 외 입력·미지원 서비스는 fail-closed. 쓰기·삭제·파일 경로 추측·게임 세이브는 구현하지 않음.
- dos-original-files.js: 사용자 로컬 DOS 8.3 파일명/크기/원본 SHA-256을 사전 검증한 byte snapshot에서만 동기 DOS 읽기 인터페이스 생성; 저작권 원본 bytes 비커밋. 반환 값은 방어적 복사.
- realmode-8086.js: FE /0,/1 byte INC/DEC(CF 보존), DIV/IDIV zero divisor/overflow가 설치된 INT 0으로 분기하고 벡터 미설치면 명시적 실패.
- 새로운 테스트: dos-readonly-files.test.mjs, dos-original-files.test.mjs, realmode-8086-fe.test.mjs, realmode-8086-divide-interrupt.test.mjs. 기존 인벤토리/기동 회귀 포함 최종 SHA synthetic gate 성공.
- 원본 한국어판 KOEI.COM->OPEN.EXE->MAIN.EXE 실행, DOS PSP/디바이스 trace, 원본 음악/픽셀/세이브/브라우저 전 경로는 이 테스트에서 실행하지 않음: ORIGINAL_DOS_RUNTIME=UNTESTED; BROWSER_RUNTIME=UNTESTED; FULL_GAME=UNTESTED.
- 다음: P1 실제 REA/Ghidra 지원 API를 조사하고 전체 모듈 코드/데이터/실패 범위·간접 흐름 gap을 export/검증. 이후 원본 DOS 비교 trace와 장치 어댑터를 연결하고 여섯 인물, 항구/항해, 교역, 전투, 저장, 이벤트, 엔딩 전 기능을 실제 실행 결과에 따라 수렴. 소단위 커밋이나 CI PASS로 P9 종료 처리 금지.

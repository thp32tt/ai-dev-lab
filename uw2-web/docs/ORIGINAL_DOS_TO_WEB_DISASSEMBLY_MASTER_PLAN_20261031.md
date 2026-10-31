# 대항해시대 II 한국어 DOS 원본 → 웹 완전동작 포팅 마스터 계획
- 수립: 2026-10-31 KST; 개정: 2026-10-31 KST (전체 디컴파일/하이브리드 런타임 우선)
- 기준: `thp32tt/ai-dev-lab@uw2-web-port`; 실제 한국어판 DOS 설치 파일만 정본. REA/Ghidra 분석은 참고 출력이며 **실행 파일의 실제 바이트, DOS 참조 실행 결과**로 재확인한다.
- 목표: **원본과 동일한 게임**을 브라우저에서 실행. 개조판·편의기능 추가·대사 재작성·현대식 밸런스 조정·새 인터페이스·임의의 음악/장면/동작 생성 **금지**.
- 진행 상태 (2026-10-31 KST): **P0 원본 61개 해시 검증 PASS; P1 MAIN/OPEN 원본↔Ghidra 주소·BSS 검증 PASS, MZ 4개 실행 파일 재배치 5,296건 전수 검사 PASS, 정적 far 제어 이전 후보 5,038건/351개 타깃 그룹 추출 PASS, KOEI.COM 조건부 DOS EXEC 기동 경로 실물 검사 PASS.** P1 전체 함수·간접/near 호출·동적 상태 분석 미완료. P3 CPU/BIOS/DOS 일부 구현 및 원본 KOEI.COM 기본 26명령 부분 실행, 명시적 합성 DOS 환경에서 4분기 최대 190명령 실행/INT66h 중단 확인까지 진행했으나 실제 초기 DOS IVT·PSP·VGA/PIT/OPL 하드웨어 참조 스냅샷 미확보로 실제 DOS/게임 부팅은 HOLD; 합성 DOS 조건에서 KOEI→원본 FMDRV 30,644명령 TSR, 원본 OPEN MZ 재배치23/VGA/DAC/타이머 ISR, OPEN 260,000명령 한도에서 실제 OPGRAPH.LZW 256바이트 DOS 원본 읽기·게스트 RAM 대조 PASS; 원본 OPGRAPH SHA 검증→14개 LS11/108개 GRAPH·3,235,136개 픽셀 인덱스 JS 디코딩 검증 및 브라우저 에셋 게이트 적용, 원본 OPEN native VGA Mode12/Write Mode2 초기화 및 관측된 Write Mode0 개별 plane 출력 11,648바이트 PASS, 시험용 IVT stub가 원본 OPEN 이미지를 덮어쓴 충돌 수정 및 12개 적재영역 검증 PASS; 원본 OPEN 기계어 LS11 해제 결과와 JS 디코더 OPGRAPH 0·13번 파트 총 116,785바이트 전체 일치, 13M 명령 중 원본 OPGRAPH DOS RAM 읽기 91,494바이트 PASS(실 DOS 참조·완성 화면/음악·OPEN 정상 종료 미검증); P2 실제 기준 트레이스와 P4~P9 전체 원작 동등성은 미완료. 근거: `ORIGINAL_P0_P1_EXECUTION_20261031.md`, `ORIGINAL_P1_RELOCATION_LAUNCHER_20261031.md`, `p1-far-transfer-candidates-20261031.json`. **제어 이전 후보 수는 포팅 완료율/검증된 함수 수가 아님.**

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

### D. 자동 C 슬롯 실행 정책 — 한 입력당 긴 개발, 입력 횟수 최소화

- **ChatGPT에 보내는 단일 입력은 언제나 정확히 `웹포팅 개발 계속진행해`다.** 작업 ID, 컨트롤러 메타데이터, 장문 프롬프트, 새 작업 발행, 자잘한 단계별 승인 메시지를 붙이지 않는다. 개발 기준·복구 지점·미완료 목록은 별도 채팅 명령이 아니라 **이 마스터 계획 하나와 최신 GitHub 소스**에서 확인한다.
- **한 번의 응답을 하나의 긴 개발 세션으로 사용한다. 목표는 실제 코드 구현·실제 분석·원본 대조·결함 수정에 20분 이상 집중하는 것**이다. 모델/도구/응답 시간 상한 때문에 정확한 실행시간은 보장할 수 없으며, 단순 대기·sleep·빈 도구 호출로 20분을 채우지 않는다. 한 명령에 1분 구현+3분 검증만 하고 끝나는 습관을 중단한다.
- 한 번 시작하면 직전 소스의 미완료 지점부터 **서로 연결된 여러 함수·기능·분기·장치 경로**를 연속 구현한다. 작은 함수 하나, 합성 테스트 하나, CI 성공 한 건은 모두 *중간 진척*이다. 다음 원본 실행 경로·인접 미완료 블록으로 즉시 이어 가며 단일 커밋을 종료 신호로 사용하지 않는다. 막힌 항목이 있으면 근거와 보류 이유를 명시하고 **독립적으로 진행 가능한 다음 원본 경로를 같은 응답에서 개발**한다.
- **작업순서:** 최신 HEAD/원본 증거/기존 이 계획에서 재개 지점을 확인 → 넓은 범위의 관련 기능 구현·수정 → 경계조건과 실제 오류 처리 → 합성 회귀를 필요한 시점에 수행 → 소스를 통합 커밋하고 해당 SHA의 GitHub Actions 확인 → 더 진행 가능한 인접 기능을 이어서 구현한다. 매 함수마다 전체 CI를 반복하거나 동일 PASS를 수차례 재검증하지 않는다. 필수 검증을 생략하거나 실패한 코드를 PASS로 만들지는 않는다.
- **입력 제한:** C 슬롯은 직전 명령과 **최소 30분 간격**을 지킨다. 20초간 응답이 안정되어 종료된 것으로 보이고 최소 간격도 지난 경우에만 같은 채팅으로 다음 한 문장을 입력한다. 00분·30분(KST)은 *보조 회복 시점*이며 독립적인 추가 명령을 누적하지 않는다. 모델이 4분 만에 끝나더라도 곧바로 명령을 난사하지 않는다. 생성 중에는 절대로 강제 중단하거나 새 입력을 던지지 않고, 기존 채팅을 재사용하며 대화 한도/복구 불가 오류에만 새 창을 만든다.
- **중요한 구분:** 30분간 후속 입력을 금지하는 것은 브라우저·GPT 과부하 방지 정책일 뿐 **응답이 30분간 개발을 했다는 증거가 아니다**. 실제 활동시간/도구 수행·소스 변경·원본 검증 여부를 구분하여 기록하며, 단일 응답의 길이는 ChatGPT 응답·도구 한도에 종속된다.
- 원작 무변경 원칙과 3-A 실행 우선순위(REA/Ghidra 전체 배치 추출 → 8086 CPU/IR/JS·WASM 실행 → DOS trace → 6인 전 기능)를 유지한다. 원본에 없는 UI·장면·음악·로직을 만들어 진행률을 부풀리지 않는다. 원본과 웹을 비교하지 않았다면 UNTESTED/HOLD이고, 소단위 CI 성공으로 P9 FULL_GAME_COMPLETE를 선언할 수 없다.
- 기존 코드·테스트·원본 근거는 보존한다. N100은 실제 REA/Ghidra/원본 확인이 GitHub·ChatGPT 로컬에서 불가능할 때 필요한 최소 작업만 수행한다. 대규모 clone·반복 빌드를 피하며 한 세션 중간 상태는 GitHub 소스 및 **이 계획**에서 재개할 수 있게 한다.

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


### M. KOEI/FMDRV/OPEN 세 원본 실행파일 단일 8086 메모리 연동 (2026-10-31 KST)

- **실제 구현:** `web/dos-com-child-runner.js`를 추가해 원본 COM 바이트가 SHA 확인·스테이징된 공유 1MiB 8086 메모리에서 DOS EXEC 시 동기식 자식 CPU 레지스터 프레임을 전환하고, 자식 종료 후 부모 프레임만 복원한다. 원본 DOS TSR이 게스트 IVT와 메모리에 남기는 변경은 유지한다. 자식 단계 예산 초과/미구현 시 **성공 종료코드를 만들어 반환하지 않고**, 게스트 CS:IP/AX/DX/실행 단계 근거와 함께 fail-closed. `web/dos-int21.js`의 DOS AH31은 현재 실행 중인 PSP를 동기 resolver로 조회하며, 기존 정적 PSP 옵션도 그대로 검증한다.
- N100 소유 정본의 원본 명령어 실제 연동 `tests/p3-koei-fmdrv-shared-original.test.mjs`: `KOEI.COM` SHA `81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36`가 DOS EXEC로 `FMDRV.COM` SHA `0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b`의 진짜 원본 기계어 **30,644 명령**을 실행한다. `AH31` TSR 요청, DOS INT66/08 게스트 핸들러의 상주, 부모 KOEI의 재개 및 원본 FMDRV INT66 종료 복귀를 공유 CPU에서 수행했다. OPEN/MAIN/END는 이 첫 분기 테스트에서만 명시적인 **합성 자식 종료 상태**이고 KOEI는 169명령 뒤 종료코드0으로 완료했다. 이 사실을 실제 게임 기동 완료로 확대하지 않는다.
- 세 번째 원본 실행파일 `OPEN.EXE` SHA `f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65`: `tools/p3-open-exec-probe.mjs`가 41,655바이트 MZ 이미지에 원본 재배치 **23건**을 적용해 CS:IP 진입. DOS 조회 `INT21 AH30`은 정확한 외부 DOS 버전·OEM·일련번호 스냅샷만 반환. DOS IOCTL `AH44 AL00`은 외부 파일핸들 표의 `DX` 장치속성만 반환(오류/없는 핸들 fail-closed). 실제 OPEN 코드가 DOS `AH4A`에서 요구한 크기는 6,566문단; 합성 시험은 명시적인 7,000문단 배정 안에서만 승인. OPEN의 기존 INT00/INT67 진입 벡터 조회는 외부 SHA 핀 IVT로만 전달.
- 공유 3실행파일 `tests/p3-koei-fmdrv-open-shared-original.test.mjs` **실제 코드 경로**: `KOEI`의 DOS EXEC로 원본 FMDRV를 상주시킨 다음 원본 OPEN MZ의 CPU 명령을 같은 메모리에서 실행해 원본 FMDRV INT66 핸들러까지 실제 도달. 원본 VGA `OUTW 3CE` 및 sequencer indexed 레지스터 출력을 `web/vga-indexed-ports.js`로 원시 인덱스·값에 따라 전송(최초 여섯 건 검증), `BIOS INT10 AX1000` 팔레트 레지스터 변경 16건을 원시 값으로 `web/bios-int10.js` 외부 장치 sink에 전송, `OUT 3C8/3C9` DAC 팔레트 원본 RGB 바이트 트리플 16개를 `web/vga-dac-ports.js`로 전송. 실제 화면·색채·플립플롭·DAC 6bit·OPL·VGA 디스플레이는 **아직 구현/검증하지 않았다**.
- 합성 `IN 3DAh` 수직동기 값(0/08 번갈아 반환)을 명시적으로 넣었을 때 OPEN 원본 CPU 경로는 **60,000명령어 상한**까지 진행했고 OPEN CS:IP `0610:1835` 근처 음악 서비스 `INT66 AX=F100h` 진행/대기 루프에서 중단했다. 이 위치와 합성 타이밍의 정확한 연결·음악 완료 조건은 아직 실 DOS/OPL/timer 증거가 없다. 원본 OPEN이 종료했다거나 한국어 장면/OPGRAPH가 재현됐다고 주장할 수 없다. **자식 예산 소진 시 부모 KOEI도 DOS EXEC 실패로 멈추며, 임의 성공 상태를 만들지 않는다.**
- 회귀: `tests/dos-com-child-runner.test.mjs`, `tests/dos-int21-version.test.mjs`, `tests/dos-int21-ioctl.test.mjs`, `tests/vga-indexed-ports.test.mjs`, `tests/vga-dac-ports.test.mjs`, `tests/bios-int10-palette.test.mjs`는 원본 파일 없는 **합성 장치/API 정확성 테스트**, GitHub Actions 필수 게이트에 모두 포함. 원본 bytecode 통합 테스트 두 건과 `tests/p3-open-original-version.test.mjs`는 **N100 private 원본**에서만 구동해 PASS, 원본을 업로드하지 않았다. 필수 `synthetic-static` PASS를 확인한 검증 SHA `a8a005a396883419dd6f2f442bb248838c9399f4`, Actions run `41163766584`. 동일 작업의 초기 CI 두 번은 구형 에러 문자열 검사와 새 버전 서비스 계약의 충돌 때문에 실패했으며, 원인 조정 후 최종 CI 성공을 확인했다.
- **후속 실제 개발:** DOS 실기 기준 PSP/MCB/IVT/핸들 표 및 VGA 인덱스·DAC·수직동기와 FMDRV 상주 `IRQ0`의 실제 타이밍/OPL 상태를 **원본 참조 실행**에서 측정하고, 스냅샷·장치 모델·정확한 영상/오디오를 구현한다. 그 뒤 OPEN 원본을 MZ 초기 진입부터 화면 완료까지 실행하고, `MAIN.EXE`의 역어셈블리/상태머신·항구/항해/거래/전투/세이브를 정확한 원본 바이트와 동적 참조로 검증한다. 본 작업은 P3 진행이며 P4~P9 동등성 **UNTESTED/HOLD**다.


### N. 원본 OPEN IRQ0·OPGRAPH.LZW 리소스 읽기 원본 바이트 검증 (2026-10-31 KST)

- 이번 실소스: `web/guest-irq-boundary.js`는 이미 설치된 IVT와 8086 IF 플래그를 확인한 뒤 **호스트가 명시적으로 요청한 IRQ**에 한해 원본 게스트 ISR을 실행한다. `web/dos-com-child-runner.js`의 동기식 bounded `onInstructionBoundary`는 원본 CPU 프레임을 보존하고 IRQ 타이밍을 강제 생성하지 않는다. 정확한 PIT 발진 주기, PIC 마스킹/EOI 타이밍, STI 한 명령 유예, 기타 하드웨어 상태는 구현/동등성 미검증. 반면 테스트의 실제 FMDRV 원본 INT08h 처리와 `OUT 20h=20h` 이벤트, IF=0 구간 IRQ 차단을 원본 명령에서 관측했다.
- `tests/p3-koei-fmdrv-open-irq-original.test.mjs`는 공개 불가 한국어판 정본 **KOEI.COM → FMDRV.COM TSR → OPEN.EXE MZ** 를 한 CPU 메모리에서 실행하며, 테스트 전용 **128 명령마다 외부 IRQ0 주입** 조건과 `maxSteps=260000` 상한을 **실제 PIT 시간·원본 참조 실행으로 취급하지 않는다**. 180,000 원본 OPEN 명령을 넘어 202,538번째 명령에서 `DOS AH48 BX=1000h` (4,096문단) 호출 관측. `web/dos-int21.js`에 `AH48`을 외부 MCB 할당기 결과/메모리 경계·DOS 오류 7/8로 엄격 위임(정본 DOS 블록 리스트 자체는 아직 없음). N100 테스트는 사용자가 명시한 합성 `segment=3000h`만 승인했다. 그 뒤 `INT21 AH35 AL33h` 초기 mouse/interrupt vector 확인, `AH0Dh` 외부 disk reset, `BIOS INT16 AH01h` 외부 키보드 큐 상태 조회를 원본 실행에서 확인했다. `web/bios-int16.js`는 실제 키보드 이벤트 제공 없이 `no-key`로 응답하지 않으며, test-only empty key queue를 별도로 공급했다.
- 원본 OPEN 실행 98,941번째 명령에서 실제 `DOS INT21 AH3D` pathname은 **`C:OPGRAPH.LZW`** 로 관측. **C:에 바로 붙은 drive-relative 경로**이며, 임의로 경로를 정규화하거나 자산을 번역하지 않았다. 소유자 원본 `OPGRAPH.LZW` 길이 **443,529바이트**, SHA-256 `f66bbd7417283c39ed425e14c3b09480a23edad55242b485851a0db85dbcbd1d` 확인 뒤 `web/pinned-dos-resources.js`에서 명시적 DOS 경로↔원본 byte snapshot을 SHA-256 검사하여 read-only 반환. N100 실제 byte test에서 DOS `AH42h` 파일 위치 **16바이트**, `AH3Fh` **256바이트 읽기**가 **205,469번째 원본 OPEN 명령**에서 실행됐고, 게스트 DS:DX 메모리의 256바이트가 `OPGRAPH.LZW[16..271]`과 **전 바이트 일치**, 읽은 256바이트 SHA-256 `dfcefc8435db0a712b52a6afd04ba4a04731605fc4d7872ee5c43464283d40d3`으로 확인. 이 파일 바이트를 GitHub에 올리지 않았다.
- 이번 실제 원본 추적 테스트의 추가 근거: 128-step 합성 IRQ 간격 + 260,000 원본 OPEN instruction cap에서 외부 IRQ 전달 1,029회, 원본 OPGRAPH 파일 Open/Seek/Read 성공, `OPEN.EXE`는 아직 `FMDRV` ISR 및 자체 로직에서 예산 소진해 **정상 종료하지 않았다**. 타이머 128-step·가상의 C: 기본 드라이브·합성 초기 IVT 66/65/08/00/67/33·DOS 6.22 응답·OPL 상태 00·PIC EOI raw sink·VGA VSync 00/08은 **진짜 DOS/하드웨어 캡처값이 아님**. MAIN/END 자식 실행 또한 아직 진행하지 않았으며, 원본 화면/음악/콘텐츠의 동등성은 미검증.
- 배포 소스 원칙: 원본 FMDRV와 그래픽·DOS 장치 호출은 원본 바이트를 실행하거나 외부에 원시 요청을 전달할 뿐 색/음악/키 입력을 임의 생성하지 않는다. 브라우저 실제 동작은 별도의 참조 DOS 실행 기록, 표준 DOS 메모리 할당/파일 핸들/프로세스 상태, VGA/OPL 장치 모델과 렌더러를 구현한 후에만 검증할 수 있다.
- 회귀 게이트: `tests/guest-irq-boundary.test.mjs`, `tests/pinned-dos-resources.test.mjs`, `tests/dos-int21-drive.test.mjs`, `tests/dos-int21-allocate.test.mjs`, `tests/dos-int21-disk-reset.test.mjs`, `tests/bios-int16.test.mjs`는 원본 불필요 합성 검사; 공개 CI의 필수 `synthetic-static`에 포함. N100 개인 원본 `tests/p3-koei-fmdrv-open-irq-original.test.mjs` 결과는 별도 PASS. 정확한 검증-bearing 소스 SHA `4893c0fa3f4c668cafd9a80cb496491651d2fed9`, GitHub Actions `41165637921` **SUCCESS**. 동작 캡처용 원본 시험·개발계획 docs-only 변경은 동일 작업의 추가 점수 없음.
- 다음 순서: 실제 DOS 8086 IRQ/PIT cadence와 FMDRV/OPL 상태를 캡처하고 VGA/OPGRAPH 원본 그래픽 압축 디코딩/화면 VRAM을 참조로 비교. 파일 DOS `3D/3F/42`를 원본 실행 트레이스 기반 프로세스별 오픈핸들·파일 위치로 검증; 실제 OPEN 초기 화면 및 MAIN.EXE 원본 CPU/항해/항구/교역/전투/세이브까지 이어간다. 현재 `P3=PARTIAL`, `P2/P4~P9=UNTESTED/HOLD`.


### O. OPGRAPH.LZW SHA 고정 전 파트 웹 디코딩·브라우저 리소스 연동 (2026-10-31 KST)

- **실제 새 소스 구현:** `web/opgraph-original-archive.js`는 소유자 제공 원본 `C:OPGRAPH.LZW` SHA-256 `f66bbd7417283c39ed425e14c3b09480a23edad55242b485851a0db85dbcbd1d`를 압축 해제 **이전**에 확인하고, 기존 LS11 헤더/FAT·GRAPH 레코드 파서를 크기 상한(원본 파일, 1파트 최대, 전체 해제 바이트) 및 원본 DOS 경로와 연결한다. 반환되는 원본 파일/해제 파트/레코드 바이트는 호출자 변경이 내부 검증본을 오염시키지 않도록 별도 복사한다. 출처·원본 DOS 파일의 `C:OPGRAPH.LZW` 드라이브 상대 경로를 그대로 유지한다. 압축 해제는 기존 **자바스크립트 LS11 디코더**를 사용하며, **원본 OPEN.EXE 기계어 압축 해제 루틴과 결과가 동일하다는 주장은 금지**한다.
- 사용자 소유 한국어 원본 `OPGRAPH.LZW` **443,529바이트**를 N100에서 SHA 대조 후 직접 해석했다. 실제 원본 압축 파트 **14개**, GRAPH 레코드 **108개**, 압축 해제된 파트 전체 **512,912바이트**. 파트별 레코드 수 `[16,2,2,11,8,8,8,8,15,11,5,2,2,10]`. 신규 `web/opgraph-korean-evidence.js`에는 **14개 파트의 현재 JS 디코더 출력 SHA-256 지문만** 기록(원본 게임 자산 바이트/글꼴 포함 안 함), `expectedDecodedSha256` 14개를 한 파트도 빠뜨리지 않고 검사한다. 손상된 원본 파일 해시, 개별 해제 파트 해시, 파트 수·레코드 수, 허용량 초과, 잘못된 DOS 경로는 **fail-closed**.
- 브라우저 실제 경로 `web/app.js`의 `loadOpeningGraphics`는 이제 **기존 직접 `decodeOpeningArchive` 호출 전에 아무 검사 없이 이미지를 표시하던 경로를 사용하지 않는다**. 원본 `OPGRAPH.LZW`의 고정 SHA, 파트 수 및 14개 해제 결과 SHA, 원본 파일 길이 및 전체 레코드/해제 바이트 검증이 끝나야 `decodeOpeningVerifiedArchive`에서 GRAPH 픽셀 데이터를 조립한다. 새 `web/opening.js` 함수는 검증되지 않은 아카이브를 거부하며, UI에 전달되는 14파트/108레코드의 `width/height/indices` 계약을 유지한다. 사용자 원본 데이터가 일치하지 않으면 그림을 조용히 바꾸지 않고 오류로 처리한다.
- N100 개인 실제 원본 실행 `tests/p3-opgraph-original-decoded.test.mjs`: **14개 파트 전체 해제 SHA PASS**, **108개 GRAPH 레코드**와 기존 파서의 이미지 픽셀 인덱스 총 **3,235,136개**를 서로 전부 대조 PASS. 비교 기준은 기존 **두 JS 경로**이며, 두 디코더가 공통 구현을 쓰기 때문에 **독립적인 원본 OPEN.EXE 화면/압축 알고리즘 동등성 증거가 아니다.** `tests/p3-koei-fmdrv-open-irq-original.test.mjs` 기존 기계어 실행과 같은 원본 SHA 검증 아카이브를 연결하고, DOS `AH42/3F`의 `OPGRAPH.LZW` **16바이트 오프셋/256바이트** 실제 읽기 게스트 RAM 비교 및 원본 OPEN 260,000명령 상한 실행을 다시 확인했다. 이는 **원본 파일 바이트→게스트 RAM** 구간에 한해서만 원본 바이트 완전 일치다.
- 저작권 원본은 공개 저장소에 올리지 않았으며, `tests/opgraph-original-archive.test.mjs`, `tests/opening-verified-archive.test.mjs`는 자산 없는 합성 LS11/GRAPH 테스트. 검증된 `uw2-web-port` CI source SHA `068ebefd399553950b71e3810642af0f266c343d`의 `synthetic-static` 실행 결과는 GitHub Actions run `41167349469` 참조. 스테이징 파일·테스트·마스터 계획 갱신은 하나의 개발 작업이다.
- 남은 P3/P4 작업: 원본 `OPEN.EXE` 압축 해제 함수의 **실제 기계어 출력 메모리 SHA와 JS 파트 SHA 교차 비교**, VGA VRAM/팔레트·하드웨어 3DA/OPL/PIT 기준 프레임 및 음악 시간표 수집, 원본 오프닝의 장면/페이드/플레인별 픽셀 배치의 정확한 참조 검증. 현재 기존 `KoreanOpeningPlayer`는 `exactReplayReady:false`로 남아 있고 일부 애니메이션·타이밍이 근사치다. **원본 화면·음악·게임 전체 완성 아님.**
- 후속 네이티브 비교 실험: SHA가 일치하는 원본 KOEI→FMDRV→OPEN 코드를 명시적 **합성 IRQ 128명령 간격**에서 260,000명령까지 실행 후 공유 게스트 1MiB RAM을 읽기 전용으로 조사. 현재 JS LS11 해제 파트 0~3의 연속 원시 출력 첫 16바이트 서명 일치 후보 **각 0건**, 전체 파트 완전 일치 **0건**. 이 음성 결과는 실 DOS 기준 실행에서 해당 출력이 없음을 증명하지 않으며, 레코드 단위·VGA 플레인 단위 변환이나 재사용 버퍼/IRQ 진행 차이 때문일 수 있다. 추정으로 동일성 PASS 처리하지 않는다. N100 전용 진단 테스트 `tests/p3-koei-fmdrv-open-irq-original.test.mjs` 변경 `aa29ce05d3130c48eeaf45f2f9783ed92927780a`, 다른 점수 없음.


### P. 한국어 OPEN.EXE 원본 VGA Mode 12h 쓰기/평면 추적 (2026-10-31 KST)

- 원본 기계어의 실제 효과 검증에 필요한 `web/realmode-8086.js` **선택적 passive memory-write observer**를 구현했다. 8086 원본의 메모리 쓰기 전 20비트 물리주소·원본 바이트·이전 바이트를 읽기 전용 이벤트로 전달하며, 합성 반환값·비동기 콜백을 거부하고 observer 없이 실행할 때 원래 메모리 흐름을 유지한다. CPU가 작성하지 않은 프레임이나 게임 픽셀을 생성하지 않는다.
- `web/vga-mode12-planar-witness.js`는 IBM VGA Mode 12h **640×480, 16색, 4개의 1bit plane** 중에서 원본이 실제로 선택한 제한적 **GC03=00h, GC05=02h(Write Mode 2), GC08=FFh, Sequencer02=0Fh**의 직접 CPU `A0000h` 바이트 쓰기만 처리한다. 완전히 관측되지 않은 bitplane은 조회 시 `null`로 남고, 모든 visible 영역을 원본 CPU가 쓰지 않았다면 프레임 직렬화를 거부한다. VGA write-mode-2의 CPU 값 하위 nibble이 각 plane byte로 확장되는 규칙을 적용하고, bit mask ≠ FFh·GC logic op ≠ replace·write mode ≠ 2·기타 미확정 구성은 **지원되지 않는 화면으로 fail-closed**한다. 원본 VGA BIOS 내부 초기 레지스터/래치, 읽기모드, DAC·EGA 색변환, 실제 CRT 타이밍은 **미구현**이다.
- 소유 한국어 DOS 게임 정본을 사용한 `tests/p3-koei-fmdrv-open-irq-original.test.mjs`의 한정 **SYNTHETIC** DOS/IRQ0 설정(원본 KOEI→FMDRV TSR→OPEN MZ 진입; 외부 IRQ0 주입 간격 = 128 게스트 CPU 명령; OPEN 실행 예산 = 260,000)에서 BIOS INT10 모드 요청 `12h`, VGA GC/SEQ 레지스터 6회(그래픽 인덱스 1=0,3=0,5=0,8=FF, 시퀀서 인덱스 2=0F, GC5=02)와 원본 게스트 `A0000h` 주소로 **38,400개 CPU byte write**를 관측. 640×480 가시 화면 38,400바이트/plane 전체를 Write Mode 2로 해석했을 때 네 plane의 유효성 모두 충족하고 **307,200개 색상 인덱스** 배열 생성 PASS; 배열 SHA-256 `7818f5542a0404157573be6cffc0e0c8e68ce3c0f5d17d07ccdd9313fb700baf`. 첫 16개 픽셀 색상 인덱스는 모두 0이며, 이 초기 **화면 초기화/클리어** 상태만 확인했다. OPGRAPH 이미지의 화면 blit·장면 전환·실 DOS frame parity를 확인했다는 뜻이 아니다.
- N100 원본 실기 테스트에서 이 SHA와 `visibleWrites=38400`, `fullyCoveredBytes=38400`, `graphicsMode=2`, `mapMask=15`를 강제해 PASS. 공개 합성 회귀 `tests/realmode-8086-memory-witness.test.mjs` 및 `tests/vga-mode12-planar-witness.test.mjs`에서 observer가 실제 쓰기를 변경하지 않음, masked four-plane write, 640×480 화면 인덱스, 미초기화 픽셀 fail-closed, non-mode2 fail-closed PASS. GitHub Actions `synthetic-static` 성공 검증 소스 SHA `4e0b64e3ed3cb594d3e655d908086d42f54b7c99`, run `41169335459` PASS. 원본 비공개 자산·폰트·프레임 원시 바이트는 공개 저장소에 넣지 않았다.
- 다음 필수 구현: 실제 `OPEN.EXE`가 OPGRAPH 압축 해제한 결과가 존재하는 원본 메모리의 **함수 쓰기 경로/주소**를 역어셈블리·실 DOS 기준 추적으로 특정하고, 그 메모리의 픽셀/4-plane/delta frame을 JS GRAPH 디코더의 출처와 독립적으로 비교. 실제 DOS BIOS MODE12 초기 latch/GC/Sequencer/VRAM·PIT/OPL 타이밍 캡처가 없으므로 원본 화면이 표시됐다고 선언하지 않는다. P3=PARTIAL, P2/P4~P9=HOLD.


### Q. 원본 OPEN.EXE 적재주소 충돌 수정 · 기계어 LS11 완전 일치 2파트 · VGA Mode 0 실제 출력 (2026-10-31 KST)

- **정본 훼손 테스트 결함 수정(중요):** 이전 사용자 비공개 원본 실행 테스트에서 합성 `INT 66/65/08/00/67/33` 초기 `IRET` stubs를 segment `0900h..0950h`에 배치했다. 실제 `OPEN.EXE` MZ는 `0610:0000`부터 41,655바이트이므로 기존 `0900h` 물리주소는 **원본 MZ 이미지 안에 겹쳐 원본 바이트를 덮어쓰는 중대한 테스트 오류**였다. `tests/p3-koei-fmdrv-open-irq-original.test.mjs`에서 합성 인터럽트 코드를 격리된 `E000h..E050h` 영역으로 이동. 신규 `web/guest-staging-physical-map.js`는 모든 원본 COM/MZ 이미지, 3개 DOS PSP, 6개 합성 IVT handler 등 **12개 물리주소 영역**의 20-bit non-wrap/disjoint preflight를 **실제 RAM 적재 전에** 수행; 기존 0900h 충돌을 재현하여 필수 실패시키는 `tests/guest-staging-physical-map.test.mjs` PASS. **이전 덮어쓰기 상태에서 보고했던 파일 offset 189/가짜 코드 진행은 검증된 원본 실행이라고 재사용 금지.**
- FMDRV 및 DOS 하드웨어로 `web/opl2-raw-write-bus.js`(original `OUT 0388h` index→`0389h` data pairing, source CS:IP, unknown status fail closed), `web/pit8253-counter0-witness.js`(original `OUT 0043h=36h`, `OUT 0040h=00h`, `OUT 0040h=10h`, 원본 reload `4096`), 외부로만 노출되는 원래 사운드·인터럽트 기기 호출을 구현. 실제 KOEI→원본 FMDRV TSR→원본 OPEN MZ 공유 RAM 실행에서 OPL2 원본 레지스터 쓰기 **6회**(`04h=60h,80h`, `02h=FFh`, `04h=21h,60h,80h`)와 원본 PIT reload 4096 확인. 테스트의 OPL status = 0, 128-instruction 간격 synthetic IRQ는 **실제 YM3812/타이머 입력/재생이 아니며 음악 PASS 불가**.
- `web/dos-readonly-files.js`의 선택적 `onFileEvent` 및 `web/dos-int21.js` 전달을 구현: original `AH=3D/42/3F/3E` open/seek/read/close의 원본 경로, 파일 오프셋, 요청/실제 길이, DS:DX 및 20-bit 물리 주소를 원본 game byte 없이 감사할 수 있다. N100 실행에서는 모든 read 후 게스트 RAM을 원본 `OPGRAPH.LZW`의 정확한 source byte slice와 대조. 고정 합성 DOS/PIT/OPL 입력에서 **13,000,000개 원본 OPEN CPU 명령 제한**, 실제 OPGRAPH 누적 읽기 **91,494바이트** 모두 일치 (source hash `f66bbd7417283c39ed425e14c3b09480a23edad55242b485851a0db85dbcbd1d`). **수정 후 원본 파일 시작 오프셋은 16→272→444→1468...**. 500k 명령에서 2,316바이트, 1M에서 6,412바이트 확인. 프로그램 종료/실 DOS 참조 동등성은 검증하지 않았다.
- 가장 중요한 독립적인 원본 기계어↔JS 디코더 비교: 원본 `OPEN.EXE`가 실제로 합성 DOS `AH48 BX=4096`에서 외부 제공받은 `3000:0000h` 원시 RAM에 해제한 part `0` 전체 **52,748바이트**가 JS LS11 `graphEvidence.decodedSha256[0]`와 완전 일치했다. **실제 원본 OPEN CPU 실행 5,715,968번째 명령어**, SHA-256 `d4d9c9aff604102513814482cacbc8c44eb8148cc7e9a0b572883ca1b21ba560`. 같은 0x30000 임시 버퍼를 후속 파트가 덮어쓰기 때문에 프로그램 종료 시점 RAM만 보는 방식으로는 놓치며, `onInstructionBoundary` 1,024명령 간격에서 **원본 RAM을 읽기만 하는 live byte witness**로 완전 일치를 포착했다. 인덱스 `13`(최종 OPGRAPH 파트) **64,037바이트**도 원본 실행 **11,425,792번째 명령어**에서 JS 출력과 완전 일치, SHA-256 `d167fd4a179c675ee894c77a87da356bebbf9a3ed46dd72bdef5153c70d3d5d5`. 현재 **14파트 중 2파트만 독립 native-vs-JS FULL byte parity PASS**. 다른 12파트, 원본 DOS 무보정 실행, 렌더/타이밍·음악은 미검증.
- 그다음 `OPEN.EXE` 원본은 BIOS Mode `12h`의 VGA 초기 `Write Mode 2`에서 **GC05=00h, GC01=00h, GC03=00h, GC08=FFh, Sequencer02=01/02/04/08h**의 **Write Mode 0**로 전환한다(검증된 원본 CPU `OUT` 이벤트). `web/vga-mode12-planar-witness.js`의 mode0 추가는 설정된 plane별로 CPU raw byte를 직접 기록하고, 이전 mode2 전체 clear로 검증한 나머지 plane을 보존한다; 지원되지 않은 latch/ROP/bit mask는 fail closed. 소유 원본 실행 13M 명령에서 `A0000h` 총 88,448 byte writes 중 mode2=76,800, mode0=11,648 확인. 이 시점의 grounded 640×480 인덱스 프레임 SHA-256 `de5c45c4cbde52268f1ae98b8db9041fa24ceca1342d0c81ab908232aff98634`, non-zero 인덱스 픽셀 **198개**, 범위 x=216..423/y=246..247, index0 307,002개. **원본 실 DOS 참조 시각/팔레트/완성 오프닝 화면 검증이 아니며 첫 부분적으로 그려지는 구간의 관측**에 불과하다. 13M 단계는 명시적 명령 예산으로 종료, 게임 프로세스 종료 아님.
- 공개 자산 없는 회귀검사 `tests/opl2-pit-raw-witness.test.mjs`, `tests/guest-staging-physical-map.test.mjs`, `tests/dos-file-transfer-provenance.test.mjs`, 갱신 `tests/vga-mode12-planar-witness.test.mjs`와 전체 기존 테스트가 GitHub Actions `synthetic-static` **SUCCESS**. Native 원본 실물 검사는 N100에서 분리하여 `tests/p3-koei-fmdrv-open-irq-original.test.mjs`에서 128 synthetic IRQ step / 13M bounded original CPU instruction 원본 실행 PASS, 소스 커밋 `a7de647af28dc7a0d2809298a561a5b5fc372119`, Actions run `41172467193` green. 원본 게임 파일은 GitHub에 커밋하지 않았다.
- 다음: 나머지 12개 OPGRAPH 파트에 대해 원본 native decoder source buffer 위치/선택 경로를 식별하고 live SHA를 계량, 실제 render/update 종료 프레임 및 VGA DAC/GC·CRT 상태를 원본 DOS 참조 실행과 교차 검증. 실제 PIT 입력 및 FMDRV 음악 프레임 타이밍, 원본 `OPEN.EXE` 종료→`MAIN.EXE`·항구/항해/교역/전투/세이브 전체 기능은 아직 구현/검증 전이므로 자동화 작업 완료 처리 금지.


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

## 9. 2026-10-31 P3 인터럽트 억제 정확성 및 다음 원본 검증

- CPU 본문 `web/realmode-8086.js`: `STI`, `MOV SS`, `POP SS` 직후 다음 한 **명령어** 완료까지 실제 8086 maskable 외부 IRQ 인수 금지. 다음 명령어 처리 뒤 허용하며 연속 STI는 억제 기간을 새로 시작한다. `CLI`는 즉시 IF=0이며 software `INT`는 별도 분기다.
- `web/guest-irq-boundary.js`: IF=0과 명령어 직후 shadow를 구분해 원본 외부 IRQ 전달을 차단. 기존 IVT 확인 및 호스트 명시적 IRQ 이벤트 요구는 유지한다. 불명 PIT/PIC IRQ phase·하드웨어 pending edge를 임의 합성하거나 자동 재전달하지 않는다.
- `web/dos-com-child-runner.js`: 자식 DOS CPU frame 시작 시 shadow를 초기화하고 종료 및 실패 시에도 부모 CPU의 shadow를 복원. 원본 기계어 저장 영역은 변경하지 않는다.
- `tests/guest-irq-boundary.test.mjs`에서 STI 1-instruction 지연, 연속 STI, POP SS, MOV SS, DOS EXEC 독립성, 실제 guest IVT 진입을 합성 fixture로 확인. source/validation SHA `beb907d4c64f8c2b4186935d78491003fa327cb2`, GitHub Actions `UW2 Web Fidelity Static Gate` run `41197383631` **SUCCESS**. 이것은 **합성 CPU 회귀**이며, 사용자 한국어판 원본 OPEN/MAIN 실행/PIT 실시간 인터럽트·브라우저 원작 영상·오디오의 실제 DOS 일치 검증은 **UNTESTED**.
- 다음 작업은 원본 KOEI→FMDRV→OPEN의 기존 소유 원본 정적·동적 경로에서, 외부 IRQ 주입 시점별 CS:IP/IF/SS/ISR 전이 차이를 기록하고 실제 DOS PIT/PIC 기준 trace와 비교하는 것. 이후 OPGRAPH 나머지 12파트의 native decoder parity, 완전한 VGA 화면, OPEN 종료→MAIN 호출, 전체 항구/해상/교역/전투/세이브 순서로 진행하며 임의 장면·음악으로 대체하지 않는다.

## 10. 2026-11-01 P3 반복 문자열 명령 중간 인터럽트 가능 실행 경계

- 원본 한국어판 OPEN/FMDRV 초기 실행에서 합성 고정 128/2048명령 간격 IRQ 주입만으로는 **8086의 REP 반복 문자열 명령 내부** 인터럽트 경계를 표현하지 못했다. 기존 `RealMode8086.step()`은 REP 전체를 호스트 한 단계에 실행했다. 이는 의미적 문자열 복사 결과가 같더라도 게스트 ISR 진입 가능한 중간 CS:IP/CX/DS/ES/SI/DI 시점을 놓치는 결함이다.
- 실제 구현 SHA `4b7b606449f7281e2777faf8bb287dde5cfab811`: 8086 CPU `interruptibleRepStrings:true` 명시적 옵션을 추가했다. REP MOVS/CMPS/STOS/LODS/SCAS를 각 반복 회차 뒤 외부 IRQ 경계에서 관측 가능하게 하고, 남은 CX>0이고 조건이 계속 맞으면 명령 시작 **전체 접두어 주소**로 IP를 되감아 ISR 후 IRET에서 수정된 CX/SI/DI/FLAGS로 재개한다. REPE/REPNE 비교 중단, CF/ZF, DF 역방향, 16-bit 오프셋 wrap, 레지스터와 소스 세그먼트 오버라이드 의미를 유지한다.
- 외부 maskable IRQ는 기존 IVT/IF 검증을 그대로 거친다. 앞선 `STI/MOV SS/POP SS`로 **다음 전체 명령**을 보호할 때는 REP 내부 회차를 쪼개지 않고 실행해 후속 명령 전체의 인터럽트 억제를 유지한다. 새로운 PIT/PIC IRQ 시계/대기 큐·우선순위는 절대 꾸며내지 않는다.
- 공개 원본 미포함 CI 게이트에 `tests/realmode-8086-rep-interruptible.test.mjs` 포함: 합성 REP/IRQ/IRET 실제 게스트 IVT 진입·prefix resume, MOVSW/SCASB/CMPSB/STOSW/LODSW, STI·SS 억제, CX=0, 레거시 기본 atomic 모드 비교. GitHub `UW2 Web Fidelity Static Gate` run `41213070497`, source SHA `4b7b606449f7281e2777faf8bb287dde5cfab811`, synthetic-static **SUCCESS**.
- 원본 실기 플래그는 **기본 OFF**: 기존 OPEN 13M-step 구간/OPGRAPH part0·13 해제 SHA·VGA 원본 CPU 검증 시점 수치를 갑자기 바꾸지 않는다. 다음에는 소유 원본 입력을 사용한 별도 `interruptibleRepStrings:true` 고정 조건에서 guest original OPEN/FMDRV의 REP 내부 중단·재개 및 초기 화면/파일 해제 출력 차이를 **경량 구간**부터 대조하고, 가능할 때 실제 DOS/PIT/PIC 참조 트레이스와 검증한다. 이 새로운 모드의 ORIGINAL_DOS_RUNTIME / FULL_GAME / BROWSER_PARITY는 아직 **UNTESTED**다.

## 11. 2026-11-01 P3 DOS PSP별 원본 파일 핸들 소유권·상속 범위

- 기존 `web/dos-readonly-files.js`의 단일 read-only handle `Map`은 동일한 8086 CPU를 쓰는 부모 KOEI와 자식 FMDRV/OPEN에서 프로세스별 핸들 번호를 구분하지 못했다. 서로 다른 부모/자식의 handle #5 열기·읽기·닫기가 충돌하거나 seek 위치를 오염시킬 수 있는 결함이다.
- source SHA `4cf3e210e9c7b9ff60accb7c28e301d218dcaf60`에서 `getFileProcessPsp` 옵트인으로 PSP별 JFT를 분리하고, `inheritReadOnlyFileHandles(parentPsp,childPsp)`에만 동일 SFT(원본 byte snapshot과 공유 seek cursor)를 명시적으로 상속한다. 자식의 JFT close 또는 재사용은 부모 핸들을 지우지 않는다. `releaseReadOnlyFileHandles(psp)`는 소유자가 종료를 확인할 때만 호출하도록 격리했다. 기존 단일 프로세스 호출자는 동일한 unscoped 경로를 사용한다. 확인되지 않은 DOS PSP, 비동기 소유자, 자동 승계·가상 DOS 기본값은 거부한다.
- 새 `tests/dos-readonly-files-process.test.mjs`는 8086 CPU + INT21 adapter에서 부모/자식의 각기 독립적인 #5, 명시적 상속 후 SFT seek 공유, 자식 close 이후 부모 파일 유지, 명시적 정리, 잘못된 PSP/비동기 반환 거부를 **합성 테스트**로 검사했다. 동일 소스 SHA에 대한 GitHub `UW2 Web Fidelity Static Gate` run `41213267899` **SUCCESS**; 이로써 DOS 참조 실행 동등성이 증명된 것은 아니다.
- 이어 `tests/p3-koei-fmdrv-open-irq-original.test.mjs`의 기존 외부 설정 `activePsp=0200h/0400h/0600h`을 `getFileProcessPsp`로 실제 DOS 파일 서비스에 연결한다. 해당 환경은 여전히 **명시적 합성 PSP/IRQ/OPL/BIOS**다. 비공개 원본 재실행과 독립 DOS 캡처 비교는 **UNTESTED**이고, 실제 DOS EXEC JFT 상속 규칙·종료·TSR 메모리 책임은 DOS 참조 PSP/JFT/MCB 스냅샷 전에는 자동 구현하지 않는다.
- 다음은 원본 `KOEI → FMDRV TSR → OPEN` 파일 열기/read/seek/close를 PSP별 근거와 함께 재검증하고, DOS 실제 기기/인터럽트 트레이스 확보 및 OPGRAPH 미검증 12파트 원본 기계어 출력 비교를 계속한다. `MAIN.EXE`의 전체 진행 및 전체 게임 동등성은 여전히 **HOLD/UNTESTED**다.


### DOS 원본 파일 핸들 DUP/FORCEDUP와 PSP별 SFT 위치 공유 (2026-11-01 KST)

- 기존 읽기 전용 원본 바이트 경계에 DOS INT21 AH=45h DUP, AH=46h FORCEDUP(기존 대상 핸들 교체)를 구현했다. 한 PSP의 개별 JFT 엔트리는 동일 SFT 파일 위치를 참조하며 자식 PSP로 명시적으로 상속된 복제 핸들도 같은 읽기 위치를 공유한다. 46h 성공 시 AX를 임의로 갱신하지 않고 CF만 정리하며, 실패는 명시적 DOS 오류를 반환한다.
- 파일 핸들 경계에서 검증되지 않은 DOS 표준 장치 0..4 강제 복제, 미확인 JFT 용량 확장, source=destination의 DOS 3.30 예외 상황은 원본 동작으로 가장하지 않고 fail-closed한다. 어댑터의 현재 경계 5..36은 기존 구현 한도이지 원본 DOS PSP/JFT 스냅샷 검증치가 아니다.
- 소스/테스트와 GitHub Actions 작업흐름 커밋 `a49db79d00116d504ad5f908781d9194595c844d`, 검증 포함 후속 SHA `1754c2e81366cbd2080425b6b8cca5d1ce7ee5d4`. GitHub Actions UW2 Web Fidelity Static Gate `synthetic-static` run `41215554965` SUCCESS; `tests/dos-file-duplication.test.mjs` 결과 PASS 및 기존 synthetic gate PASS. 첫 SHA CI 실패는 테스트 이벤트 옵저버가 `Array.push` 반환값을 무심코 노출한 데 기인해 같은 성과 내에서 수정했다. 독립 실 DOS 실기·원본 게임 바이너리·브라우저 전체 플레이는 UNTESTED이며 원본 세이브 쓰기 경로는 계속 봉쇄한다.
- 다음 실제 게이트: 사용자 소유 DOS 기준 PSP의 JFT 길이·핸들 0..4의 device/redirection·DUP2 대상 범위 및 원본 OPEN 실행 중 AH45/46 진입 여부를 읽기 전용으로 검증한다. 이후 OPEN→MAIN 전환 및 실제 파일/화면/OPL 타이밍 동등성 추적을 이어간다.


### 실제 원본 파일 읽기의 PSP 증거 연결 및 합성 EXEC 복귀 검증 (2026-11-01 KST)

- `54bdecacdf06e64775f05bd5075b462476b0e726`: 원본 읽기 전용 파일 감사 이벤트에 외부에서 지정한 PSP를 명시적으로 기록한다. 미지정 PSP의 기존 단일 프로세스 감사 구조는 변경하지 않는다. 이는 DOS PSP를 CS/DS로 유추하는 편법이 아니라 기존 소유자 스냅샷 전달 계약이다.
- `tests/dos-exec-file-inheritance.test.mjs`: 원본 저작권 데이터 없이 실제 8086 명령과 DOS INT21을 순차 실행하는 합성 부모→자식 `4B00h` 경로를 구축했다. 부모 `3D/3F`, 자식 상속 핸들 `3F/3E/4C`, 부모 `3F` 재개에서 원본-byte fixture의 바이트 11,12 → 13 → 14와 각 PSP·파일 오프셋을 대조하고, 자식 JFT 종료 후 부모 SFT 커서 연속성을 검증한다.
- 비공개 `tests/p3-koei-fmdrv-open-irq-original.test.mjs`는 실제 소유 한국어판 `OPEN.EXE` 파일 접근 이벤트의 PSP가 사전에 공급한 **합성 `0600h`**인지 검증하도록 수정했다. GitHub Actions에서 실행하는 자산 없는 합성 검사와 별개이며, 이 변경 후 **원본 실행 테스트는 재실행하지 않았으므로 UNTESTED**다.
- 소스 SHA `54bdecacdf06e64775f05bd5075b462476b0e726`의 필수 `UW2 Web Fidelity Static Gate` run `41215502892`: `synthetic-static` **SUCCESS**. 파생된 개인 원본 실행·실 DOS PSP/JFT/IRQ 캡처·브라우저 화면/항구/항해/교역/전투/세이브 동등성은 **HOLD/UNTESTED**.
- 다음에는 원본 소유 파일을 갖춘 환경에서 제한된 기존 OPEN 추적 스크립트를 재실행해 PSP별 DOS file provenance를 확인하고, 원본 해제 14파트 중 아직 직접 CPU parity가 입증되지 않은 12파트, 완전 VGA 영상/OPL/MAIN 분기를 계속 추적한다.


### 원본 VGA Mode12 부분 영역 증거만 추출하는 검증 경계 (2026-11-01 KST)

- `web/vga-mode12-planar-witness.js`에 `captureGroundedIndexedRect(x,y,width,height)`를 구현했다. 기존 `captureCompleteIndexedFrame()`은 640×480 전체 픽셀 확인을 계속 요구하지만, 새 메서드는 실제 원본 CPU가 기록해 4개 VGA plane의 유효성이 확인된 지정 사각형만 엄격히 추출한다. 비트 단위 경계/화면 가장자리와 행 단위 바이트 주소를 정확히 계산하며, 확인되지 않은 VRAM 배경·패딩은 채우지 않는다. 호출자가 픽셀 배열을 바꿔도 내부 근거 plane은 변경되지 않는다.
- 소스+회귀검사 SHA `900b906dc17617af8a4c06aaffe8afa435625506`; GitHub UW2 Web Fidelity Static Gate run `41215806444`의 `synthetic-static` **SUCCESS** (syntax+원본 파일 없는 전체 synthetic gate, `tests/vga-mode12-planar-witness.test.mjs`의 일부 영역·미관측 바이트 거부·두 바이트 경계·반환 복사 검증 PASS).
- 이는 원본 `OPEN.EXE`의 CPU 기록에서 추출 가능한 화면 일부를 JS 그래픽 디코딩 결과와 이후 비교하기 위한 **증거 API**일 뿐, VGA BIOS 초기 메모리·원본 DOS/PIT/OPL·16색 팔레트·완전 오프닝 프레임·브라우저 재생 동등성을 증명하지 않는다. 원본 게임이 제공하지 않은 픽셀/장면을 생성하지 않는다. 후속: 원본 한국어판 VGA 포트·모드·화면 캡처 시각/주소를 외부에서 검증한 뒤 원본 OPEN 쓰기와 JS OPGRAPH 지역 좌표를 대조하고, 실제 DOS 기준 MZ MAIN 진입 검증으로 이어간다.

### VGA Mode12 원본 CPU plane read 경계 (2026-11-01 KST)
- 새 8086 동기 memory-read provider는 **명시적으로 opt-in**한 장치 aperture의 uint8 반환만 받으며 일반 RAM 읽기는 기존과 동일하다. Promise·임의 반환값·중복 provider는 거부한다.
- 새 `web/vga-mode12-read-adapter.js`와 기존 VGA witness의 `readSelectedPlaneByte`는 **실제 GC04 선택 plane / GC05 read-mode-0 / GC06 A000h aperture** 레지스터가 관측되고 해당 plane byte가 원본 CPU 쓰기로 입증된 경우만 게스트 A0000h 읽기를 처리한다. 미확인/미가시 VRAM, read-mode-1/latch compare는 추측하지 않고 중단한다.
- 외부 원본 DOS·OPEN.EXE에서 해당 읽기 분기가 실제 호출되는지, VGA RAM 초기 상태·전체 화면·브라우저 표시가 동일한지는 **UNTESTED**. 이번 합성 CPU+VGA 장치 회귀만 GitHub 정적 게이트 대상이다. 원본 8086 CPU가 실제로 읽는 순서가 증명되면 추적 가능한 게스트의 같은 메모리에 선택적으로 장착하며, 검증 전에 기본 웹 게임 자산/화면을 바꾸지 않는다.

- 화면 모드 세대 격리: `invalidateAfterBiosModeSet({mode})`는 외부 BIOS INT10 AH00 장치가 **모드 설정을 실제 수락했을 때만** 이전 4개 plane 유효성·GC/SEQ 레지스터 증거를 제거한다. 8086 MOV A000h 쓰기→동일 주소 CPU 읽기에서 VGA write-mode-2 CPU AL=05h와 GC04 plane-read FFh/00h의 차이, BIOS 모드 재설정 후 stale 픽셀 거부를 합성 회귀로 고정했다. 원본 DOS 실제 BIOS 상태 및 게임화면 비교는 아직 미확인이다.

### 원본 OPEN CPU 실행 경계와 DOS JFT 이벤트 PSP 누락 교정 (2026-11-01 KST)
- **실행 환경 정정:** N100 원본 KOEI/FMDRV/OPEN 합성 DOS 시험의 66,295명령 위치 `original OPEN file event crossed a foreign PSP` 중단은 N100에 남아 있던 오래된 `web/dos-int21.js`가 `getFileProcessPsp` 옵션을 전달하지 않았기 때문으로 확인했다. 이는 GitHub 최신 소스의 동일 결함 증거가 아니다. 해당 보조 환경 파일을 최신 GitHub 코드로 맞춘 후 **원본 OPEN 260,000명령 한도까지** 실행했고 PSP 중단은 없어졌다. 260,000은 **STEP_BUDGET_EXHAUSTED**일 뿐 OPEN 완료가 아니다. 합성 IRQ 128명령 간격, 합성 PSP/IVT 등은 실제 DOS 참조가 아니다.
- **독립적인 실제 GitHub 소스 결함:** `web/dos-readonly-files.js`의 AH45 DUP 및 AH46 FORCEDUP 파일 이벤트는 같은 코드의 open/read/seek/close와 달리 `emitFileEvent` 경로를 우회하여 **scoped PSP 필드를 빼먹고 있었다**. 이를 `emitFileEvent`로 교정하고 `dos-file-duplication.test.mjs`에서 부모 PSP 0200h 및 자식 PSP 0240h의 duplicate/force-duplicate 소유자 정보를 검증했다. N100의 66,295 지점 오류와는 **원인이 다른 결함**이며 두 결과를 동일 성과로 주장하지 않는다.
- N100 opt-in `vga-read-mode0` 원본 바이트+합성 DOS 시험에서 초기 260,000명령 구간 내 **검증된 A000h plane read=0건**. 이어 동일 SHA 소스 및 동일 합성 장치 설정의 **1,000,000명령** 연장 진단에서도 OPEN이 미구현 명령 예외 없이 설정된 명령 예산까지 실행되었으나 정상 종료하지 않았고, A000h plane CPU 읽기 0건, native VGA mode2 관측 쓰기 76,800건(가시 바이트 유효성 38,400/38,400), OPGRAPH 파트0 원본 CPU 해제 버퍼 일치 접두사 6,378/52,748바이트만 확인했다. 전체 파트 해제·정상 오프닝·DOS 실기 대조로 승격할 수 없다. 미관측이 GPU 읽기가 전혀 없음을 뜻하지 않으며, 원본 DOS VGA·브라우저 픽셀/음악/완성 화면/게임 동등성은 **UNTESTED/HOLD**.

### H. VGA native planar memory + indexed register readback (2026-11-01 KST)

- 8086 A0000h–AFFFFh의 물리 VRAM 네 평면을 **전체 64KiB/plane**으로 확장하고 보이는 Mode12 640×480 화면의 처음 38,400바이트만 별도 coverage로 계산한다. 보이지 않는 여분 VRAM의 CPU 쓰기·선택 plane 읽기 증거는 보존하되 화면 픽셀을 임의 생성하지 않는다.
- GC05 bit3 read-mode1 비교는 GC02 Color Compare/GC07 Color Don't Care의 **관측된** 값과 이미 확인된 plane byte만으로 수행한다. 원본 CPU 읽기마다 실제 plane read latch를 갱신한다. write mode0/2의 Rotate/Set-Reset/ROP/Bit Mask 및 write mode1 latch copy는 필요한 latch가 증명된 경우만 허용하고 실패 시 전체 쓰기 거부로 상태를 보존한다. 16비트 DOS 원본 트레이스 동등성이나 BIOS 초기 VRAM 상태는 주장하지 않는다.
- VGA GC/Sequencer 8-bit indexed `IN`은 명시적 옵트인에서 **동일 CPU가 사전에 OUT으로 기록한 단순 레지스터 값만** 반환한다. 미기록 selector/register, CRTC read, VGA 초기값, 숨겨진 HW side-effect는 거부한다. 읽기 횟수 예산과 원본 프로그램의 실제 IN 분기는 이후 별도 대조한다.
- 검증: `tests/vga-mode12-latch-readmode1.test.mjs`, `tests/vga-indexed-readback.test.mjs`, 기존 planar/read adapter 합성 회귀 및 UW2 GitHub Actions. **실 DOS 부팅/OPEN 정상 종료/MAIN 진입/브라우저 원작 픽셀·음악 동등성: UNTESTED/HOLD**.

- VGA GC06 주소 선택(128KiB A000–BFFF, 64KiB A000–AFFF, B000/B800 text apertures)의 디코딩 경계 추가: 알려진 매핑에서 미구현 B000/B800 접근을 일반 게스트 RAM인 것처럼 반환하지 않고 읽기/쓰기 witness에서 fail-closed한다. A000-only 선택 후 B000 접근은 VRAM이라고 주장하지 않으며 일반 메모리와 구별한다. 원본 참조 실행/물리 VGA 동등성은 계속 HOLD.

- VGA DAC 레지스터가 원본에서 먼저 OUT으로 완전하게 관측된 경우에만 옵트인 3C7h read-index/3C9h RGB read stream을 제공한다. 팔레트 read 인덱스 선택·3바이트 순서·255→0 wrap·부분 덮어쓰기 무효화·read budget을 테스트한다. 6bit 범위를 초과하는 원시 OUT 데이터는 임의 클리핑/정규화하지 않고 IN을 거부한다. 리얼 VGA 초기 팔레트 및 실제 OPEN 호환성은 **UNTESTED**.

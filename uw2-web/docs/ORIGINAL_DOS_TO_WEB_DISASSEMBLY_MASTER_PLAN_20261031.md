# 대항해시대 II 한국어 DOS 원본 → 웹 완전동작 포팅 마스터 계획
- 수립: 2026-10-31 KST; 최신 개정: 2026-11-01 KST (독립 JavaScript/WASM 웹게임 전용 경로 고정)
- 기준: `thp32tt/ai-dev-lab@uw2-web-port`; 실제 한국어판 DOS 설치 파일만 정본. REA/Ghidra 분석은 참고 출력이며 **실행 파일의 실제 바이트, DOS 참조 실행 결과**로 재확인한다.
- 목표: **원본과 동일한 게임**을 브라우저에서 실행.

## 2026-11-02 실제 항해 20분 틱의 선단·시간·은행 원자성

- 브라우저 `app.js` 실제 수동/자동 항해 경로는 이전에 해상 위치·시계를 먼저 변경한 뒤, 잘못된 선단의 일일 보급 차감 실패를 무시할 수 있었다. 이번 구현은 `web/native-sea-voyage-step.js`에서 원본 한국어 세이브형 20분 시계·자정·선박 u16 보급 상태·은행 잔액을 검증하고 복제한 선단/SeaRuntime에서 먼저 항해를 수행한다. 자정에는 모든 선박의 물·식량 소모, 주점 1일 고용 플래그, 월말 이자를 연속 적용하며 **전체 성공 후** 게임 세션과 해상 상태를 동시에 교체한다.
- `web/native-sea-auto.js`가 해상 틱 거부를 상위 자동항해 타이머로 전파하여 무효 상태의 자동 반복을 차단한다. `tests/native-sea-voyage-integrity.test.mjs` 및 기존 자동항해·일일 주점 회귀 테스트를 실제 웹게임 호출점에 연결했다. 원작의 미확정 장기항해·선박 기아·역사적 오버플로를 새로 재구성했다고 주장하지 않으며, 원본 한국어 DOS와 실제 Firefox 게임플레이 차등 검증은 **RUNTIME_VALIDATION=UNTESTED**.

## 2026-11-02 원본 해도 기반 항구 출항의 원자적 전환

- 실제 사용자 키 입력 `app.js`의 출항 확인은 과거에 `advanceSelectedDateTicks`와 `consumeDepartureDay`로 돈·식량·날짜를 먼저 변경한 뒤 `findNearestSea`가 실패할 수 있었다. 현재 `web/native-harbor-departure.js`는 원본 해도 `findNearestSea`·선박 출항 준비·20분 방문시간·유효한 시계/은행 상태를 먼저 확인하고 원본 세션을 메모리에서 복제한 다음 날짜·주점 일일플래그·월간 은행이자·전 선단 물/식량 소모를 **복제본에서** 적용한다. 원본 2×2 해상 발판과 SeaRuntime을 생성한 경우에만 `selected`/`seaRuntime`/장면을 한 번에 바꾼다. 출항 지형·상태·시간 오류는 비용/선단/화면 상태를 보존한 채 보류한다.
- `tests/native-harbor-departure.test.mjs`로 실제 플레이 경로 결선, 월말·연말 정상 출항, 2~4 틱, 이자, 함선 2척, 해상 위치 없음, 손상된 선단, 시계/은행/항구 좌표, 원본 상태 불변을 원본 자산 없는 CI에서 검증한다. 기존 공급량 차감 방식·출항 통행 규칙은 변경하지 않으며 원본 DOS 출항 로직과 바이트 동등성 및 사용자 Firefox 실기는 **RUNTIME_VALIDATION=UNTESTED**.

## 2026-11-02 항구 숙박·방문 날짜 진행 원자성

- 실제 브라우저 항구 방문·숙박에서 호출하는 `web/buildings.js`의 `advanceDateTicks`/`lodgeCheckIn`은 기존 20분 틱과 2월 28일/월말/연말 전환을 유지하면서 원본 저장 시계형 필드와 요청 틱 유효성을 사전 확인한다. 안전한 1년 이하 틱 예산, 9999년 상한 및 날짜 전체 원자적 커밋으로 잘못된 요청의 부분 날짜 변경·무한 루프·복구 불가능한 날짜 상태를 거부한다.
- `tests/native-calendar-integrity.test.mjs`를 원본 자산 없는 shipping CI에 연결했다. 원작의 윤년 규칙·원본 DOS 날짜 진행 세부의 차등검증을 의미하지 않으며, Firefox 게임 실기 및 한국어 DOS 참조는 **RUNTIME_VALIDATION=UNTESTED**.

## 2026-11-02 브라우저 네이티브 주점 거래 경계 복구

- 브라우저 실제 `web/app.js`의 선원 고용·해고/한턱내기 호출이 사용 중인 `web/pub.js`에서 비정상 소지금(정수 0..600,000,000G 이외), 선박별 u16 선원·최대인원, 선단 합계·함선 수 불일치, 주점 원본 u16 경제력/u8 음료·rank·dayFlags, 부정확한 구매 수량을 변경 전에 거부한다. 전체 선단 선원 레코드를 먼저 검사해 일부만 변경되는 것을 차단하며 정상 주점 가격·열의·당일 1회 채용·해고 로직은 유지한다.
- 외부 원작 파일 없이 실행되는 실제 shipping 호출점 테스트 `tests/native-pub-transaction-integrity.test.mjs`를 GitHub UW2 Fidelity gate에 추가했다. 이 작업은 **웹게임 상태 안전성 개선**으로, 한국어 원본 DOS 주점 계산과의 바이트 단위 일치를 검증한 것은 아니다. 원본 DOS 차등검증과 Firefox 실기 검증은 **RUNTIME_VALIDATION=UNTESTED**.

## 최상위 실행 방침 — 독립 웹게임 네이티브 포팅 (2026-11-01 09:21 KST 사용자 확정)

**최종 제품은 브라우저에서 DOS/8086을 실행하는 에뮬레이터가 아니다.** 원본 한국어판 대항해시대 II의 *게임 규칙·상태·화면·입출력·음악·시나리오*를 증거 기반으로 재구성한 **JavaScript/TypeScript 또는 컴파일된 WASM 게임 로직 + 브라우저 Canvas/WebGL/Web Audio/웹 입력·저장 API** 기반 **독립 웹게임**이다. 저작권 있는 원본 에셋은 사용자가 소유한 파일을 검증해 런타임에서 직접 디코딩하며 공개 저장소에 넣지 않는다.

- **배포 실행경로 고정:** `web/index.html → web/app.js` 및 화면·UI·상태·파일·오디오 모듈은 원본 실행 파일의 8086 명령 디코더, DOS INT 21h/BIOS, FMDRV TSR, 가상 DOS 머신, 에뮬레이터 폴백 또는 DOSBox를 불러서 게임을 진행해서는 안 된다. 구분할 수 있도록 정적 *shipping import graph* 정책 검사로 차단한다. 실제 브라우저 게임 루프와 JavaScript/WASM 게임 모듈을 우선 개발한다.
- **역어셈블리·CPU·DOS 도구의 지위:** REA/Ghidra, 8086·DOS·OPL·VGA·PIC·PIT 실행 도구와 KOEI→FMDRV→OPEN 원본 트레이스는 **개발 전용 원본 의미 조사 및 차등검증 oracle**이다. 별도 `tools/`·`tests/` 아래에서만 활용하며, 웹 배포 번들에 포함하거나 이를 게임 진행 성과로 대체하지 않는다. 이전 계획의 '하이브리드 8086 실행 폴백'은 **개발/차등검증용으로만 허용**, 최종 제품 코드에 포함하지 않는 것으로 명시 수정한다.
- **개발 우선순위:** (1) 한국어 정본 해시/함수·상태·리소스 증거 (2) 근거 있는 규칙·자원 해석을 네이티브 JS/WASM으로 구현 (3) 본래 GRAPH/LS11·16색 팔레트 픽셀을 직접 Canvas/WebGL에 출력 (4) 원작 입력·UI·오디오/세이브를 브라우저 네이티브로 결선 (5) 동일 입력·자산에서 원본 DOS 결과와 픽셀·상태·오디오·세이브 차등 비교 (6) 여섯 주인공 전체 게임/엔딩 검증. 원본 의미가 확인되지 않은 함수는 미구현으로 남긴다.
- **성과 판정:** 원본 8086 명령 수, DOS 실행 단계, 합성 DOS 트레이스, CI 통과만으로 웹게임 기능 완료/포팅률 상승을 주장하지 않는다. **실제 웹 진입점에서 호출되는 네이티브 게임 코드와 그 동작·검증 범위**를 별도로 보고한다. 실제 브라우저 사용자 플레이와 원본 DOS 차등검증은 서로 독립된 완료 게이트다.
- **기존 앱 정리:** `web/app.js`는 이미 Canvas·JS 리소스 디코딩·UI/항해/시장 등의 네이티브 껍질을 갖지만 원작과 미검증 근사 로직이 있다. 원본 근거 없이 바꾸거나 '완전 포팅'이라 선언하지 않는다. 게이트 없는 임의 콘텐츠·추정 장면/음악을 추가하지 않고, 네이티브 경로의 증거 확인·모듈 분리·정합성 복구를 계속한다.
- **이번 세션 실행:** 우선 웹 배포 의존성에서 8086/DOS 실행기 유입을 CI에서 차단하고, 원본 GRAPH indexed 픽셀→브라우저 네이티브 Canvas 렌더러를 실제 화면 경로로 통합하며 테스트/근거/마스터 계획을 함께 갱신한다. 가상 DOS의 다음 INT21 핸들러 확장은 이번 최우선 개발 대상이 아니다.

 개조판·편의기능 추가·대사 재작성·현대식 밸런스 조정·새 인터페이스·임의의 음악/장면/동작 생성 **금지**.
- 진행 상태 (2026-10-31 KST): **P0 원본 61개 해시 검증 PASS; P1 MAIN/OPEN 원본↔Ghidra 주소·BSS 검증 PASS, MZ 4개 실행 파일 재배치 5,296건 전수 검사 PASS, 정적 far 제어 이전 후보 5,038건/351개 타깃 그룹 추출 PASS, KOEI.COM 조건부 DOS EXEC 기동 경로 실물 검사 PASS.** P1 전체 함수·간접/near 호출·동적 상태 분석 미완료. P3 CPU/BIOS/DOS 일부 구현 및 원본 KOEI.COM 기본 26명령 부분 실행, 명시적 합성 DOS 환경에서 4분기 최대 190명령 실행/INT66h 중단 확인까지 진행했으나 실제 초기 DOS IVT·PSP·VGA/PIT/OPL 하드웨어 참조 스냅샷 미확보로 실제 DOS/게임 부팅은 HOLD; 합성 DOS 조건에서 KOEI→원본 FMDRV 30,644명령 TSR, 원본 OPEN MZ 재배치23/VGA/DAC/타이머 ISR, OPEN 260,000명령 한도에서 실제 OPGRAPH.LZW 256바이트 DOS 원본 읽기·게스트 RAM 대조 PASS; 원본 OPGRAPH SHA 검증→14개 LS11/108개 GRAPH·3,235,136개 픽셀 인덱스 JS 디코딩 검증 및 브라우저 에셋 게이트 적용, 원본 OPEN native VGA Mode12/Write Mode2 초기화 및 관측된 Write Mode0 개별 plane 출력 11,648바이트 PASS, 시험용 IVT stub가 원본 OPEN 이미지를 덮어쓴 충돌 수정 및 12개 적재영역 검증 PASS; 원본 OPEN 기계어 LS11 해제 결과와 JS 디코더 OPGRAPH 0·13번 파트 총 116,785바이트 전체 일치, 13M 명령 중 원본 OPGRAPH DOS RAM 읽기 91,494바이트 PASS(실 DOS 참조·완성 화면/음악·OPEN 정상 종료 미검증); P2 실제 기준 트레이스와 P4~P9 전체 원작 동등성은 미완료. 근거: `ORIGINAL_P0_P1_EXECUTION_20261031.md`, `ORIGINAL_P1_RELOCATION_LAUNCHER_20261031.md`, `p1-far-transfer-candidates-20261031.json`. **제어 이전 후보 수는 포팅 완료율/검증된 함수 수가 아님.**

## 2026-11-01 20:02~20:08 원본 해도 130항구 출항 직후 기항 불능 수리

- **정본 독립 웹게임 원칙 고정:** 배포 경로 `web/index.html → web/app.js → web/world-map.js`의 실제 Port Call에서 작동하는 JavaScript Canvas 게임 로직 수정이다. 원본 DOS 8086 실행기는 웹 배포에 추가하지 않았다. 원본 KOUKAI2/WORLDMAP/DATA1 세 파일은 사용자 소유 N100 내부의 읽기 전용 원본 검증 입력으로만 사용했다.
- **실제 네이티브 항구 접근 버그 (+1 독립 성과):** `web/world-map.js`의 `findNearestSea`는 원본 130개 항구의 실제 좌표 및 해양 충돌 데이터에서 첫 통행 가능 2×2 선박 발판을 고른다. 기존 `findPortCallTarget`은 [-1..2]×[-1..2]의 12칸 표적만 인정해, 원본 해도에서 **130개 중 59개(세빌리아·런던·다수 보급항 포함)의 첫 출항 발판이 원래 항구로 즉시 재기항할 수 없는 상태**였다. 실제 owner Korean `KOUKAI2.DAT` 130개 source port positions, `WORLDMAP.LZW`, `DATA1.LZW`의 SHA256 검증을 수행해 이 59개가 모두 x/y 오프셋 -2의 두 칩 이내 해상 발판임을 확인했다. 기존 원본 근거 4×4 링을 **우선** 유지하고, 일치하는 항구가 없을 때에만 별도 **native-web bounded 2-chip recovery**를 적용한다. 후보가 다수이거나 2칩보다 멀거나 항구가 없으면 null/HOLD; 근거 없는 먼 항구를 선택하지 않는다. 해당 recovery는 해도와 first sea source geometry로 검증한 독립 웹게임 안전 개선이며 **원래 DOS Port Call 8086 판정 규칙을 확인했다고 주장하지 않는다.**
- **정확한 원본 130개 검증 및 GitHub Actions:** 원본 sea-first `findNearestSea`→`findPortCallTarget` 130개 모두 원래 source 항구 id로 귀환: **기존 링 71개 + 추가 native recovery 59개 = 130/130**, 다른 port ID 선택 **0건**, 먼 바다 no-port 및 모호한 후보 null. Source change `5dbd9a76eb1407f98e0faef1bd38777c1d098b2e`, synthetic overlap recovery unit fix `387c48618bea644b40e6be952e302f21ca20ad15` (+0), exact verified complete CI bearing SHA `2cb1f0e729a30946a4ca54c0f1ae2034b9e11683`, GitHub Actions run `41300653453` SUCCESS. `tests/native-port-call-recovery.test.mjs` synthetic CI and `tests/native-port-call-original.test.mjs` owner-only source data PASS. 원본 `KOUKAI2.DAT` SHA `ab81fcf9a38fa2bd8d3f7dc328287e80f0dcf74b92d3891e511c8fa230aa62e9`, `WORLDMAP.LZW` SHA `135e89cb1c894a8a70c67168898b816fab00a6a7d13a61f5965bacfaec6986fa`, `DATA1.LZW` SHA `b2c6f3430cb5b66c09bf77d7454b1346883f6c3eb62003848bf25ee0010907dc`.
- **남은 정확성 경계:** 130개 원본 해도발 출항 이후의 전체 항로 접근, 원본 DOS 제어흐름의 항구 도착 규칙 및 유효한 원본 DOS 해상 저장 포맷, 원본 VGA/오디오/6주인공 캠페인 검증 **HOLD/UNTESTED**. 원본 규칙·모호한 세계 위치를 임의로 제정하지 않고 웹게임 네이티브 접근성 규칙의 구분 및 차등 테스트를 계속한다.

## 2026-11-01 19:31~19:46 네이티브 항구 NPC 대사 원본 범위 및 브라우저 체크포인트 동시 실행 수리

- **정본 독립 웹게임 원칙 유지:** `web/index.html → web/app.js → web/town.js` 및 `web/native-*checkpoint.js`은 JavaScript/Canvas/WebCrypto 기반 브라우저 전용이다. 원본 DOS/8086 실행기를 shipping 경로에 넣지 않는다. 사용자 보유 원본 `KOUKAI2.DAT`, `MESSAGE.DAT`, `WORLDMAP.LZW` 등은 N100에서만 보조 원본 검증 입력으로 사용했고 GitHub에는 검증기 소스만 업로드했다.
- **① 실제 일반항 NPC의 원본 로어(Lore) 메시지 인덱스 경계 복구 (+1 독립 성과):** `web/town.js`의 NPC slot0 대화는 원본 `MESSAGE.DAT`의 일반항 0..99용 메시지 `0x282+portId`를 반환한다. 과거 구현은 동일한 `mapId=100`을 쓰는 한국어판 보급항 100..129에도 `0x282+100=742`를 반환했는데, 실제 원본 `MESSAGE.DAT`에서 #742는 보급항 안내문이 아닌 다른 대사다. 이제 `portCatalogId`(있다면) 또는 원본 일반항의 정확한 port ID가 0..99 범위인 경우에만 대사를 선택하고, 보급항용 근거가 없으면 `null`을 반환하여 `PortWalkingRuntime.move`가 잘못된 대화창을 열지 않고 `source-npc-dialogue-unverified`로 HOLD한다. 실제 파일 `KOUKAI2.DAT` SHA `ab81fcf9a38fa2bd8d3f7dc328287e80f0dcf74b92d3891e511c8fa230aa62e9`, `MESSAGE.DAT` SHA `7003f3224195b791ff226999bd55c01e5ee95398aaedfbf1fa8f2ac8edcb6a2d`를 검사해 원본 MESSAGE 1179개, 일반항 0..99의 실제 대사 레코드 100/100, 보급항 100..129 차단 30/30 PASS. 수정 소스 `ae245e346082671331ef6b26b1808bebf6864d69`, exact GitHub Actions `41298299735` SUCCESS, owner-only original verification `tests/native-town-message-original.test.mjs` SHA `7c06acf4df86b9ddcf46abe8968c81e3bcc25d8e`, exact Actions `41298448764` SUCCESS. 다른 NPC의 출현/보급항 전용 게임 대사 공식은 새로 만들어내지 않고 계속 미검증.
- **② 웹 Native 체크포인트 비동기 저장·불러오기 경쟁 경로 제거 (+1 독립 성과):** 실제 `app.js`에서 두 `uw2-controller-action`이 연달아 오면 `await crypto.subtle.digest` 중 Save/Load가 겹쳐 '새로 저장한 데이터'와 현재 모드 선택 포인터가 어긋날 수 있었다. 동일 origin에 대한 `checkpointInFlight` 단일 실행 게이트로 Save/Load를 동시 처리하지 않고 `finally`에서 무조건 해제, `web-controller.js`는 시작 직후 두 컨트롤을 비활성화하고 종료 후 원복한다. 단순 GUI 장식이 아니라 실제 항구와 항해 공통 비동기 게임 상태 일관성 수리. 소스 `50bb0ed4710fc211e7514dac618f65559636e8c1`, 순서/중복 요청 회귀 `tests/native-checkpoint-singleflight.test.mjs`, exact Actions `41298546960` SUCCESS.
- **실제 원본 Firefox end-to-end 추가 검사 (+0 동일 수정의 검증):** 개인 정본 데이터를 사용하는 Headless Firefox + WebDriver 실제 `web/index.html`에서 원본 OPEN 오프닝 완료 후 단치히 항구에서 Save와 Load를 같은 사용자 입력 턴에 요청해 `checkpointInFlight` `true→false` 단일 작업 전이 확인 PASS. 원본 파일 기반 단치히 항구(22,52)→한 칸 이동(23,52)→체크포인트 복원, 항구 출항 확인→해상 이동→브라우저 새로고침→해상 체크포인트 복원, **실제 해상에서 `p` 기항→원본 단치히 harbor door 좌표(22,52) 재진입** 후 체크포인트 작성 PASS. 원본 튀니스 세이브를 저장하고 단치히 세이브 선택 화면에서 다시 튀니스 portId5/좌표(16,89) 복원, SAVE 이동 버튼의 실제 플레이 차단도 PASS. 사용자 보유 원본 파일은 repo에 포함하지 않는다. 재현용 Firefox 검증기 `uw2-web/tests/native-browser-checkpoint-firefox.py` 소스 `5dcf1d963f313657c6782f204418b170d7584e99`, exact GitHub Actions `41298763945` SUCCESS (CI: 무원본 synthetic tests와 Python syntax; 사용자의 실제 N100 원본 Firefox 검사는 별도 PASS).
- **지속 우선순위:** 원본 항해/항구/교역/스토리 실제 계산과 NPC 보행 RNG를 원본 트레이스와 대조해 네이티브 웹게임에 구현. 보급항 전용 NPC 메시지/원작 DOS 저장 바이너리 재작성/`port=FF` 좌표/정확한 DOS VGA·음악/전체 6명 엔딩 등은 `HOLD/UNTESTED`. 동일 기능의 테스트·CI·문서·재보고는 점수 +0.

## 2026-11-01 19:01~19:20 실제 게임 진행 경로 수리와 오리지널 Firefox 반복 실기

- **별도 source-backed 기능 수리 1 — 서로 다른 보급항 NPC 누출 방지:** `web/native-port-arrival.js`의 `sameSavedPort=previous.port===port.mapId`는 **한국어 원본 보급항 100~129 30곳 모두 동일 지도 `mapId=100`**이라는 사실을 무시했다. 기존 실행에서는 보급항 A의 NPC 좌표 8개가 보급항 B에서 재사용될 수 있었다. 이제 `portCatalogId`가 실제로 일치할 때만 NPC를 유지한다. 원본 일반항 0~99는 `id===mapId`가 자명하므로 기존 정본 저장 데이터의 NPC는 유지한다. 원본이 보급항 지도 번호 100만 제공하고 항구 고유 ID를 제공하지 않을 때는 다른 항구로 추정하지 않고 NPC 위치를 비운다. 다른 장소 캐릭터를 생성하거나 원래 NPC 동작을 재구성했다고 주장하지 않는다. 소스 `683a8cdf8c09e8d363b04a0001ac249fe8ade739`; synthetic tests same/current/other supply cases 및 exact CI `41295979604` SUCCESS. User-owned actual original `KOUKAI2.DAT`, `PORTMAP.LZW`, `PORTCHIP.LZW`, `CHIP_NO.DAT`, `ZA_DAT.DAT`로 전체 **130/130 항구** 및 서로 독립된 실제 보급항 100→101 NPC source-isolation PASS, owner-only `tests/native-port-arrival-original.test.mjs` `fd0fea670291929e70c6a549cd73064f7367851a`.
- **별도 실제 웹게임 조작 수리 2 — SAVE 슬롯 버튼의 진행 중 화면 덮어쓰기 방지:** `web/web-controller.js`의 `SAVE ◀/▶`는 실제 로드·시스템 메뉴가 아니더라도 숨겨진 save-slot `click()`을 유발하여 `drawPreview`로 게임 진행 화면을 교체했다. **`town` 또는 `sea` 상태에는 두 버튼을 disabled하고 runtime action을 이중 guard**하며, `system-menu`, `load-select`, `load-confirm`, `load-empty`, `preview` 등 실제 저장 슬롯 선택 화면에서는 기존 기능을 허용한다. 소스 `1b6a31b01c19778af2e98add466fbb8c250d70e2`; 최종 CI `41296825370` SUCCESS. 원본 파일을 읽은 실제 headless Firefox 게임 화면에서 `SAVE ▶` 클릭 시 `town` 화면과 단치히 원본 포트 ID 39가 그대로 남는 것을 확인했다.
- **원본 Firefox 실제 브라우저 반복 검증 (+0 동일 기능 검증):** N100의 사용자 보유 원본 파일만 로컬 HTTP 테스트 서빙, Firefox/geckodriver 실제 DOM/UI로 원본 OPEN 오프닝 완료→단치히 세이브2 로드→항구 web checkpoint→게임 내 좌표 (22,52)→(23,52)→새로고침→원본 슬롯 복원 (22,52), 출항 확인→바다 SeaRuntime→체크포인트→페이지 전체 새로고침→항해 x/y/heading/steps/ticks/accX/accY 복원을 수행해 PASS. 이어 다시 페이지 새로고침하여 **원본 튀니스 save1** (portId 5, mapX16) 선택→체크포인트 작성→원본 단치히 save2로 화면 선택 변경→체크포인트 복원 시 **튀니스 portId 5,mapX16** 복귀 PASS; 별도 저장 슬롯의 원본 항구 디렉터리를 재선택하는 경로도 검증했다. 자동화 소스는 원본 게임 파일 없이 `tests/native-browser-checkpoint-firefox.py`에 버전 관리, SHA `986f78f90b9915df9301c06f368503b2053ea2d3`, CI 문법·synthetic suite `41296825370` SUCCESS, 실제 private Firefox N100 검사 PASS. 진짜 웹게임 작동 증거이나 원본 DOS CPU/VGA/FMDRV 프레임·원작 save write 및 전체 6명 플레이 완료 근거는 아니다.
- **다음 핵심 기능:** 원본 소스에서 확인되는 NPC 인접 대화·건물 진입 상태/항해→기항 흐름의 차등 참조 검증, 원래 DOS와 일치하는 경제·선원·스토리 상태를 실제 네이티브 JS로 확장한다. UI 테스트 수리·재검증·문서에는 중복 점수 부여 금지. 가짜 DOS 게스트/가상 8086 CPU를 웹 배포로 되돌리지 않는다.

## 2026-11-01 18:31~18:55 브라우저 네이티브 임시저장·이어하기 구현 및 실제 Firefox 원본 실기 검증

**최상위 목적 고정:** 최종 프로그램은 `web/index.html`에서 직접 동작하는 JavaScript/WASM 웹게임이다. 이 구현은 **웹게임 자체의 진행 상태를 브라우저 저장소에 보존**하는 것이지, DOS/8086 게스트 실행이나 원본 `KOUKAI2.DAT`의 `Save Data` 포맷 재현이 아니다. 브라우저 체크포인트는 원본 DOS 저장 메뉴와 명시적으로 별개의 보조 기능이다. 원본 게임 파일은 사용자 소유 N100 환경 밖으로 배포하거나 GitHub에 업로드하지 않는다.

- **① 항구 웹게임 상태의 실제 브라우저 체크포인트 (+1 독립 성과):** `web/native-town-checkpoint.js`와 `web/app.js` 실제 `uw2-controller-action`, `index.html`의 `웹 임시저장 / 웹 이어하기` 버튼을 연결한다. Idle town만 허용(건물/대화 중 HOLD). 사용자 보유 한국어 원본 `KOUKAI2.DAT` SHA256 `ab81fcf9a38fa2bd8d3f7dc328287e80f0dcf74b92d3891e511c8fa230aa62e9`와 슬롯 identity/raw pointer, 포트 카탈로그, 현금, 선단, 게임 시계, 타일 통행 가능 위치, 24×24 town view/player 좌표, NPC 상태/방향/애니메이션/대화 카운터를 검증. 동일 JSON payload의 WebCrypto SHA-256 integrity marker와 256KiB 최대 크기, `localStorage` 단일 atomic item 기록을 사용한다. SHA는 실수로 깨진 로컬 데이터를 감지하기 위한 체크섬이며 사용자 브라우저의 고의 조작을 막는 인증이 아니다. Restore는 완전한 preflight 후 새 `PortWalkingRuntime`을 구성하고 **성공 후에만** 현재 웹게임 상태를 교체한다. 다른 슬롯 화면에서 이전 슬롯을 복원할 때 원본 저장 페이지별 port table을 재조회해 포트 이름·맵 데이터 교차 오염을 차단. `a61ec222a7a04454f4ec78f3ceae0d064431df48` Actions `41293786072` SUCCESS, source page repair `d8cc89e7398a0484720d2e3b2c8d7ca1388eae30` Actions `41294072141` SUCCESS. 명시적 UI 성공/실패 메시지 `4b8678f7f0ab255a5059bb8efa2003bb7a5d6983` Actions `41294233365` SUCCESS. 사용자 보유 실제 단치히 세이브 초기 (22,52)→ 웹게임 보행 (23,52) 및 원본 (22,52) 재복원/원본 파일 불변 검증 PASS; `9b9243cbfac01764e146429a18b9690a7211d41b` Actions `41293978376` SUCCESS. 원본 튀니스·단치히 2개 활성 세이브 초기 소스 상태 복원도 N100 원본 전용 검사 PASS.
- **② 항해 웹게임의 독립 네이티브 이동 상태 체크포인트 (+1 독립 성과):** `web/native-sea-checkpoint.js`는 브라우저 `SeaRuntime`의 실제 `x/y`, 8방향 heading, 이동 steps, 진행 ticks, 60단위 subchip `accX/accY`, 현재 게임 날짜/시각/월·함대 식별자까지 보존한다. 검증된 원본 `WORLDMAP.LZW` 기반 `canFleetStand`, 원본 선박 노/범선 분류, 원본 세이브 SHA·슬롯/출발항 port table과 클록 정합성을 확인한다. Restoration은 `SeaRuntime`을 JS/WASM 기반 원래 native runtime으로 새로 생성하고 `WINDCUR.DAT`로 환경·속도 재계산을 수행하며, DOS 해상 세이브 좌표·INT21 CPU·바이너리 원본 저장 호출은 전혀 사용하지 않는다. `웹 임시저장 / 웹 이어하기`는 항구/해상 최신 기록 모드 포인터를 구분한다. 소스 `3ea9f4fc3f7dc1ba15977e83bcae48e12235788d`; 기존 town UI 문자열 회귀 테스트의 같은 패키지 수리 `6beb3127f02dcd44c5c191a0718b45f7b182eed2`, GitHub Actions `41294586305` SUCCESS. N100 실제 한국어 원본 data: 단치히 출발 `(286,238)`에서 7틱 후 실제 native `(287,238)`, heading 1, steps 1, accX=24, accY=24, ticks=7 값을 저장/복원하여 모두 일치 PASS. 비공개 `tests/native-sea-checkpoint-original.test.mjs` 소스 `2819850e24f9834167950285f9e8c751f18159de`, Actions `41294686669` SUCCESS.
- **③ 실제 Firefox 통합 실기 검증 (위 두 기능의 독립 검사이므로 점수 +0):** user-owned Korean resources, local-only HTTP asset server, headless Firefox/geckodriver로 `web/index.html`을 직접 로드하고 원본 OPEN.EXE 오프닝 완료 후 시스템 메뉴 → 단치히 세이브 2번 → 실제 town render/input 이동 → 브라우저 UI 버튼 클릭 `웹 항구 임시저장` → 좌표 이동 → `웹 이어하기`하여 **(22,52) 복원** 확인. 진짜 항구 건물/출항 확인 YES 버튼 경로로 sea mode 진입 → 원본 해상 데이터 렌더링·방향/틱 변경 → 브라우저 UI 버튼 `웹 항해 임시저장` → 추가 틱 → `웹 이어하기` 시 항해 모드/heading/steps/accX/accY/ticks 값 복원. 실제 검증 샘플에서 sea saved/restored x=286, ticks=1 및 UI 성공 문자열 확인. 이 테스트를 재실행할 수 있도록 원본 파일 제외한 **`tests/native-browser-checkpoint-firefox.py`** 소스만 GitHub에 저장, CI는 외부 원본 없이 `py_compile` 문법 검사. 마지막 material/validation-bearing SHA `abdaabc5dae4ee01bc0bde4f023f65e0c9d37c0f`, exact GitHub Actions `41295147644` SUCCESS, 별도 사용자 보유 원본 실제 Firefox 검사 PASS. **이는 진짜 브라우저 UI/원본 리소스 기반 웹게임 작동 증거이나, 원작 DOS 비교 프레임·타이밍·원작 저장 호환/6 주인공 종주 검증은 아니다.**
- **검증 경계 및 우선순위:** 원본 DOS `Save Data` 바이너리 write roundtrip, 해상 저장 `port=FF` 좌표 offset, 그 외 구간의 전체 웹게임 플레이/시나리오/전투/정확한 FMDRV·VGA 출력은 **UNTESTED/HOLD**. 다음 우선순위는 원본 역어셈블리/상태 전이의 증거를 통해 실제 게임 시뮬레이션을 더 정확히 포팅하고, 브라우저 native scene/시나리오·전투·경제·일정의 입력별 원본 결과 차등 검증을 확장하는 것이다. DOS 인터프리터를 배포 브라우저 런타임에 재연결하는 것은 금지.

## 2026-11-01 18:00~18:21 독립 브라우저 게임 항구 복귀·상태·캐릭터 구현

- **목표/경계:** 독립 웹게임 `web/index.html → web/app.js`의 실제 state/render/load 실행 경로만 구현한다. DOS/8086/BIOS 시뮬레이터는 개발용 원본 비교에만 남기고 실제 게임 로직에는 사용하지 않는다. 근거 없는 해상 세이브 `port=FF`, 새 게임 초기화, 원작 DOS 저장 파일 write, 원래 게임 NPC 이동 RNG/이벤트/음악/타이밍 등은 계속 `HOLD/UNTESTED`.
- **① 130개 항구 원본 데이터 기반 네이티브 기항 (+1):** `web/native-port-arrival.js` 실제 `app.js` 기항 경로에 통합. 진입 대상 130개는 원본 KOUKAI2 port table `id=0..129`를 확인하며, 일반 항구는 원본 map ID 0..99, 보급항 30곳은 원본 공용 map 100을 사용한다. `ZA_DAT.DAT` harbor door #3의 실제 좌표 `(harbor.x,harbor.y+1)`와 원본 `CHIP_NO/PORTMAP/PORTCHIP` 통행 가능 지형을 모두 검사한다. 항구 viewY는 원본 단치히 세이브와 일치하는 **`harbor.y-13`**이며 player y 기준으로 재계산해 1칸 어긋나는 회귀를 CI에서 수정했다. 실제 원본 130/130 항구 진입 좌표/충돌 검증 PASS(100+30), 단치히 원본 saved viewport `(viewX,viewY,playerX,playerY,mapX,mapY)=(10,38,12,14,22,52)` 전체 일치. 다른 항구 NPC는 저장 데이터에 없으므로 임의 합성하지 않고 `OTHER_PORT_ACTORS_NOT_VERIFIED`로 표시한다. 소스 `2129207f9d55768cdaf4c55954570279ffd20a85`; 동일 기능 위치/fixture 수정 `9e9028835bcdb765e7bca11a174a4d203519a9ba`, `e0a2790a450e6438f6d0f0abe8566ad44bed4856` exact Actions `41291702550` SUCCESS. Owner-only SHA-pinned original tests `tests/native-port-arrival-original.test.mjs` PASS.
- **② 불러온 원본 세이브와 현재 웹게임 상태 분리 (+1):** `web/native-save-session.js`와 실제 슬롯 선택 `web/app.js`를 연결해 원래 KOUKAI2 파싱 상태에 직접 거래·보행 변경을 하지 않고 세션 복사본만 수정. `syncNativeTownSession`은 현재 `PortWalkingRuntime.snapshot`의 exact port, 24×24 view/player 좌표, 맵 위치 합, 원본 CHIP collision, 최대 8명 NPC 형식 등을 모든 필드 검증한 뒤에만 현재 웹 세션의 town position/actors를 원자적으로 교체하고 잘못된 프레임은 HOLD한다. `c3c986623cfabb8cb7623bae2fdaa60756c8a330` Actions `41291874067` SUCCESS. 실제 원본 단치히 세이브 (22,52)→ 웹 JavaScript 보행 한 번 (23,52) 세션 변동 및 원본 `KOUKAI2.DAT` SHA/원래 상태 불변 PASS; private test `tests/native-save-session-original.test.mjs` SHA `a5c057ec81553c8584381c391e6a2a03245a1bd2`, exact Actions `41292625441` SUCCESS. **브라우저 종료 후 영구 저장은 아직 구현되지 않았으며 DOS save roundtrip은 절대 주장하지 않는다.**
- **③ 브라우저 정본 저장 파일 SHA 고정 로딩 (+1):** `web/native-korean-save-source.js`의 WebCrypto SHA-256로 사용자 보유 `KOUKAI2.DAT` 기준 해시 `ab81fcf9a38fa2bd8d3f7dc328287e80f0dcf74b92d3891e511c8fa230aa62e9`·크기 `333551 bytes`를 정확히 확인 후 단 한 개의 복사본에서 원래 10개 슬롯·130개 항구 데이터를 파싱하고 읽기 전용 source object로 공개. 호출자 buffer를 async hash 중 변경하거나 타 소스/비정상 크기가 섞이면 fail closed. 실제 `loadSaves()` 경로 연결, synthetic buffer mutation+immutable source tests 및 user private actual save 2개 활성 슬롯/단치히 좌표 PASS. Source `35b7c09de3c6b158c8c2ce4ef26f339e525c8cf1`, Actions `41292138273` SUCCESS. **해시가 다른 합법적 사용자 세이브는 아직 source evidence가 없으므로 로딩 HOLD**; 새 포맷을 임의로 수용하지 않는다.
- **④ 원본 CHAR 화면 스프라이트 순수 Canvas 재사용 (+1):** 게임 내 `web/char.js`는 원래 주인공/NPC 한 명을 그릴 때마다 32×32 Canvas/ImageData를 새로 만들었다. 이제 사용자 원본 `CHAR.LZW` 6명×8프레임=48 hero +24 folk 프레임 각각의 JS RGBA byte source를 정확히 비교해 기존 Canvas surface를 재사용하고 픽셀이 바뀌면 전 4096 bytes 비교 후 정확히 다시 출력한다. 구분/방향/원본 프레임 인덱스는 변경하지 않음. Source `37a56e19aaefc02db5a91fd745710cc389915e11`, SHA 확인 테스트 설명 `8f7b22b8db77ca6f2032cd02ad95974b8bd94e94`, source-byte hash collision 방지 same-feature 개선 `5c87307dcebb4dc70e3c7ba5056e9b5c26e12d18`, exact CI `41292718437` SUCCESS. Owner-only genuine `CHAR.LZW` sha256 `f1d606475e653e87d5a3ddaf05523a1f59a1c70d16e5a4a3d6c6d513c6c4a537` 72 native RGBA frames/31 draw calls and only 2 Canvas allocations verified. **원작 실제 DOS 출력/애니메이션 타이밍 비교는 별도 미검증**.
- **다음 우선순위:** `port=FF` 해상 세이브의 실제 세계 좌표/방향 구조 원본 바이트·함수 추적, native session→브라우저 저장소의 충실한 전체 상태 직렬화 설계/검증, 원작 DOS 기준 2D town scene/캐릭터/메뉴 정확한 프레임 비교, 원본 전투/항구/항해/음악 상태까지 end-to-end 비교. 외부 오프라인 검증기가 필요하더라도 **브라우저 게임 루프에 DOS/8086 실행기를 다시 넣지 않는다.** 같은 기능의 regression/CI/문서/점수 readback 중복 점수 +0.

## 2026-11-01 17:30~17:49 독립 웹게임 실제 항해·항구 화면 구현

- **목표 고정:** 이 단계는 브라우저 `web/index.html → web/app.js`에서 직접 실행되는 **네이티브 JS+Canvas 게임**을 개선한다. 원본 DOS/8086 코드는 게임 실행 경로에 투입하지 않는다. 게임의 원작 픽셀·상태·사운드 검증을 혼동하지 않으며, 저작권 원본 데이터는 N100 개인 보관 환경에서 SHA만 검증한다.
- **웹 항해 실제 프레임 재생성 비용 및 잘못된 선박 그림 수정:** `web/world-map.js`의 실경로 `renderSeaView`는 기존에 23×23 세계 지형과 32×32 선박을 그릴 때 **매 호출마다 두 개의 Canvas와 ImageData를 생성**했다. 이제 original decoded world `assets` 단위/뷰 크기 단위의 scratch 표면을 재사용하되, **매 프레임 전체 16색 인덱스 픽셀과 투명도 값을 다시 그려** 이전 프레임 누수를 막는다. 잘못된 source 타일·팔레트 인덱스/선박 스프라이트를 검증 없이 검은 픽셀/상상한 대체 그래픽으로 표시하지 않는다. 선박 16프레임을 무조건 범선(8..15)으로 고르던 기존 버그는 실제 `KOUKAI2.DAT`에서 파싱한 선두 함선 `Ship3` 클래스 `oared`를 `SeaRuntime.snapshot().flagshipOared`에 전달해 **노선박(0..7)/범선(8..15)** 표시를 구분하도록 수정. 타입 메타데이터 누락/유효하지 않은 픽셀에서 부분 프레임이 표시되지 않도록 전체 프리플라이트 후 출력한다. 실제 DOS 실행 프레임 비교 전에는 원본 시각 동등성 미확정.
- **증거:** 최초 렌더러 소스 `fb86497dba07c957499835d8e073a70322ff4983` Actions `41289410876` SUCCESS, 스프라이트 클래스 `756f761c217473d7512362c10ea4446de2891b0d` 및 same-feature 수리 `86e14de2d76cc480e816af774b669c462b00d561`/완전 프레임 `b4bd60a1d62911a5e850e021d13cb060ce8ecf1a`, exact CI `41289611742` SUCCESS. unknown palette 색상 생성 방지 `c974d0785eb7b6949e8a96b1084da0ea351344fa`. N100 private pinned source `WORLDMAP.LZW`, `DATA1.LZW`, `WINDCUR.DAT`, `KOUKAI2.DAT` 4개에서 **368×368 = 135,424 original-source 화면 인덱스 픽셀**과 32×32 선박 실제 두 sprite bank에 대한 JavaScript RGBA 차등 판정 PASS; private test `tests/native-sea-view-original.test.mjs`, CI syntax gate `41289891477` SUCCESS. 합성 test `tests/native-sea-view-canvas.test.mjs`는 실제 shipping `renderSeaView`를 직접 호출.
- **웹 항구 화면:** `web/port-map.js`의 실제 `renderTownView` 24×24 원본 `PORTMAP/PORTCHIP` 16×16 픽셀 타일도 기존 매 동작 384×384 Canvas/ImageData 생성 경로에서 **단일 재사용 Canvas+ImageData**로 변경. 이동·scroll 때 픽셀 전체 재해석/재구성, 뷰 범위 외 남은 과거 픽셀은 삭제, original 타일 누락/색 인덱스 범위 위반은 즉시 거부. 실제 원본 `PORTCHIP.LZW`, `PORTMAP.LZW`, `CHIP_NO.DAT`, `KOUKAI2.DAT` SHA-pinned 검사에서 전체 101개 PORTMAP의 사용 중 타일 누락 0, 7 bank 타일 인덱스의 16색 범위 위반 0. 단치히 원본 세이브에서 **384×384 = 147,456 픽셀** browser native renderer 출력과 별도 original source indexed-palette expected RGBA 전체 일치 PASS, 스크롤 시 재생성 없이 화면 변경 PASS. 소스 `5995ced77422cae894469d0c407a4f3219609fee`, private test `tests/native-town-view-original.test.mjs` at `d9671cc46c630b0c92f4cb85ed2439c455821687`, GitHub Actions `41290389564` SUCCESS.
- **가짜 웹게임 실행 루프 제거:** 실제 브라우저 `app.js`는 원본 `MAIN.EXE` 분석 결과 없이 `ReaGameRuntime.tick`에서 임의 프레임 증가, 메뉴 인덱스 순환 및 선택된 message를 게임처럼 출력하는 화면을 실행하던 문제를 갖고 있었다. production `web/app.js`에서 이 스캐폴드 import, `renderRuntime` loop, fabricated game frame/pause action을 제거하고, `web/native-save-entry.js`에서 유효한 원본 KOUKAI2 save 항구 좌표/지도/선원 상태만 native `PortWalkingRuntime`에 연결한다. **`port=FF` 실제 해상 save의 정확한 월드 좌표·heading offset이 검증되지 않았으므로 `load-select` 원본 메뉴에 머물며 HOLD 사유를 표시**, 임의의 바다 좌표·게임 루프를 만들지 않는다. 합성 회귀 `tests/native-save-entry.test.mjs` (실제 shipping source 검사 포함) PASS, production source `e1128b00dc62bc648d0440974cb4fa2fa3f8f82d` Actions `41289772949` SUCCESS. 원래 `web/runtime.js`는 테스트/과거 참고용 파일로만 유지되고 실제 HTML import graph에서 호출되지 않는다.
- **추가 조사:** 사용자 소유 원본 `MENU.DAT` SHA `32042e809e09399c7a433517e2bf70980af40734f5ab1fc0a2ac632a1ccc9461`의 `menu[56]` 원문은 `Load Data / Start New Game / Environment / Quit Game / Save Data` (5개 옵션)로 확인. 실제 웹 Save Data 동작은 원본 게임 내부 save 포맷·체크섬·전체 게임 상태 직렬화와 UI 흐름이 확보되기 전 **HOLD**, 부분 갱신으로 원본 저장 파일을 훼손하거나 게임 저장 완료를 표시하지 않는다.
- **미해결 범위:** 검증된 것은 original decoder source→native Canvas RGBA 픽셀·스크롤·Sprite bank 선택 및 허위 게임 로직 제거. 원본 DOS 캡처 프레임/정확한 VGA palette, 포트-주인공 전체 게임 동작, 해상 save 좌표 디코딩, 원본 세이브 write-roundtrip, FMDRV/Web Audio source playback, 엔딩까지 6인 경로는 `UNTESTED/HOLD`. 새로운 독립 웹게임 기능을 우선하고 DOS CPU 에뮬레이터 확장을 게임 성과로 세지 않는다.

## 2026-11-01 독립 웹게임 실행경로 구현 검증 — 최신 GitHub SSOT

- **브라우저 제품 경로:** 실제 `web/index.html`의 두 module entry `./app.js`, `./web-controller.js`에서 재귀적으로 접근하는 **31개 JavaScript 모듈**의 import graph를 `tools/assert-native-web-entry.mjs`로 검사한다. 브라우저 배포 소스의 `realmode-8086.js`, DOS INT21/PSP/MZ, BIOS/VGA/PIC/PIT/OPL 실행기 및 guest 하위 모듈 연결을 금지한다. 동적 비리터럴 import와 소스 트리 밖 의존성을 차단한다. 시뮬레이터는 오프라인 `tools/` 및 `tests/`에서만 사용한다. 정적 검증은 전체 브라우저 런타임 행위의 증명은 아니며 네트워크 리소스·브라우저 UI·실기 입력 검증과 구분한다.
- **원본 실행 분기 순수 JS 변환:** `web/koei-exit-flow.js`의 한국어 KOEI.COM `OR AH,AH;JNZ`, `OR AL,AL;JZ` 3개 분기 처리를 8086 CPU 인터프리터 호출에서 순수 JavaScript `zero` 플래그 비교로 교체. 원본 입출력 byte 0~255의 **3×256=768개** 조합을 CI에만 존재하는 독립 원래 8086 코드 분기 실행 결과와 전수 비교하여 PASS. 이 기능은 실제 배포의 `Uw2BootGate`가 호출하는 native 분기 모델이며, 진짜 DOS 종료 상태나 게임 분기 성공을 생성하지는 않는다. 검증된 KOEI 원본 상태 기계의 일부 로직만 이식한 것이다. 구현 `0f75e1b7442e35dd2ced32618e504a8916766180`, 이후 설명 문구 정리 `3a4538440d2f7a9bf80bc69cb38c318926aa7174`.
- **원본 GRAPH 픽셀 → 실제 웹 Canvas:** `web/native-graph-canvas.js`를 도입하여 디코딩된 원본 4비트 색 인덱스를 16색 RGB 팔레트에 대응하고 명시적 transparent-index0 정책과 640×400 크기 제한을 적용하여 브라우저 `Canvas2D.putImageData`로 출력. `web/app.js`의 메인 UI GRAPH 및 `web/opening.js` 오프닝 소스 이미지의 기존 픽셀 출력 경로에서 실제 호출한다. 배포 진입점은 원본 8086 CPU 없이 JavaScript 소스 파싱·렌더링을 수행한다. 소스 `27ccd5b3aa30ed90752971345d6c36b0b25d67aa`, 정적 audit 오탐 및 기존 CPU 직접 import 제거 `640feb54db978eb9822584ee6f85a381925b3051`, `0f75e1b7442e35dd2ced32618e504a8916766180`.
- **원본 이미지 진본 검증 및 웹 전용 파일 접근:** 사용자 보유 한국어 `OPGRAPH.LZW` SHA-256 `f66bbd7417283c39ed425e14c3b09480a23edad55242b485851a0db85dbcbd1d`, 443,529 원본 파일 바이트, LS11 14파트·108 GRAPH 레코드·**3,235,136 원본 색 인덱스**를 전부 JavaScript RGBA 변환하는 N100 private original-byte 검증 PASS. 현재 raw source RGB→브라우저 RGBA가 파트/레코드별 동일 인덱스를 사용함을 확인했으며, **원작 DOS 실행 화면 프레임·VGA DAC 팔레트·프레임 배치·시간 정확성은 검증되지 않았다**. 별도 SHA-pinned `web/native-original-file.js`가 직접 WebCrypto를 이용해 사용자 원본 bytes를 검증·복사하도록 `web/opgraph-original-archive.js` 브라우저 경로를 변경해 가상 DOS 파일 리졸버 의존성까지 제거. `pinned-dos-resources.js`는 독립 DOS 비교용 테스트에서만 유지하고 브라우저 shipping import graph에서는 제외. 관련 SHA `5495c9fa6438682279d8c4d2871ddf083624efd0`, `a53945ef36b2a4f9ab74011cec936944f996b384`, 정확 SHA Actions `41257028269` SUCCESS. 오프닝 동일 원본 이미지 매 프레임 재생성을 피하는 record/palette/alpha별 Canvas 재사용 캐시 `33c15e5a5e6fd07cf19a804e9030ee2b61877598` 및 경계 검증 수정 `7e4bb4e0dd05d3361874258e7f7576e505833ec5` (+0 same feature), Actions `41257246368` SUCCESS.
- **오프닝 원본 팔레트 변경 시 캐시 일관성:** `web/opening.js`의 source image/palette/alpha 캐시는 원본 화면의 팔레트 변경을 방해하면 안 된다. 16×RGB8 팔레트 내용 서명까지 검사하여 동일 팔레트 객체의 실제 색값이 수정되면 Canvas pixel을 다시 구성하고, 범위 밖/불명 팔레트 데이터는 거부한다. Source `7e591d152af34162759797d27dce6a60b5ae7509`, exact CI `41257471393` SUCCESS. 최종 파일로 비공개 원본 `OPGRAPH.LZW` 14파트/108레코드/3,235,136픽셀 네이티브 RGBA 변환 재검증 PASS. 이는 브라우저 원본 팔레트 순서/타이밍의 증거가 아니며, 원작 8086/VGA 참조 프레임과의 직접 비교 전에는 픽셀 패리티를 선언하지 않는다. 캐시 수정·회귀 재검증 자체는 같은 웹 렌더링 성과이므로 추가 경쟁 점수 +0.
- **웹게임 구현 승인 한계:** VERIFIED = CI 정적 import graph, 독립 native JavaScript 원본 분기 의미 테스트, 원본 픽셀값을 사용한 웹 Canvas RGBA 변환 및 한국어 파일 SHA 검증. **UNTESTED/HOLD = 브라우저 실물 사용성·실제 화면 캡처 원본 프레임과의 일치, 한국어 OPEN.EXE VGA 팔레트·레이어 타이밍·애니메이션, MAIN 메뉴 및 항해·전투·게임 종료의 네이티브 완전성, 세이브 왕복과 사운드 동등성**. 기존 `ReaGameRuntime`의 명시적 비원본 scaffold·가상 진행 수치는 게임 기능 완료로 인정하지 않는다.
- **이후 작업 우선순위:** (1) 실제 원본 함수/메뉴·상태 전이의 REA/Ghidra 증거를 확보해 웹 네이티브 JS로 확정 변환 (2) 오프닝 실제 palette/VGA blit/합성 좌표와 시퀀스 증명, Canvas 차등 검증 (3) Main/항구/항해/시나리오/세이브/오디오 실제 상태를 직접 웹 구현 (4) 실제 브라우저 입력·프레임·음악·전체 주인공 경로 테스트. 8086·DOS 신규 에뮬레이터 핸들러 확장은 반드시 이 목표의 별도 오프라인 증거 수집에 필요한 경우에만 제한한다.

## 2026-11-01 P3 IRQ0 in-service / original EOI opt-in continuation

- **Original game code remains unchanged.** On the shared 8086 CPU, a caller can explicitly opt into a single master PIC IRQ0 service gate via `createOriginalMasterPicCommandWitness({irq0OwnerCpu:cpu,initialIrq0InService:<explicit boolean>})` and pass the same witness as `picCommandWitness` to a staged DOS child. The initial PIC bit **must** be caller supplied; an actual DOS PIC snapshot has NOT been captured. A successful original IVT 08h delivery enters in-service, and only a genuine successfully observed original guest `OUT 20h,20h` clears it. A pending later explicit IRQ0 is deferred until EOI; IRET, host elapsed time and synthetic PIT ticks cannot release it. All non-IRQ0 lines are rejected in this opt-in mode. The previous no-PIC queue remains the default for legacy tests.
- **Fresh exact SHA synthetic-static gate:** source `a2833d024b508096fa16b5c9e0232da432a8320b`, regression fix `a5d045feb5932d82ccb3bc20f376eafeceb8659c`, GitHub Actions `41251557412` SUCCESS. Native mini-program covers 2 edges, real guest `OUT 20h,AL`/IRET and the no-EOI remaining-queued path; no copyrighted original bytes in CI.
- **Owner-original private evidence (synthetic DOS environment):** pinned FMDRV.COM SHA `0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b` and OPEN.EXE SHA `f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65`; synthetic PIC clear at start, synthetic host IRQ0 records at native OPEN ordinals 0 and 4000, explicit synthetic DOS IVT/PSP/OPL/PIT. In 80,000 executed original OPEN CPU instructions, both source markers were admitted but **only the first IRQ0 was delivered**, while `OUT 20h,20h` was not executed and the second remained pending until the bounded child abort discarded it (PIC gate deferred 19 times). In the prior **ungated** replay, two IRQ0 events entered, and one PIC EOI occurred. This is evidence that the old queue could advance the original FMDRV interrupt path prematurely, not proof of authentic DOS reference IRQ timing.
- **Still HOLD:** no verified initial reference PIC/IVT/PIT timing source, genuine DOS IRQ0 trace, original FMDRV sound timing, end-to-end OPEN→MAIN exit, real browser playability or full original game equivalence. Next: acquire trusted DOS reference PIC state/interrupt-boundary trace, then expand only source-supported devices and paths. Do not infer reference timing from synthetic ordinals.

## 2026-11-01 P3 explicit browser source → PIC-gated native DOS child

- Browser-host code now has an explicit `createBrowserDosChildBridge({cpu,target,initialFrame,picCommandWitness,maxQueuedExternalIrqs,externalIrqEvidenceTape,...})` path plus an opt-in `enqueueExternalIrqEdge({vector,source})` method. It passes the *same* 8086/PIC witness into the actual staged child; the entrypoint does not generate periodic IRQ, a fake browser key event, a fabricated PIC EOI or a game frame. The caller must supply every host IRQ edge, and the CPU must already own the exact port 20h EOI handler.
- Standalone original-free synthetic regression `tests/browser-dos-child-irq0.test.mjs` exercises one long native CPU child: original 8086-style STI/shadow → two externally queued IRQ0 deliveries → actual machine-code OUT20/IRET service → BIOS INT16 AH00 waiting on a trusted-key fixture → real CPU input consumption/termination → parent frame restoration and browser event listener cleanup. A mismatched PIC owner causes preflight rejection with listener removal and no CPU frame mutation. This is **synthetic** evidence, not a real browser event or verified DOS interrupt trace. Material SHA `06e4240d34f13c7947e6b09ec48cb22d153189f5`, exact `UW2 Web Fidelity Static Gate` Actions `41252058582` SUCCESS.
- Passive source diagnostics now also distinguish a genuine **PIC-in-service IRQ0 deferral** from IF-clear masking and STI/SS shadow in `web/guest-progress-witness.js`. The original guest CPU's existing declared external-edge observer receives a bounded `blockedByPic:true` reason only when the explicit queue actually refused a pending IRQ0; CPU state and pending guest edge are unchanged. Both total and per-window `externalIrqPicDeferred` counters are covered by the original-free synthetic test. Exact source SHA `f1b7510fb5314be82d0dab0fd1007cd796d3785d`, Actions `41252222516` SUCCESS; **no new source timing or PIC truth inferred and same PIC feature +0**.
- Browser gameplay, the KOEI → FMDRV → OPEN → MAIN full sequence, genuine initial DOS IVT/PSP/PIT/PIC snapshots, real input/video/audio/save fidelity remain **UNTESTED/HOLD**. No auto-triggered interrupt source exists.

## 2026-11-01 native OPEN source-wait + mutable pinned source hardening

- **Source-backed native 8086 wait instead of irreversible unsupported dependency fault (opt-in).** `guest-original-execution-session.js` now gates the original direct DOS `INT21 AH35` missing vector and unowned native `INT imm8` before any instruction is executed. Caller may opt in to the two dependency categories separately; legacy default still fails closed on an unverified source instead of changing existing execution behavior. A waiting session preserves original CS:IP/SS:SP/FLAGS, FIFO, actual executed-step count, DOS services and observers across repeated polls. Only the specifically requested SHA-verified 4-byte IVT install can clear the DOS-vector wait. Existing `dos-child-continuation.js` and explicit `browser-dos-child-bridge.js` can hold a paused child and await caller-supplied source under a provision-in-progress lock; they never manufacture a driver, IRQ, cycle timing or DOS return.
- **Single owner for original OPEN preflight.** `tools/p3-open-exec-probe.mjs` uses the same native execution-session wait, not its previously duplicated custom preflight. N100 PRIVATE owner Korean OPEN SHA `f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65`, explicitly **SYNTHETIC** DOS version/PSP/IVT/IOCTL/memory: 470 real original guest CPU instructions → source wait for DOS vector 00h at 0610:2DE1; after caller-supplied SHA-pinned **synthetic** vector, 583 instructions → original INT66 without installed FMDRV at 0610:1831; repeated waits do not advance. Legacy no-opt-in original source test still reproduces the explicit DOS vector fault at 470 with no silently invented state. Source hashes: `92134e0c12fd45992e8b5ed74be1eb3ab7b3ce90`, compatibility followup `43f17713178252390b39821f92a17189af308302`, unified native OPEN probe `d7d3b972bd1816a3dca7c6dff61a6db959b3d172`. Exact GitHub Actions `41253694750` SUCCESS.
- **Pinned SHA input immutability across asynchronous hashing.** A single private `Uint8Array` snapshot is now SHA-verified AND consumed for MZ/COM load+relocation, 256-byte PSP import, 1024-byte IVT import, single-vector IVT install and original DOS file resolver. This closes caller-buffer mutation between `crypto.subtle.digest` and actual RAM/adapter consumption; full IVT install now rechecks vector ownership after digest. Original asset hashes are metadata integrity checks, NOT independent real DOS provenance proofs. New synthetic mutable-source regression passes, exact source `b44ecb18c2b5589cedd9ae9aa7b608d7bf425796`, Actions `41253979300` SUCCESS. N100 real owner files FMDRV.COM `0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b` (30,644 native instructions, TSR) + OPEN.EXE (80,000 bounded native guest steps, no CPU fault, gated synthetic IRQ0) were retested with immutable loaders and remained unchanged.
- **Direct original browser OPEN source continuation.** The separately staged original OPEN SHA-pinned browser entrypoint now exposes an explicit source-wait opt-in and SHA-pinned DOS IVT supply, via `createBrowserOriginalGuestBridge`, with native trusted-key/BIOS FIFO lifetime unchanged. Synthesis-only test `browser-original-source-wait.test.mjs` verifies the guest's DOS AH35 vector wait → direct INT66 driver wait → actual guest ISR/IRET → BIOS AH00 key wait → proper guest termination and listener cleanup. Exact source SHA `3952deae7e7d5507ac08b4bfe263409951dc4c2b`, Actions `41254135446` SUCCESS. N100 PRIVATE original OPEN directly staged under a **different explicitly synthetic PSP/IVT setup** reached the same genuine source CS:IP waits at **472→589 native instructions** (not the standalone probe's 470→583). SHA-pinned synthetic IVT00 resumed it. A private regression at `106ae2abb40dc1015f1abdc67db6a659e0ee964e` passed; its synthetic setup does not prove a real DOS boot or browser KeyboardEvent.
- **Remains UNTESTED/HOLD:** real reference DOS IVT/PSP/PIT/PIC state, the authentic FMDRV IRQ/sound schedule, OPEN full video+audio end and exit status, KOEI→OPEN→MAIN child orchestration, original gameplay graphics/audio/save parity, six protagonists and full endgame. Do NOT classify synthetic DOS input as reference DOS or use instruction counts from different fixtures as equivalent timing.

## 2026-11-01 native KOEI DOS EXEC → authentic FMDRV TSR → authentic OPEN child HOLD

- **New native parent-child handoff, no synthetic DOS exit:** `web/guest-dos-exec-handoff.js` binds the guest CPU's actual source `INT21 AX=4B00h` with exact filename / ES:BX parameter block / original parent frame. Native parent instruction execution pauses **before** its DOS EXEC, preserving CS:IP, stack, instruction count and DOS 4D status. Only a provenance-authenticated `createStagedDosChildContinuation` owned by the same shared CPU may be started; after it has truly reached `COMPLETED` with a verified guest `INT21 AH31/4C` status and restored its parent's frame does the DOS adapter's existing synchronous `executeChild` callback deliver that result to original parent `INT21 AH4B`. The parent then executes its own original `INT21 AH4D` to consume the completed status; no assumed return code, launched child, game frame or scheduling is manufactured. Failed child, aborted child, or outstanding child *cannot* be silently accepted. Unit synthetic source `463a432080642b3882b7b88f7ac9ca05164d3089`, corrected exact native post-INT instruction IP contract `50f158e7f4e43d0eedad0323f92b62e4ad225abd` and same-feature diagnostic `e0b39165673d2bfc65f8af91bd4810c3dfaea0ba`; `UW2 Web Fidelity Static Gate` Actions `41254514576` SUCCESS. Earlier failed CI was repaired; follow-up +0.
- **N100 private ORIGINAL three-executable same-CPU integration:** `KOEI.COM` SHA `81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36` enters original DOS EXEC of `FMDRV.COM` at completed original parent instruction **63**; FMDRV SHA `0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b` executes original **30,644** instructions and returns real original DOS TSR status `terminationType=3, returnCode=1, residentParagraphs=0x26`. Original KOEI CPU resumes through its own `AH4B/AH4D` and at parent instruction **77** reaches actual OPEN.EXE DOS EXEC source. Original `OPEN.EXE` SHA `f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65` was staged on **that same KOEI/FMDRV shared CPU**, executes 80,000 bounded original guest instructions with no CPU exception, observes six original VGA indexed writes and 16 original DAC colors, then reaches **TOTAL_STEP_BUDGET_EXHAUSTED**, NOT verified DOS termination. An explicit diagnostic abort restores the real suspended KOEI parent frame and the parent remains blocked waiting for OPEN; `INT21 AH4D` is **not** invoked with a synthetic OPEN result and MAIN is **not** started. All initial DOS PSP/IVT/BIOS/port values remain explicitly **SYNTHETIC**; an additional explicitly synthetic INT67h IVT fixture at a nonoverlapping E040h stub was required, not a verified DOS reference. Private tests publish no original EXE/COM bytes.
- **Exact source record:** initial private original proof `04eeba6cd045fdeabcb4b4aaf281f87668ed01a6` (KOEI 63 → FMDRV 30,644 → KOEI 77); extension to KOEI-owned original OPEN `7105a1f43aca5034a14eb9ee0f12e29303f59913`; corrected synthetic IVT fixture `40a89d8d51d5454bfe76caf1f5474651b7bde59b`. Verified N100 private exact-source-run and GitHub Actions syntax/static-only run `41254729971` (CI confirms synthetic-static only, not original binaries). This is **partial original-byte native control flow**, not DOS-reference equivalence or web gameplay.
- **Outstanding:** genuine reference DOS PSP/IVT/MCB/PIT/PIC state, externally proven IRQ and OPL timing, OPEN normal exit result, KOEI original MAIN.EXE native launch and termination, video/audio/pixel/save parity and playable browser game remain **UNTESTED/HOLD**. Never fabricate OPEN exit to advance MAIN and never infer wall-clock duration from guest instructions.

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

**우선순위 변경:** 기존 P0~P9 목표와 원본 무변경 계약은 유지한다. 개별 메뉴·상점·항해 기능을 추정해서 계속 덧붙이는 방식보다, 먼저 **원본 실행 모듈 전체를 배치 분석해 함수/기본블록/미해결 코드 영역을 추출하고**, 실제 8086 동작을 보존하는 **공통 실행 상태 + IR + 직접 변환 JS/WASM 블록 + 원본 8086 해석기는 오프라인 차등검증 도구로만 유지한다. **배포 웹게임에는 8086 폴백을 포함하지 않는다**. 기존 웹 포팅 모듈은 폐기/덮어쓰지 않고 원본 근거를 검증한 부분부터 연결한다.

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
3. 복원되지 않은 명령·간접 호출은 **웹게임 구현 상태를 UNRESOLVED/HOLD**로 남기고, 개발용 격리 환경에서만 동일 CPU·메모리·전역 상태를 이용한 bounded 8086 참조 실행으로 비교한다. **실제 브라우저 배포/게임 진행에 8086 폴백 호출을 연결하는 행위는 금지한다.** 함수 의미·게임 이벤트·화면·음악을 추측해 우회하지 않고, 참조 파일 바이트는 사용자 보유 로컬 분석에 한정한다.
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

- 2026-11-01 P3 VGA correctness: GC05 bit3(read compare)와 bit1:0(write mode)을 분리한다. 이전에는 GC05=08h/09h/0Ah가 허용된 쓰기 0/1/2를 불필요하게 차단했다. VGA 쓰기 모드3은 IBM-compatible rotated CPU data & GC08 mask, GC00 set/reset 4-plane constant, prior native read-latch, GC03 raster operation 순서를 도입했다. 이전에 모드 3을 모드 0/2로 잘못 가장하지 않는다. 원본 8086 REP MOVSB가 A000 소스 읽기로 latches를 채우고 A000 다른 주소에 mode1 복사하는 경계를 CI synthetic로 시험했다. 원본 OPEN에서 실제 호출 여부와 DOS/브라우저 시각 동등성은 미검증이다.

- 2026-11-01 P3 원본 표시 팔레트 경계: VGA Attribute Controller 3C0h index/data flip-flop을 분리한 장치로 구현. **실제 포트 3BA/3DA IN이 관측될 때만** selector 상태를 index로 리셋하며, 속성 00..0F/10/12/14와 display enable에 원본 OUT 근거가 있어야 Mode12 pixel index를 DAC index로 매핑한다. DAC 3C8/3C9는 이미 관측된 RGB6 3중 바이트만 반환하고 완전한 4-plane indexed rectangle을 RGB6 값으로 변환하는 읽기 전용 비교 API를 추가했다. 미확인 초기 BIOS 팔레트/실제 CRT gamma/8-bit 색 변환/개인 파일 원본 DOS 화면은 보충하지 않으며 **HOLD**. Synthetic 검증: `tests/vga-attribute-rgb6.test.mjs`.

- 2026-11-01 BIOS 비디오 모드 전환에 따른 VGA 증거 세대 격리: 확인된 INT10/AH00 이후 VGA plane뿐 아니라 GC/SEQ readback, attribute 3C0 flip-flop/palette, DAC RGB6 캐시를 모두 폐기한다. BIOS 팔레트 초기값은 추측하지 않는다. 개인 원본 KOEI→FMDRV→OPEN 합성 DOS 스크립트에 opt-in `vga-rgb6` 플래그를 연결했다. 합성 3DA 상태 IN으로 증명된 속성 접근과 원본 CPU가 작성한 plane/DAC 16px crop이 모두 확인되면 SHA만 출력하고, 부분 증거는 HOLD로 남긴다. 원본 게임 바이너리 실기/참조 DOS·MAIN 진입은 **UNTESTED**.

### 2026-11-01 P1 원본 6개 모듈 Ghidra 12.1.4 전체 이미지 배치 분석 실제 결과

- **입력:** 소유 한국어판 DOS 6개 모듈의 SHA-256/크기 기준선을 각 실행에서 대조한다. Ghidra x86:LE:16:Real Mode, max-cpu=1, MZ 64KiB 이하 청크, COM PSP+0100h 좌표. 로컬 추출 원본 메타데이터 및 바이너리·디컴파일 원문은 저장소에 올리지 않는다.
- **독립 검증:** N100의 run-ghidra-p1-batch.py / run-ghidra-p1-com.py가 생성한 결과를 사용자의 SHA 고정된 원본 파일과 p1-ghidra-chunk-import.mjs / p1-ghidra-com-import.mjs로 다시 감사해 PASS. 정적 후보만이며 실제 실행으로 검증된 원본 함수 및 명령 바이트는 0이다.

| 원본 | 초기화 이미지/COM 바이트 | 창 | 함수 진입점 후보 | 명령어 후보 | 코드 후보 바이트 | 미관측 바이트 | 미해결 정적 흐름 | 판정 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| KOEI.COM | 776 | 1 | 2 | 141 | 321 | 455 | 20 | HOLD_UNRESOLVED_FLOW |
| FMDRV.COM | 5,162 | 1 | 2 | 339 | 754 | 4,408 | 9 | HOLD_UNRESOLVED_FLOW |
| OPEN.EXE | 41,655 | 1 | 248 | 13,418 | 27,254 | 14,401 | 81 | HOLD_UNRESOLVED_FLOW |
| MAIN.EXE | 267,319 | 5 | 1,261 | 82,644 | 204,519 | 62,800 | 4,798 | HOLD_UNRESOLVED_FLOW |
| END.EXE | 51,729 | 1 | 259 | 11,864 | 24,266 | 27,463 | 90 | HOLD_UNRESOLVED_FLOW |
| GRPDRV.EXE | 21,551 | 1 | 10 | 453 | 970 | 20,581 | 15 | HOLD_UNRESOLVED_FLOW |

- **개인 원본 추출 SHA:** OPEN b1f83cba8a2fc1c602dd021f3d5db3a907ed400dac732e359d6e28215d97743e, END 1dc5399b7b39e2c7990839ce62e5509faaef6c72c08231755c04742499b2a4bc, GRPDRV 493a61fbd644f75428c1edc7f21a02a82eba82c9ac795fbf5d4516f77f3903b4. MAIN 창 순서: ebf899442e01a20e2dfe62004d210eeba1fb4ac696f22fc4c3a4f6898d3de03c, 0738fac098000295fd3cb962519886c2f2bab770ad7ef4addcba07a433c74e6f, 73bfef35e39f20970bddd7186bb3a3189f7b9d33a861e1bf339e0cd7d3b278dc, 173846dccc18b0de9ef0769eda44b8023fb0509d0f1a1463cdbcba27eff6cfe1, fc38e536a3dca8dbc48141ca2096bd08f0a56109a02f3c55fc4cf0735e287a60. 최초 OPEN 8KiB 별도 실험은 전체 분석과 중복되므로 완성률에 가산하지 않는다.
- **다음 순서:** (1) MAIN 미관측 62,800바이트와 미해결 정적 흐름 4,798건을 largestUnobservedRanges/unresolvedFlowTypes 기준으로 재분류, (2) OPEN 14,401 미관측 바이트 및 실제 DOS 초기화/정상 종료 지점을 연결, (3) GRPDRV·FMDRV의 미관측 영역과 원본 IRQ/PIT/OPL 및 DOS PSP를 대조, (4) 실제 DOS reference trace로만 후보 검증 후 공통 IR+8086 실행·브라우저 포팅에 연결한다. 6개 파일 배치 출력이 있어도 전체 디컴파일·원작 동등성·MAIN 게임화면은 미완료이다.


### 2026-11-01 8086 원본 CPU 장치 버스·AAM 예외 정확성 보강

- `web/realmode-8086.js`: 한 CPU 물리 I/O 포트를 이중 `registerIOPort`로 덮어쓸 수 있었던 경로를 폐쇄했다. 장치 소유자 교체로 기존 FMDRV/OPL/PIT/VGA 응답이 묵시적으로 바뀌는 위험을 차단하며, 중복 등록 시 기존 소유자와 상태는 보존한다.
- 동일 코어의 `OUT` 명령 (즉시포트/DX, 8/16비트)은 장치 콜백이 Promise를 반환하면 기존의 묵시적 진행 대신 동기 실행 실패로 판정한다. 합성 동기 장치의 정상 기능은 유지한다. CPU 테스트: `tests/realmode-8086-io.test.mjs`, 실소스 커밋 `e4aa7ac2e3c8e5e865480d0495c4b47bef113c01`, exact-SHA synthetic GitHub Actions `41227776036` SUCCESS.
- Intel 8086/AAM 규칙상 `D4 00`은 0으로 나누기 타입 0 인터럽트다. 초기 구현은 유효 INT0 벡터 또는 명시적 어댑터가 있어도 무조건 호스트에서 종료했다. 기존 DIV/IDIV와 같은 알려진 벡터 경로로 전달하도록 수정했고, 미확정 IVT에서는 기존처럼 fail-closed 한다. 저장 IP/CS/FLAGS·AX 보존·벡터 없는 거부를 `tests/realmode-8086-decimal.test.mjs` 합성 사례로 확인. 실소스 커밋 `f7c13aadfe0e1c69200dc18eb3f131ad0b82f012`, exact-SHA synthetic GitHub Actions `41227845487` SUCCESS.
- **범위 제한:** 두 수정은 원본 한국어판 바이트의 실행을 위한 범용 CPU·장치 버스 의미 수정이며, 원본 DOS 참조 환경에서 해당 I/O 중복 또는 AAM 00 예외 분기가 관측됐다는 주장은 아니다. KOEI/FMDRV/OPEN·MAIN의 실제 DOS 부팅, 게임 전체 화면·음악·저장·브라우저 픽셀 동등성은 **UNTESTED/HOLD**. 다음 단계는 원본 OPEN 100만 명령 합성 추적의 핫스팟과 원본 DOS 하드웨어/PSP 상태를 실제 참조 자료로 검증하는 일이다.


### 2026-11-01 DOS AH3F 파일→VGA 경계 및 OPEN 원본 반복 실행 진단

- **원본 DOS 메모리 버스 정확성:** `web/dos-readonly-files.js`의 AH3F 원본 자산 읽기는 기존 직접 `cpu.memory.set` 경로를 사용한다. 이 경로는 8086 `write8`/VGA 4-plane 관측기를 지나지 않는다. 읽은 실제 바이트 구간이 VGA A0000h–BFFFFh와 겹치는 경우, 원래는 1MiB 선형 RAM을 변경하면서도 이 VGA 부작용이 원작과 같다고 잘못 간주할 여지가 있었다. 이제 DOS/kernel DMA/VGA 전용 쓰기 경로가 증명되기 전까지 **파일 커서·RAM·AX를 변경하지 않고 오류로 중단**한다. 0바이트 읽기·일반 RAM 버퍼는 그대로 지원하며, 경계 교차·A000·B800 차단과 정상 후속 읽기를 `tests/dos-readonly-files.test.mjs`에서 검증했다. 구현 커밋 `35356604e6367960ec5d8ca9d0eef3a6bbd10374`, exact-SHA GitHub Actions `41230280721` **SUCCESS**. 실제 DOS에서 AH3F를 VRAM으로 읽는 원본 경로가 관측되었다는 뜻은 아니다.
- **장시간 원본 OPEN 실행 분석 경로:** 새 `web/guest-execution-hotspots.js`는 사용자가 지정한 실행 단계부터 SHA 고정 원본 바이트를 실행하는 CPU의 **CS:IP 방문 횟수와 레지스터 상태 반복**을 한정된 키 개수·샘플 주기로 집계한다. CPU 게스트 RAM·원본 명령·그래픽/파일 내용은 기록하지 않는다. `tools/p3-open-exec-probe.mjs`에서 `enableHotspots:true`로 사용하며, 기존 N100 전용 `tests/p3-koei-fmdrv-open-irq-original.test.mjs`의 205,000 명령 이후 주소 집계도 메모리 상한이 있는 동일 분석기로 전환했다. 레지스터 재방문은 **메모리/포트/IRQ 상태 미관측 때문에 실제 스톨 증명이 아니며**, 원본 DOS/브라우저 완료율에 가산하지 않는다.
- 합성 루프·상태 변화·주소/키 상한·부적절한 입력을 검사하는 `tests/guest-execution-hotspots.test.mjs` 추가, UW2 Web Fidelity Static Gate에 등록. 구현 `d6de0ba1948b901e501f43d3da5b7ec55bc3459a`, GitHub Actions `41230412889` **SUCCESS**. CI에는 원본 바이너리가 없으므로 N100 실제 원본을 통한 신규 진단 실행은 이번 커밋에서 **UNTESTED**.
- **다음 개발:** 검증된 원본 장치/포트 상태와 CPU 반복 상태 샘플을 나란히 비교해, OPEN의 장시간 정체가 원본 그래픽 디코더 진행, 합성 PIT/IRQ 응답 또는 구현 누락 중 무엇과 일치하는지 구별해야 한다. 실제 DOS 레퍼런스/PSP/MCB 및 초기 하드웨어 스냅샷 없이는 무한 루프라 단정하거나 합성 값으로 MAIN 실행 완료를 만들지 않는다. 원본 14파트/640×480 출력의 DOS 및 브라우저 픽셀 동등성, MAIN 게임 진행, OPL/저장 동등성은 **UNTESTED/HOLD**.

### 2026-11-01 DOS 원본 파일 20비트 랩어라운드 전송 복구

- `web/dos-readonly-files.js`: 기존 AH=3Fh가 `DS:DX`의 유효 16비트 오프셋 범위 안에서도 마지막 물리 주소 `FFFFFh`를 넘는 읽기를 무조건 거절하던 문제를 수정한다. 같은 `RealMode8086.physical()` 20비트 주소 랩어라운드에 맞춰 끝부분과 `00000h` 시작 영역에 원본 파일 바이트를 나눠 기록한다. 실제 전송 길이만큼만 커서를 이동한다.
- 양쪽 물리 구간 모두 VGA A0000h–BFFFFh와 겹치는지 쓰기 전에 검증하고, 확인되지 않은 영상 영역은 계속 fail-closed한다. 원본 세이브 쓰기·화면·음악 등은 변경하지 않는다.
- `tests/dos-readonly-files.test.mjs`: 실제 8086 INT21 코드 호출로 `FFFF8h`→`00000h` 40바이트 전송, AX/CF·커서·이벤트 원본 시작 물리 주소·기존 VGA 거부를 합성 검증한다. DOS 참조 실기/OPEN→MAIN/브라우저 parity는 **UNTESTED**.

### 2026-11-01 원본 BIOS INT16 키보드 dequeue 경계

- `web/bios-int16.js`: 기존 AH01 키 상태/peek 경로를 유지하고 별도의 AH00 blocking-read/dequeue callback을 추가했다. 실제 제공된 큐 항목(`ascii`, `scanCode`)을 꺼내 AX로 전달하며 AH00에서 FLAGS/ZF를 임의 변경하지 않는다. 키가 없거나 제공자가 비동기/불완전하면 fail-closed, 가상의 키와 대기 시간·반복 입력은 생성하지 않는다.
- `tests/bios-int16.test.mjs`: AH01 peek→AH00 dequeue 두 번의 큐 순서, CR/extended scan, 플래그 보존, missing/empty/bad/asynchronous source 거부를 합성 INT16로 검증한다.
- 이는 **원본 입력 기능 구현**이지만 실제 `OPEN.EXE`의 AH00 도달, 브라우저 키 이벤트 연동, 키 타이밍, `MAIN.EXE` 정상 진입은 별도 실기 근거가 없으므로 **UNTESTED/HOLD**다.

### 2026-11-01 원본 DOS BIOS INT16 호스트 실키 입력 FIFO 통합

- 새 `web/bios-keyboard-queue.js`는 실제 호스트가 공급한 `{ascii,scanCode}` 쌍만 최대 1..1024건 FIFO로 수용하고, 유효하지 않은 값·초과 이벤트를 원자적으로 거부한다. `AH01` 상태/peek는 키를 소비하지 않고 `AH00` read만 정확히 하나를 소비하며, 입력 원본 객체 변경에도 보관된 쌍이 영향을 받지 않는다.
- `installBiosInt16(cpu,{keyboardQueue})`는 두 BIOS 서비스를 동일 큐로 묶는다. 별도 `checkKey/readKey`와 큐를 동시에 주어 입력 소유자가 갈라지는 경우에는 등록을 거부한다. 기존 독립 외부 콜백 API는 유지한다.
- `tools/p3-open-exec-probe.mjs`는 `keyboardQueue` opt-in을 제공한다. 정당한 입력이 들어왔을 때에만 SHA 고정 원본 `OPEN.EXE`의 실제 INT16 명령을 전달한다. 기본 실행은 이전과 동일하게 키 입력 서비스 자동 생성이 없다.
- 회귀 검증 `tests/bios-keyboard-queue.test.mjs`: 게스트 8086 INT16 5회, 빈 큐 ZF 및 AX 보존, 실제 키 2개 FIFO/확장키, 플래그 보존, overflow/유효성/소유자 혼합 거부. GitHub 원본 파일 없는 synthetic-static CI에 등록한다.
- 이 결과는 **키보드 어댑터의 합성 테스트**다. 브라우저 `KeyboardEvent`→키보드 scan/ASCII 변환, 실제 한국어판 OPEN의 해당 분기, DOS 기준의 대기·키 반복/타이밍, OPEN→MAIN 게임 완료는 모두 **UNTESTED/HOLD**.


### 2026-11-01 원본 BIOS 키 입력의 브라우저→8086 동기 대기 경계

- `web/browser-bios-keyboard.js`는 실제 브라우저 `KeyboardEvent`의 `isTrusted=true`인 keydown만 옵트인으로 BIOS FIFO에 적재한다. 표준 물리 `code`를 PC/XT BIOS 스캔 값으로, 관측된 ASCII `key`를 ASCII 값으로 전달한다. 지원 범위는 영문 숫자·문장부호·Space, Enter/Escape/Backspace/Tab, 방향/편집키, F1~F10에 한정된다. IME/한글·제어/Alt/Meta 조합·텍스트 입력 필드·지원하지 않는 키·합성 화면 컨트롤러 이벤트는 **임의 DOS 문자로 변환하지 않고 제외**한다. 실제 호스트에서 들어온 repeat keydown은 허용하지만 게스트 시간·가짜 반복 이벤트는 만들지 않는다. FIFO 초과 시 덮어쓰지 않고 거부하며 `accepted/ignored/overflow` 진단만 집계한다. 바인딩은 명시적으로 연결·해제할 수 있다.
- `web/guest-bios-keyboard-step.js`는 한정된 실제 8086 실행 단계 전에 `INT 16h AH=00h` 직접 호출과 선택적 세그먼트 접두어를 확인한다. FIFO가 비어 있으면 **CPU IP/AX/FLAGS/큐 소비를 변경하지 않고 `WAIT_BIOS_INT16_AH00`를 반환**한다. 실제 입력 뒤 재호출하면 그 원본 게스트 INT16 명령이 동일 FIFO에서 dequeue한다. CPU 전체를 에뮬레이터가 임의 시간을 흘린 것처럼 진행하지 않고, 외부 PIT/IRQ/브라우저 반복 정책도 만들지 않는다. 합성 node 회귀는 wait→real event enqueue→INT16 resume, 게스트 IP와 AX·동일 FIFO, 지원/미지원 키, 취소 동작 및 bounded overflow를 검증한다.
- `UW2 Web Fidelity Static Gate`에 두 새 모듈 문법 및 두 합성 회귀를 등록. **범위:** 이것은 선택적으로 연결 가능한 브라우저 키 입력 어댑터와 CPU 실행 대기 경계다. 기존 웹 프리뷰 `app.js`에 무조건 키 이벤트를 탈취하지 않으며, 사용자 보유 한국어판 원본 DOS `OPEN.EXE`에서 해당 BIOS 입력을 정상적으로 소비했거나 원본 DOS 스캔코드/IME/BIOS 대기·PIT IRQ 타이밍이 일치한 실측 결과는 아직 없다. OPEN 종료→MAIN 정상 시작/전체 원작 웹 게임 화면·음악·저장 및 실 DOS 동등성은 **UNTESTED/HOLD**.
- **다음 연속 개발:** 실제 소유 원본의 OS/장치 스냅샷에서 키/IVT/PSP/MCB 대기 조건을 읽기 전용 대조한 뒤, 검증된 browser original-execution 진입점에만 위 두 어댑터를 실제로 결합한다. OPGRAPH 남은 12파트와 OPEN 장시간 실행 대기 분류, MAIN 진입·VGA/OPL·게임 단계는 기존 계획대로 이어간다.


### 2026-11-01 원본 OPEN 장시간 실행의 CPU 쓰기·DOS 파일 진행 증거 분리

- SHA-pinned 원본 `OPEN.EXE` 진단의 반복 CS:IP/레지스터 히스토리는 그래픽 디코더의 RAM 갱신이나 파일 읽기 진행과 독립적이므로 그 자체로 무한 루프를 증명하지 않는다. 신규 `web/guest-progress-witness.js`는 `RealMode8086.write8` 원본 게스트 소유 쓰기를 **수정 전 CPU observer 이벤트**에서만 집계하며 실제 이전 바이트와 새 바이트가 달라진 건수를 구분한다. 실주소 00000~9FFFF RAM / A0000~BFFFF VGA aperture / C0000~FFFFF upper-memory 쓰기를 분리하고, bounded window별 CPU instruction count, 실제 쓰기/변경 쓰기, 유일 주소(상한/overflow) 및 원본 DOS file handler의 실제 readBytes/메타 이벤트 수를 기록한다. 파일명·소유 원본 바이트·메모리 스냅샷·게임 화면은 **수집하지 않는다**.
- `tools/p3-open-exec-probe.mjs`에 `enableProgressWitness:true`를 명시할 때만 설치한다. 기설치된 VGA/CPU write observer를 덮어쓰지 않고 충돌하면 즉시 거부한다. 기존 DOS 원본 file observer를 유지하며 그 결과가 성공했을 때에만 counters를 추가한다. 기본 probe, 기존 브라우저 게임, 사용자 보유 게임 파일은 변경하지 않는다. `enableHotspots`와 별도 선택 가능하며 `executionProgress`에 실제 메모리 갱신과 파일 전송량을 수치로 남긴다.
- 새 합성 8086 MOV write8 회귀는 같은 주소에 같은 값 재쓰기 vs 값 변화, DOS read event, 주소 중복/overflow, 윈도우 보관 상한, 부정확한 20-bit 물리 근거 거부, 원본 파일명 노출 방지를 시험한다. 이 도구의 관측은 **합성 DOS 환경에서 실제 명령이 메모리를 쓰는지** 구별하는 데 유용할 뿐, 파일/IO/IRQ/VGA 디바이스의 모든 내부 상태 변화를 관측하는 것은 아니다. CPU 쓰기가 없거나 같은 주소가 반복돼도 원본 DOS 정지·무한루프를 단정하지 않는다. 개인 원본 실기 재실행 및 DOS 기준 실행/MAIN 시작·픽셀·오디오 동등성은 **UNTESTED/HOLD**.
- 다음은 기존 private 원본 OPEN 100만 명령 진단에 본 집계를 낮은 비용으로 옵트인해 CPU hot sites와 CPU-write/actual file read가 동시에 진행되었는지 비교하는 일이다. 모든 실기 수치는 검증된 정확한 사용자 원본 SHA와 합성 DOS 환경을 함께 명시한다.


### 2026-11-01 P3 원본 CPU 포트 IN/OUT 진행 증거 (장치 비동등성 유지)

- `web/realmode-8086.js`의 단일 소유자 장치 포트 bus에 **완료된 IN/OUT만** 보고하는 선택적 동기/읽기전용 observer를 추가. 기존 VGA/OPL/PIT adapter를 대체·중복 등록하지 않고 이미 있는 호출 순서와 레지스터 반환을 유지한다. 장치가 거부하거나 없는 포트·폭 오류, 비동기 OUT은 완료 사건으로 기록하지 않는다. observer가 값을 만들어 반환하거나 비동기 처리하려 하면 fail closed.
- `web/guest-progress-witness.js`는 bounded instruction window에 실제 CPU 포트 읽기/쓰기 수, OPL(388h/389h), VGA(3B0h~3DFh), PIT(40h~43h), 기타 OUT 수와 유일 포트 수/상한 초과만 기록한다. 원본 IN/OUT 바이트, 등록된 장치 상태, 음악·화면 데이터는 요약에 저장하지 않는다. 분류는 **주소 단위 진단**으로, 사운드 발생·픽셀 갱신·타이머 IRQ 성공을 뜻하지 않는다.
- `tools/p3-open-exec-probe.mjs`의 기존 `enableProgressWitness:true`에서 CPU 메모리 observer와 새 포트 observer 소유권을 **둘 다 선점 검사**한 뒤 하나의 동일 집계기로 연결한다. 원본 실행 및 브라우저 기본 경로는 비옵트인. 테스트는 기존 `realmode-8086-io.test.mjs` / `guest-progress-witness.test.mjs`에서 실제 8086 명령, 정상/거부/비동기 장치, 읽기값, bounded 포트 보관/상한, 오염 없는 집계로 검증한다. 별도의 사설 원본 OPEN 실 DOS 기준·포트 디바이스 완전 동등성 및 실제 웹 항해/음원은 계속 **UNTESTED/HOLD**.

### 2026-11-01 P3 원본 OPEN 장시간 INT21 실행 기록의 메모리 상한

- `tools/p3-open-exec-probe.mjs`의 게스트 실행 예산을 명시적 1~1,000,000 명령으로 확장한다(실 원본 실행 결과를 의미하지 않음). 예전 `services` 무제한 배열 대신 `web/guest-dos-call-window.js`의 고정 용량 순환 기록(기본 4,096, 최대 65,536)을 사용한다. 보관 개수보다 호출이 많아지면 과거 것부터 버리되 총 시도 수와 폐기 수를 따로 보고하여 진단 기록 일부가 없음을 숨기지 않는다.
- 원본 8086 CS:IP의 `INT 21h` 및 AH/AL 일치로 기록을 검증하고 주소/서비스 번호 외 원본 파일명·버퍼·자산 바이트는 저장하지 않는다. 기록은 **DOS 호출 시도**이며 DOS 함수 성공/반환/원본 종료의 증거가 아니다. 합성 테스트는 실제 8086 INT 21h 실행, 순환 순서·메모리 상한·불일치 거부·요약 불변성을 CI에서 확인한다. 사설 한국어 원본 100만 명령 실행, 실 DOS 결과, 실제 화면·음악·게임 진행은 **UNTESTED/HOLD**.

### 2026-11-01 P3 원본 VGA 제공자 읽기 진단 보강

- 일반 8086 RAM 읽기와 장치의 명시적 `memoryReadProvider`가 유효한 바이트를 제공한 읽기를 구분한다. 새 단일 소유자 `memoryReadObserver`는 외부 제공자가 실제 유효 8-bit 데이터를 반환한 경우에만 호출되며, 기존 읽기 응답이나 장치 소유자를 대체하지 않는다. 반환값·비동기 observer는 거부하고 기존 read observer가 있으면 OPEN 진단 설치를 거부한다.
- 메모리·DOS·I/O 진행 진단은 A0000h~BFFFFh 제공자 읽기 수와 기타 제공자 읽기 수를 bounded instruction window별로만 집계한다. 원본 바이트·팔레트·픽셀은 기록하지 않으며 provider 응답을 DOS 실기 VGA 정답이라고 주장하지 않는다. Native 8086 `MOV AL,[moffs16]`, 정상 장치 읽기, RAM fallback, 거부/비동기/물리 주소 불일치 합성 테스트로 검증. 실제 소유 원본 DOS와의 하드웨어 정합성은 **UNTESTED/HOLD**.

### 2026-11-01 P3 명시적 외부 IRQ 전달 결론 진단

- CPU의 새 단일 소유자 `externalIrqObserver`는 실제 호출된 `deliverExternalMaskableIrq()`의 검증된 외부 요청에서 IF=0 거부, STI/SS 그림자 지연, IVT 설치 후 실제 게스트 인터럽트 전달을 구분한다. 전달 기록은 `dispatchInterrupt()` 성공 이후에만 발생하며 unknown IVT/잘못된 요청을 성공으로 기록하지 않는다. 새 진단값은 bounded instruction window별 세 결정의 **횟수만** 기록하며 장치 이름·비트·게스트 원본 바이트는 남기지 않는다.
- 실제 PIT/PIC 클록이나 IRQ 신호를 생성하지 않고, 이미 존재하는 장치 스케줄러의 명시적 요청만 관측한다. 외부 원본 참조 IRQ 타이밍, MAIN 진입, VGA/OPL 재생은 **UNTESTED/HOLD**. 합성 회귀는 실제 guest IVT+IRET, IF 마스크, observer 소유권/비동기/값 반환 거부와 잘못된 벡터를 검사한다.

### 2026-11-01 P3 원본 8086 실행 세션 — BIOS 키 대기 후 상태 보존 재개

- `web/guest-original-execution-session.js`는 원본 CPU를 재적재하지 않고 외부에서 받은 실제 BIOS 키 FIFO 하나를 소유해 반복 `runSlice()`로 계속 실행할 수 있도록 한다. 빈 INT16 AH00은 CS:IP·레지스터·큐를 변경하지 않은 채 WAIT로 반환하고, 실제 키 enqueue 이후 동일 명령에서 재개한다. 누적 명령(최대 15M)과 각 실행 슬라이스(최대 100k)에 독립적으로 명시적 한도를 두며, 슬라이스가 여러 번 호출되어도 누적 한도를 초과하지 않는다. DOS 타이머·키 이벤트·미확인 장치 결과를 스스로 생성하지 않는다.
- OPEN 원본 진단의 기존 `keyboardQueue` opt-in은 위 실행 세션의 단일 명령 slice 경유로 연결한다. 현재 기본 비입력 실행 경로는 그대로 보존한다. 합성 8086 INT16 AH00 대기→실제 FIFO 키 소비→RAM 변경→DOS AH4C 종료, 재대기, 누적 한도, 이전 BIOS owner 충돌, 부정확한 입력 차단을 CI에서 검사한다. 이 세션은 선택적으로 연결되는 실행 기반일 뿐 한국어판 원본 OPEN의 실제 키 입력 필요 여부, 원본 DOS 시간, MAIN 전환이나 브라우저 전체 게임 완료는 **UNTESTED/HOLD**.

### 2026-11-01 P3 브라우저 원본 8086 실키 FIFO → 동기 실행 경계의 옵트인 통합

- `web/browser-original-guest-bridge.js`에서 이미 존재하는 신뢰 키 이벤트 번역기·BIOS FIFO·실행 세션을 연결한다. 검증된 caller의 `RealMode8086`와 명시적 event target만 허용하고 실제 keydown을 enqueue하여 키 대기 중인 원본 `INT16 AH00`이 이후 `runSlice` 호출에서 동일 CS:IP로 실행된다. 브라우저 문서 전체를 임의 탈취하거나 자동 타이머·가짜 키·원작 UI를 생성하지 않는다. 해제(detach) 가능하며 기존 BIOS 소유자가 있으면 연결 실패 시 event listener를 반드시 정리한다.
- 테스트는 synthetic trusted/untrusted 이벤트와 실제 8086 머신 명령을 이용해 입력 누락→WAIT→실제 FIFO 수락/넘침→동일 IP 재개→메모리 기록→DOS 종료, 이벤트 해제/예외 소유권 정리와 누적 명령 한도를 확인한다. `app.js` 기본 프리뷰에 연결하지 않았고 실제 브라우저 운영체제 KeyboardEvent, 한국어 원본 `OPEN.EXE` 실행, VGA/음악/저장 및 `OPEN→MAIN`은 **UNTESTED/HOLD**.

### 2026-11-01 P3 원본 CPU 실행 장치 오류 후 재개 금지

- `createGuestOriginalExecutionSession`은 **실제 BIOS AH00 키 대기(WAIT)** 와 하드웨어/DOS/지원하지 않는 명령 실행 중 발생한 예외를 엄격하게 분리한다. 오류 시 일부 I/O 부작용이나 IP 선진행이 발생했을 가능성이 있으므로 세션을 `faulted`로 래치하고 이후 `runSlice`를 fail closed 거부한다. 재대기는 WAIT로만 표시하며 정상적인 키 대기/재개/종료에는 영향을 주지 않는다.
- 합성 `IN AL,DX`의 미등록 388h 장치 접근 오류는 예외 시 실제 IP가 하나 선진행하는 것을 관찰하며, 오류 이후 원본 명령을 임의로 건너뛰는 재실행이 차단되는지를 기존 세션 회귀와 전체 GitHub CI에서 검증한다. 본 조치는 원본 DOS 장치를 구현한 것이 아니며 모든 CPU 스텝을 원자적으로 롤백한다는 주장은 하지 않는다. 실제 원본의 장치/실행 경로는 계속 **UNTESTED/HOLD**.

### 2026-11-01 P3 BIOS 대기 경계에서 원본 진행 기록의 허위 증가 방지

- `runGuestUntilKeyboardWait`에 비동기·반환값을 거부하는 단일 명령 직전 훅을 추가하고 BIOS `INT16 AH00` 실제 FIFO가 비었을 때는 훅이 호출되지 않게 한다. 원본 `createGuestOriginalExecutionSession`과 `p3-open-exec-probe.mjs`는 이 경계를 공유한다. 기존 진단기가 원본 명령을 실행하기 전에 무조건 기록하던 방식에서, 미처리 BIOS 키 대기를 실제 명령·메모리 진행으로 잘못 계산하던 상황을 분리한다.
- synthetic 8086 native `MOV AH,0 → INT16 AH00`에 대해 키 없는 세 번의 실행 요청에서도 대기 명령 IP가 동일하고 관측 훅 횟수가 늘지 않음을 확인하며 실제 키 입력 후 정상 재개를 검증한다. 훅의 비동기·상태 위조 반환은 fail closed. 이 변경은 원본 DOS 참조의 실행 타이밍을 증명하지 않으며 원본 파일이 없는 GitHub CI 판정은 **SYNTHETIC**이다.

### 2026-11-01 원본 DOS 이미지의 키보드 미사용 실행 경로 단일화

- `createGuestOriginalExecutionSession`은 명시적 BIOS FIFO가 없을 때 기존 CPU의 실제 설치된 DOS/BIOS/장치만 사용하여 bounded instruction slice를 실행한다. 없는 키보드 장치를 임의로 설치하지 않으며 실제 `INT16`을 만났을 때 기존 CPU의 vector/adapter를 정확히 따른다. FIFO가 있는 경우에는 이전의 키 대기·재개 경계로 실행한다. 두 경로 모두 단일 `onBeforeInstruction` 검증 훅을 공유하며 CPU 오류 뒤 재실행은 금지한다.
- `tools/p3-open-exec-probe.mjs`에서 키보드 여부에 따라 분기하던 8086 루프를 하나의 실행 세션 호출로 통합하여 이후 원본 실행 중간 재개의 전제 구조를 만든다. 기존 one-shot API 결과와 샘플 진단 필드는 유지한다. 합성 테스트는 무키보드 원본 스타일 NOP→DOS 4Ch 종료, 훅 순서, 기존 INT16 미등록, 반환값 위조 거부를 검증한다. 한국어판 원본 전체 부팅은 **UNTESTED/HOLD**.

### 2026-11-01 P3 SHA 검증 원본 OPEN.EXE 중단/재개 진단 세션

- `tools/p3-open-exec-probe.mjs`에 `createOriginalOpenProbeSession()`을 추가하여 **원본 SHA 확인·MZ 재배치·DOS/PSP/IVT 장치 등록을 한 번만 수행**하고, 이후 `runSlice(1~100000)` 호출 때 동일 CPU·파일 핸들·BIOS FIFO·장치 관측·DOS 서비스 링 버퍼를 재사용한다. 명령 총량은 기존 1,000,000 하드 상한 안에서 단조 누적되며 각 실행 슬라이스와 전체 예산 소진을 별도 중단 사유로 보고한다.
- 미입력 BIOS `INT16 AH00`으로 반환된 세션은 원본 실행 위치와 명령 집계가 그대로 유지되며 외부 실제 키가 들어온 경우에만 같은 위치에서 다음 실행 슬라이스를 시작한다. 장치 오류가 발생하면 해당 세션을 영구 faulted로 차단한다. 기존 `probeOriginalOpen()` 1회 호출 API는 내부에서 동일 세션을 예산 끝까지 진행하되, 새로운 중단형 API로 실측 진행을 분할할 수 있다.
- 도구가 반환하는 것은 원본 OPEN의 구조적 SHA/CPU/진단 증거일 뿐 실제 DOS 동일 환경·IVT·PSP·게임 화면이 아니다. 한국어판 원본 실제 실행 재검증과 OPEN→MAIN 원작 동등성은 별도 **UNTESTED/HOLD**. 누적 명령·중복 기록·키 대기·장치 오류 및 snapshot 불변성은 synthetic 게스트 세션에서 확인하고, 원본 바이너리를 GitHub에 보관하지 않는다.

### 2026-11-01 실제 한국어판 OPEN.EXE 470명령 원본 실행의 첫 IVT 선행조건

- N100 사용자 보유 한국어 원본 `OPEN.EXE` SHA-256 `f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65`를 1회 적재하고 선언된 **합성 DOS 6.22 version/resize/IOCTL** 어댑터를 붙여 실행한 결과, 일괄 실행 및 37명령씩 분할 세션의 **470명령 / 실제 원본 MZ 재배치 23건 / DOS INT21 시도 4회 / 동일 CS:IP 0610:2DE1**이 일치했다. 정지 위치는 원본 DOS `INT21 AH35 AL00`, 즉 아직 제공되지 않은 **원본 DOS 초기 인터럽트 벡터 00h 조회**다. `INT 00h`의 진짜 원본 DOS 제공자 값을 확보하지 못했으므로 0으로 채우거나 임의 ISR을 배정하지 않고 HOLD한다.
- 새로운 CPU 거부 진단은 누락 벡터 번호를 `DOS_IVT_VECTOR_UNVERIFIED` 및 `interruptVector`로 구조화한다. OPEN 프로브는 `EXTERNAL_ORIGINAL_DOS_IVT_VECTOR_REQUIRED`와 `missingInterruptVector`를 전파하여 필요한 DOS 참조 스냅샷의 정확한 부분을 명시한다. 기존 fail-closed 원칙과 AH35 미등록 벡터의 ES:BX 비변경을 지키고 합성 회귀를 추가한다. 이 원본 실험은 **합성 DOS 장치·가정된 초기 메모리**가 포함되어 있으므로 원본 DOS에서의 장면·음악·OPEN→MAIN 완료 근거가 아니다.

### 2026-11-01 P3 원본 OPEN.EXE 브라우저 실행 이미지 로더 연결 (엄격한 스냅샷 소유)

- `web/browser-original-open-session.js`를 추가했다. **사용자가 직접 제공한 한국어 원본 `OPEN.EXE` 바이트**의 고정 SHA-256 검증을 가장 먼저 수행하고, 사용자가 따로 제공·SHA 고정한 DOS PSP 256B·IVT 1024B 및 명시적 MZ allocation으로 동일 8086 CPU 메모리에 적재한다. 진단 프리뷰의 합성 화면이나 자동 키/IVT/파일 내용을 생성하지 않는다.
- 스냅샷/원본 적재가 성공하고 INT16 소유권 충돌이 없는 경우에만 기존 browser trusted key → BIOS FIFO → 실행 세션을 명시적 event target에 연결한다. 전역 DOM listener·웹 전용 게임 조작기·자동 실행 타이머는 추가하지 않는다. CPU/DOS 장치 및 실제 BIOS 값의 준비는 호출자가 별도로 책임진다. SHA 일치 그 자체는 DOS 스냅샷의 실제 출처·정합성을 보장하지 않는다.
- GitHub Actions에는 원본 EXE를 넣지 않고 synthetic 가짜 MZ와 누락 PSP/IVT로 SHA 거부, 기동 미변경·무등록 listener 등 실패 경계만 검사한다. 별도 N100 원본 파일로 성공 staging 진단을 수행하기 전까지 실제 브라우저 실행 성공·OPEN→MAIN·OPL/VGA·DOS 등가성은 **UNTESTED/HOLD**.

### 2026-11-01 N100 원본 OPEN 브라우저 준비 경로 실물 검증 보강

- GitHub source `web/browser-original-open-session.js`와 한국어판 원본 OPEN.EXE 고정 SHA를 사용한 N100 private 테스트에서 `loadPinnedDosPsp`·`loadVerifiedMz`·`installPinnedDosIvtSnapshot`·브라우저 키보드 source bridge를 순서대로 실행했다. 원본 이미지 SHA 고정·재배치 23건, 명시적 IVT vector 00h 1건, 원본 8086 명령 1개 실행, event target listener 등록/해제 1회 성공. 사용된 PSP/IVT 및 DOS 버전은 명시적으로 **합성 입력**이고 브라우저 event target 역시 모의 객체이다. 따라서 실제 Browser KeyboardEvent, DOS/BIOS hardware, 시각 화면·음악, MAIN 전환, 사용자의 게임 플레이 성공을 증명하지 않는다.
- 재현 가능한 private-file 테스트 `tests/p3-browser-open-original.test.mjs`의 직접 작성한 코드만 GitHub에 추가하고, 원본 자산·원본 1KiB IVT 덤프·PSP 덤프는 업로드하지 않는다. `node --check`만 public Actions에서 검사하고 사용자의 실제 원본을 가진 N100에서 별도 실행한다. 정품 DOS 부팅 환경에서 읽은 INT 00h 포함 IVT 검증값 확보는 계속 **HOLD**.

### 2026-11-01 P3 원본 DOS AH35 IVT 의존성 이전 안전 대기/재개

- `guest-dos-ivt-await.js`는 **실제 CPU가 다음에 실행할 직접 INT 21h / AH=35h**와 명시적 DOS 21h 어댑터 및 현재 알려진 IVT 여부만 확인한다. 누락된 벡터는 CPU IP·레지스터·stack·실행수·DOS 호출 기록을 소비하기 전 `WAIT_EXTERNAL_DOS_IVT_VECTOR`로 반환한다. 현재 원본 OPEN 0610:2DE1의 누락 `00h`를 디바이스 응답 추정 없이 정지하도록 `createOriginalOpenProbeSession({pauseOnMissingDosIvt:true})` 옵션으로 연결했다. 기존 기본 동작/실패시 재개 금지는 유지된다.
- 소유자가 **DOS 참조에서 별도 입수한 4바이트 벡터** 및 SHA-256을 명시적으로 제출할 때만 `supplyPinnedDosIvtVector()`가 해당 벡터를 기존 CPU IVT에 기록하고 동일 세션의 다음 slice가 원래 INT 21h를 실행한다. SHA 핀은 전달 파일의 무결성만 인증하며 DOS 참조 출처를 증명하지 않는다. 모르는 벡터의 0 채움·자동 stub·임의 ISR은 금지. CPU가 running이면 공급을 거부하며 실패/불일치/충돌은 원래 wait 상태를 유지한다. Synthetic 8086 INT21 AH35→AH4C 회귀를 Actions에 추가했다. 진짜 DOS 참조값이 없을 경우 원본 게임 완성/장면·음악은 **UNTESTED/HOLD**.

### 2026-11-01 원본 OPEN 583명령 다음 실제 인터럽트 드라이버 선행조건

- `guest-external-interrupt-await.js`는 원본 CPU의 다음 **direct INT imm8** 바이트와 등록된 host adapter 또는 명시적 guest IVT vector만 검사하여, 미등록 인터럽트를 GPU/타이머/TSR 의미로 추측하는 대신 `WAIT_EXTERNAL_GUEST_INTERRUPT_HANDLER`로 원본 CS/IP, stack, FLAGS 및 누적 계량을 보존한다. 기본값 OFF인 `pauseOnMissingGuestInterrupt:true`로 원본 OPEN 실행 probe에 옵트인 연결; synthetic `INT 66h`의 반복 대기→별도 드라이버 설치→정확한 CPU 명령/정상 종료 검증을 CI에 포함한다.
- 사용자 보유 한국어 원본 OPEN.EXE 파일(기존 고정 SHA)을 **합성 DOS version/MCB/IOCTL·합성 IVT 00h=0900:0000** 환경에서 실행: 원본 470명령 `INT21 AH35 AL00` 사전 대기, 핀 검증 이후 583명령(원본 CS:IP `0610:1831`)에서 아직 등록되지 않은 **INT66h(FMDRV 런타임 선행조건)**를 정확히 대기했다. 원본 DOS 상의 실제 진행 재현/음악 재생/OPEN 종료라고 표시하지 않는다. 원본 소유 바이너리 없이 동작하는 synthetic tests와 사용자 로컬 private test를 별도로 보관하며 참조 FMDRV TSR 실물 설치가 없으면 HOLD.

### 2026-11-01 FMDRV/OPEN 동일 CPU 자식 실행을 위한 유지형 DOS EXEC child 세션

- `web/dos-child-continuation.js`는 기존 `runStagedDosComChild()` 일괄 실행 API를 변경하지 않고, **명시적 원본 CPU 자식 프레임** 및 `createGuestOriginalExecutionSession()`을 사용해 같은 CPU/물리 RAM/IVT/장치를 여러 `runSlice` 사이에 유지한다. DOS 자식이 실제 AH31/4C 등으로 종료한 경우에만 원래 부모 14개 레지스터·종료 상태·maskable IRQ inhibit shadow를 복원한다. 원본에서 발생한 guest-selected INT66 25h IVT 등록과 RAM/장치 변경은 복원 시에도 유지된다.
- 도중에 session 상태가 외부로부터 변조되면 실패 폐쇄, 별도 abort에서만 부모 프레임을 되돌린다. 원본 게스트가 아직 종료하지 않은 상태에서 **완료 상태를 만들어 부모 실행을 재개하지 않는다**. 실행 예산과 슬라이스는 엄격히 상한을 유지하며 실제 FMDRV TSR 원본과 KOEI nested EXEC 전체 연결은 후속 실물 검증 전까지 UNTESTED/HOLD다. Actions 합성 네이티브 8086 DOS AH25 INT66 설치→AH31 TSR 복구, 중단/재개, 부모 shadow 및 side effects 보존 테스트로 게이트한다.

### 2026-11-01 N100에서 사용자 보유 원본 FMDRV TSR → OPEN 동일 CPU 분할 실행

- `tests/p3-fmdrv-open-continuation-original.test.mjs`는 사용자 소유 한국어 원본 FMDRV.COM·OPEN.EXE **기존 SHA 핀**만 읽는 비공개 자산 테스트 소스다. `createStagedDosChildContinuation()`으로 원본 FMDRV COM을 **8개 slice, 30,644개 실제 8086 명령** 실행하여 TSR 26h 문단/반환코드 1, guest `INT 66h` 벡터 `0400:0108`, 부모 CPU 복원을 확인했다. 그다음 동일 CPU·RAM·드라이버 소유권에 OPEN 원본 MZ(재배치 23건)를 적재하고, 원본 OPEN **80,000개 실제 명령을 4,000명령씩 분할 실행**했다. 기존 미등록 INT66h 즉시 실패 대신 FMDRV 실제 설치 벡터를 통과했으며 synthetic reference에서 VGA indexed write 6건, DAC 16색, BIOS 팔레트 16건, VGA 3DA retrace read 64건을 관측했다.
- 위 CPU 경로는 `KOEI.COM`의 정식 DOS EXEC 단계와 파일 시스템·DOS 메모리 소유권을 모두 통과한 참조 기록이 **아니며**, 실제 DOS/BIOS 포트 장치 버전·초기 IVT/PSP·PIT/OPL 응답은 명시적 합성 설정이다. 80,000명령은 일시 예산 소진일 뿐 오프닝 완료·게임 화면/소리의 원작 동등성은 **HOLD**다. 테스트는 일반 CI에서 실행하지 않고 `node --check`만 수행해 저작권 원본을 저장소에 넣지 않는다.

### 2026-11-01 웹 호스트 키보드→원본 DOS 자식 실행 세션 연결

- `browser-dos-child-bridge.js`는 이미 별도 stage된 원본 8086 child CPU frame과 명시적 사용자 소유 이벤트 타깃을 받는다. 기존 `attachBrowserBiosKeyboard`의 신뢰 가능한 이벤트 필터→원본 BIOS 키 FIFO를 `createStagedDosChildContinuation`의 동일 CPU 경로에 전달한다. BIOS INT16 AH00는 실제 키가 없으면 같은 CS:IP로 기다리고, 입력이 오면 원본 명령을 실행하며 자식 정상 종료 시 부모 CPU 프레임을 복원한다. 전역 listener/자동 프레임 타이머/게임화면 현대화/가짜 DOS 종료 상태를 만들지 않는다.
- 잘못된 초기 child frame이나 이미 점유한 INT16을 만나면 등록한 키 이벤트 리스너를 제거한다. 실행 슬라이스·자식 abort·키 이벤트 detach는 명시적 API로만 제어한다. 합성 JS event-target/8086 opcode 회귀로 키 없는 대기, 검증 실패한 이벤트 거부, trusted 이벤트 처리, 원본 DOS AH4C 종료·프레임 복원·중복 리스너 제거를 검증했다. 실제 브라우저 키보드 권한·최종 OPEN/MAIN 시각/음향·원작 등가성은 **UNTESTED/HOLD**.

### 2026-11-01 브라우저 DOS 자식 종료 시 입력 소유권 수리 및 원본 120k 폴링 증거

- 브라우저 DOS child의 종료·명시적 abort·실패 후 `keydown` 리스너가 남아 부모 웹 UI의 키를 가로채지 않도록 `browser-dos-child-bridge.js`에서 소유 리스너를 자동 해제한다. 입력 오류나 잘못된 실행 slice 인자로 아직 활성인 세션을 무조건 파괴하지 않고, child 상태가 실제 terminal/faulted인 경우에만 자동 해제한다. Native `IN AL,DX` I/O 장치 누락으로 child FAULTED→부모 frame 복원→키 리스너 제거 합성 검증을 추가했다. 이 수정은 최초 브라우저 child bridge 성과 내 수리이며 별도 점수 중복 없음.
- 별도 N100 소유 원본 FMDRV TSR 30,644명령→OPEN 120,000명령 native 계속 실행 진단에서 사용자 소유 FMDRV `0400:0108` 및 OPEN `0610:1835` 주기 경로가 약 5,111회 반복된 것을 관측했다. 이 반복이 실제 원본 DOS의 시간/IRQ 동작과 동등하다는 자료는 아직 **없다**. 현재 합성 PORT/PIT/IVT 조건의 pending 하드웨어 증거 갭이며, 이 진단만으로 가짜 clock tick/INT66 응답·화면 프레임을 생성하거나 완료를 선언하지 않는다.

### 2026-11-01 DOS 자식 종료 후 8086 BIOS INT16 장치 소유권 누출 수리

- 실제 native 8086 `installBiosInt16()`이 설치한 인터럽트 어댑터는 자식 실행이 완료/abort/FAULTED해도 공유 CPU에 남아 다음 원본 DOS 자식의 BIOS 핸들러 등록을 방해하거나, 부모가 종료된 자식의 FIFO를 읽을 위험이 있었다. `RealMode8086.removeInterruptAdapter(number,exactHandler)`의 **정확한 등록 함수 동일성 검증**을 추가하고 `installBiosInt16` 소유 binding에 idempotent detach를 부여했다. `createGuestOriginalExecutionSession`은 해당 소유 binding을 한 번만 해제할 수 있으며 재개는 금지한다.
- `createStagedDosChildContinuation`은 부모 CPU 프레임 복원 전에 **오직 자신이 등록한 BIOS INT16** 어댑터를 해제한다. 게스트/외부 FMDRV INT66 IVT는 건드리지 않으며 기존 부모 frame·IRQ shadow·guest IVT 변경은 유지한다. 합성 테스트는 첫 자식의 실제 BIOS AH00→DOS 4C 종료 후 동일 CPU에서 두 번째 자식이 BIOS를 정상 재등록하고 abort할 수 있음, 임의 owner 제거 시도 거부, 브라우저 child complete/abort/I/O fault 시 listener와 BIOS handler를 모두 해제함을 검증한다. 최초 브라우저 child integration의 생명주기 수리이므로 점수 중복 없음.

### 2026-11-01 독립 browser-original-guest bridge 입력 핸들러 소유권 수명 수리

- 기존 원본 CPU `browser-original-guest-bridge.js`에서도 브라우저 키down 리스너만 제거하고 CPU `INT16` adapter는 남겨 다음 원본 DOS 프로세스가 같은 8086 기계를 사용할 때 점유 충돌을 일으키던 경로를 수리했다. 같은 source owner `guest-original-execution-session.releaseKeyboardAdapter()`를 이용하므로 정확한 등록 함수의 INT16만 해제하고 FMDRV 등의 제3자 IVT/adapter는 변경하지 않는다. 실제 종료·명시적 detach·native CPU 실패에서 정확히 한 번 해제하며, release 이후 해당 키보드 세션의 재실행은 거부한다. Synthetic DOS AH4C, unsupported IN 포트, 명시 detach regression을 GitHub Actions에 포함한다. 기존 브라우저/세션 생명주기 수정의 후속 repair이므로 별도 점수 없음.

### 2026-11-01 외부 PIT/IRQ 신호의 분할 실행 자식 세션 연결

- `web/guest-external-irq-queue.js`는 명시적으로 소유한 CPU·설치된 guest IVT vector와 장치 원인 `source`가 실제 호출자에게 제공된 경우에만 hardware IRQ edge를 용량 상한 큐에 수락한다. `createStagedDosChildContinuation.enqueueExternalIrqEdge()`로 입력한 edge는 이후 자식 `runSlice()` 경계에서 **최대 1건** `deliverExternalMaskableIrq()`에 전달된다. IF=0 또는 STI/SS 1-instruction inhibit 상태에서는 edge를 소비하지 않고 보류하며, 실제 native guest ISR 진입과 IRET 실행 후에만 `delivered` 카운터가 변한다. 종료/abort/FAULTED 시 잔여 edge는 부모 CPU로 넘기지 않고 `discarded`로 분리한다. 세션이 실행 중이면 외부 추가를 거부한다.
- 이 연결은 **호출자가 외부에서 이미 관측·검증한 edge**만 수용하고, CPU instruction 수에서 PIT tick을 만들어내거나 정기적인 PIC IRQ를 생성하지 않는다. `createOriginalPitChannel0WriteBus()`는 원본 OUT 43h/40h reload 관측에 한정, 실제 클럭·PIC/EOI·IRQ 발생 스케줄은 미확보. Synthetic CLI/STI→1명령 지연→IVT ISR `INC [200h];IRET`→DOS 종료, IF 마스크, queue overflow·abort 및 부모 frame 보존 검증을 GitHub Actions에 추가했다. 사용자 원본 OPEN 루프에 임의 IRQ를 주입해 달라진 결과를 DOS 참조 PASS로 주장하지 않는다.

### 2026-11-01 원본 FMDRV INT08 테스트 스텁의 OPEN 원본 MZ 메모리 중첩 제거

- N100 사용자 보유 `FMDRV.COM`/`OPEN.EXE`로 새로운 명시적 external IRQ0 단일 이벤트의 실제 원본 CPU 실행을 확인하는 중, 기존 private 테스트에 적힌 **가짜 INT08 초기 핸들러 0920:0000이 원본 OPEN.EXE 이미지 적재 영역과 실제 20-bit 주소에서 겹침**을 발견했다. 원본 FMDRV는 TSR 완료 후 guest INT08을 `0400:01DE`로 설치하고 미등록 OS 원래 핸들러로 체인하는데, 오래된 합성 IRET 스텁이 OPEN 적재 과정에서 덮여 **가짜 오류** `0000:0020 unsupported opcode DE`를 발생시켰다. 원본 FMDRV 실행 결함으로 간주하지 않는다.
- `tests/p3-fmdrv-open-continuation-original.test.mjs`는 기존 `assertDisjointGuestPhysicalRegions`를 재사용해 FMDRV PSP+COM, OPEN PSP+MZ 실제 source imageBytes, 모든 synthetic IVT 스텁의 물리 위치를 원본 적재 **전에** 검증한다. OS 초기 synthetic IRET 스텁은 image와 분리된 `E000:E010:E020:E030:E040` 세그먼트로 격리하고, 이전 0920h 겹침이 실패하는 회귀 검사를 넣었다. 기본 모드(원본 FMDRV 30644+OPEN 80000명령) 및 명시적 `--synthetic-external-irq` 한 건 주입 모드 양쪽에서 **FMDRV 자체 INT08 0400:01DE를 거쳐 원본 OPEN 80000명령 완료 없이 예산 소진까지** 오류 없이 진행함을 N100에서 확인한다. irq 주입 시간·초기 IRQ 체인 벡터는 합성이라 실제 DOS/PIT 타이밍 증거가 아니며 OPEN 정상 종료/게임 동작은 UNTESTED.

### 2026-11-01 외부 IRQ 큐 native CPU 예산 소진 후 가짜 ISR 진입 방지

- `dos-child-continuation`이 누적 실행 예산을 소진하고도 미처리 외부 IRQ를 다음 `runSlice()`에서 먼저 전달하여 **실제 CPU 명령 0개인 상태에서 IVT ISR로 guest IP/stack을 변경**할 수 있는 결함을 수리했다. 남은 예산 0이면 delivered edge가 없어야 하며 미처리 edge는 abort로만 폐기한다. 예산이 끝난 뒤의 새 external IRQ 입력은 거부한다. 합성 8086 `IF=0` native NOP 1개→step cap→남은 IRQ 1개 보유→재호출 시 0 step/0 IRQ/CPU frame 동일→abort 시 discarded=1 검증한다. 최초 IRQ edge source 통합의 직접 수리이므로 별도 점수 없음.

### 2026-11-01 SHA 고정 외부 실측 IRQ 이벤트의 원본 8086 instruction-boundary 재생

- `web/guest-pinned-external-irq-trace.js`는 외부에서 제공한 IRQ 이벤트 목록(각 5B: native 완료 명령 ordinal uint32LE + INT vector uint8)의 SHA-256과 strict increasing 순서·최대 길이·명시적 장치 source를 확인한 후에만 이벤트를 보유한다. 원본 저작권 파일을 포함하지 않고 **기존 DOS 참조에서 따로 취득한 실측 이벤트인지 여부는 해시만으로 증명할 수 없다**. 사용자의 원본 구간에 임의 타이머 틱을 자동 공급하지 않는다.
- `createStagedDosChildContinuation({externalIrqEvidenceTape})`은 이 증거만 다음 guest native step 경계에서 최대 한 건 enqueue하며, 긴 `runSlice(maxSteps)`가 다음 증거 ordinal을 건너뛰지 않도록 해당 위치까지만 실행한다. 누락 이벤트 시 오류를 숨기지 않고 fail closed. 이벤트를 실제 CPU에 전달하는 하위 계층은 기존 IF mask/STI shadow/실제 installed IVT/IRET 검사와 각 세션의 명시적 edge queue 그대로다. 브라우저 DOS child 브리지 역시 검증된 tape 인자를 그대로 전달한다.
- Synthetic SHA 핀·2개 ordinal 0/4에 대한 native 실제 ISR/IRET 및 DOS AH4C 종료·지나친 event ordinal/형식 오류·가짜 tape 소유권 거부를 Actions에서 검증한다. 실제 DOS reference IRQ trace를 확보하기 전까지 실제 원본 IRQ 타이밍/오프닝 시간/OPL 출력 동등성은 **UNTESTED/HOLD**이며 이 레코드 형식은 오직 해시 고정 경로 입구를 위한 형식이다.

### 2026-11-01 원본 FMDRV INT08 처리기의 실제 PIC OUT 20h 명령 관측

- 사용자가 보유한 원본 `FMDRV.COM` TSR 등록 후 동일 CPU에서 `OPEN.EXE`를 실행하면서, 명시적으로 supplied synthetic IRQ ordinal 0/4000을 SHA-256 핀으로 전달한 결과 실제 FMDRV ISR이 두 차례 실행됐다. 둘째 IRQ에서는 실제 FMDRV가 `OUT 20h, 20h`를 수행했으나 기존 minimal shared CPU test에 PIC 20h adapter가 없어 fail-closed했다. 이는 원본 CPU opcode 누락이나 게임 프로그램 오류가 아니라 **다음 외부 PIC 장치 경계 부족**으로 식별했다.
- `guest-pic8259-command-witness.js`를 만들어 실제 원본이 수행한 **master PIC command 0x20 raw write**만 CS:IP·ordinal과 기록하게 했다. 0x20 이외의 명령/다른 포트·콜백 반환값 위조·비동기 응답·상한 초과는 거부한다. 이 모듈은 EOI에 따른 PIC interrupt in-service 비트 변화나 EOI 승인·다음 IRQ 우선순위/스케줄을 시뮬레이션하지 않는 **source evidence-only** sink이며, 실제 PIC와 동등하다는 보장은 없다. 새로운 private regression에서 일반 원본 FMDRV→OPEN 80000명령·단일 synthetic IRQ 및 2건 SHA-pin synthetic replay 모드에 각각 성공; 두 IRQ를 실제 FMDRV `INT08 0400:01DE`로 전달하고 20h 출력 1건을 관측했음을 고정한다. 기본/실험 모드 모두 사용자의 원본 SHA를 검증하며 GitHub에 원본 바이트를 게시하지 않는다.

### 2026-11-01 FMDRV 원본 하드웨어 포트 명령을 구체적 관측기로 연결

- 기존 shared original `FMDRV.COM` TSR→`OPEN.EXE` private regression의 임의 `port 43/40/388/389` 카운트 핸들러를 이미 검증한 `createOriginalPitChannel0WriteBus`와 `createOriginalOpl2WriteBus`로 교체했다. 2026-11-01 사용자 소유 원본 FMDRV COM 기계어에서 실제 PIT `OUT 43h,36h` / `OUT 40h,00h` / `OUT 40h,10h`를 **1회 프로그램**하여 ch0 mode3 원시 분주 4096을 확인했고, OPL 388/389 register select+data **6쌍**을 입증했다. 읽기 388h의 status=0은 명시적 **합성** 장치 응답으로 한정한다. PIC `OUT 20h,20h` 한 건과 합성 IRQ 2건을 같은 pinned native test에서 구별 기록한다. 기본 모드·명시적 1 IRQ·SHA pinned 2 IRQ 실행 모두 FMDRV 30,644 + OPEN 80,000명령 원본 SHA를 확인하며 정상 원작 오디오·클럭 도달성은 주장하지 않는다. 이 작업은 기존 PIT/OPL 원본 관측기 재사용/회귀 정밀화이며 이전 독립 성과에 중복 가산하지 않는다.

### 2026-11-01 원본 native IRQ 기록의 소유권 재사용 차단

- SHA-256으로 고정한 IRQ trace의 cursor는 실행 세션에서 소비되는 상태이므로 동일 tape를 두 번째 DOS child에 재사용하면 이미 건너뛴 이벤트를 조용히 누락시킬 위험이 있다. `createPinnedExternalGuestIrqTrace`의 one-owner claim을 실제 `createStagedDosChildContinuation`의 guest BIOS 소유권이 확정되는 시점에만 수행하고, 다른 세션 재사용을 fail closed 한다. 실패 시 첫 세션의 완료 상태나 반환된 부모 CPU frame은 보존하며 새 tape를 다시 검증해 만들어야 한다. 외부 DOS source timing 동등성은 여전히 UNTESTED, 신규 기능의 직접 완전성 수리로서 중복 점수 +0.

## 2026-11-02 네이티브 기항 판정: 원본 항구 목록 순서와 목적지 오선택 분리

- 배포 코드 `web/world-map.js`의 `findPortCallTarget`에서 원본 4×4 후보를 첫 번째 배열 항목으로 바로 확정하던 동작을 수정. 동일 반경에 여러 정본 항구가 있다면 어느 것을 기항할지 검증되지 않았으므로 `null`(기항 보류)로 처리한다. 4×4 후보가 유일하면 원래 우선순위를 유지하고, 그 경우에만 2칩 복구 후보보다 우선한다. 2칩 복구 역시 유일한 후보일 때만 허용한다. 원본 표의 유효 좌표·항구 ID 범위 밖의 자료는 무시한다.
- 브라우저 기항 버튼·화면과 실제 입항 코드는 같은 함수를 사용하므로 잘못된 포트로의 임의 진입을 방지. `tests/native-port-call-recovery.test.mjs`는 정본 4×4 복수 후보, 4×4 대 복구 우선순위, 복구 복수 후보, 세계 X 연결 경계, 유효하지 않은 원본 좌표를 검사한다. 보유 원본의 130항구 첫 출항 재기항 전수 검사 `native-port-call-original.test.mjs`는 별도 owner-only로 유지.
- 한계: 모호한 경우 사용자 입력으로 항구를 선택하거나 원래 DOS의 항구 선택 규칙과 동등하다고 추정하지 않는다. 실제 원본 DOS/브라우저 플레이의 정확한 기항 타이밍은 **UNTESTED**.

## 2026-11-02 브라우저 기항 버튼과 실제 원본 입항 가능성 동기화

- `native-port-arrival.js`는 원본 `ZA_DAT.DAT` 4번 항구 문 및 `PORTMAP/PORTCHIP` 통행성, 시간·포트 정본 범위를 확인하는 **순수 사전조건**을 공유하도록 분리한다. `canBuildNativePortArrival`는 상태·NPC·세이브 복제 없이 입항 가능 여부만 검사하고, 실제 `buildNativePortArrival`가 동일한 사전조건을 통과한 뒤에만 소스 기반 도착 상태를 생성한다.
- 실제 웹 `app.js`의 해상 근처 항구 표시·컨트롤러 기항 버튼·입항 처리에 동일 `findReadyNativePortCall`을 연결하여 원본 입항 좌표가 막혀 있는 항구의 잘못된 기항 가능 표시를 제거한다. 기항 후보 자체는 있으나 원본 도착 근거가 부족하면 기존 `port-map-unavailable` 진단을 유지한다. 합성 검증은 유효한 보통/보급항, 원본 문·통행 충돌 거부, 시간 위반, 이전 세션 불변 조건을 검사한다.
- 브라우저 네이티브 게임 로직만 변경하며 원본 DOS 부팅이나 불확실한 NPC·경제·스토리 구현을 추가하지 않는다. 사용자 소유 원본 해도 전수 확인과 Firefox 화면 실기는 별도 검증 대상 (**UNTESTED**).

## 2026-11-02 웹 네이티브 자동항해: 순이동량 0에서 무한 시간/보급품 소모 방지

- 실제 배포 JS `world-map.js`의 풍속·선박 추진력·해류 합산 계산을 순수 `projectedVelocity()`로 추출하고 `SeaRuntime.tick()`과 `hasNetMotion()`이 **동일 계산**을 사용한다. 원본 항해 공식을 변경하지 않는다.
- 실제 브라우저 `app.js`의 220ms 자동항해는 시작 전 및 매 반복 직전 `hasNetMotion()`으로 순 이동 벡터가 (0,0)인지 확인한다. 0이면 실행을 중지하고 `auto-no-net-motion` 사유를 화면 상태에 표시한다. `native-sea-auto.js`는 정지 시 원본 게임 tick, 일자·보급·은행 이자를 호출하지 않는 실행 경계다. 사용자 수동 화살표/키 입력의 명시적인 시간 진행은 그대로 유지한다.
- `tests/native-sea-auto.test.mjs`는 무풍·무해류·추진력 없는 synthetic 상태에서 AUTO 0회 실행·게임 시각 불변, 수동 시간 진행, 원본 승무원/노젓기 모델을 가진 선박의 정상 자동항해 1회 진행, 실제 `app.js` 연결 검증을 수행한다. 원본 DOS 경제/항해 일치 및 Firefox 실기는 **UNTESTED**이며 선박 무풍 상태를 재현한 것이 곧 원본 게임과의 완전 동등성은 아니다.

## 2026-11-02 항구 보급 트랜잭션 무결성 (브라우저 네이티브)

- 실제 `web/buildings.js`의 항구 보급 적재·하역 및 출항 하루 보급 소모를 검증된 소스 레코드(u16 적재량/보급품/선박 상태) 범위 안에서 수행한다. 수량·자금·항구별 가격 원천이 비정상인 경우 상태 변경을 거부하고, 최대 적재 가능 수량은 선창 잔여공간·16비트 원본 필드 잔여공간·현금 모두를 반영한다. 여러 함선 중 하나가 유효하지 않은 경우 출항 중 일별 보급 소모는 전체를 거부한다.
- `tests/native-harbor-supply-integrity.test.mjs`를 기존 UW2 Web Fidelity Gate에 연결하며, 사용자 비공개 한국어 DOS 파일은 CI에 포함하지 않는다. 이것은 웹 런타임 트랜잭션 원자성 보증이며 **한국어 원본 DOS 보급 동작의 차등검증 또는 브라우저 실기 검증이 아니다 (RUNTIME_VALIDATION=UNTESTED)**.

## 2026-11-02 웹 항구/해상 체크포인트 원본 저장 데이터 정합성 보강

- `web/native-checkpoint-integrity.js`에서 원본 한국어 세이브 소스 필드에 기반한 공통 브라우저 네이티브 검증을 추가한다. 두 저장·복원 경로가 동일한 현금(0~600,000,000G), 은행 예금·부채, 날짜/시간·월별 일수, 수용량/선원/보급품/화물 u16, 아이템 인벤토리 u8, 항구 시장 요율 범위를 검사한다. 해당 원본 레코드에 없는 필드는 테스트용 축약 소스에서만 예외 처리하며, 실제 한국어 슬롯은 모든 원본 필드를 가진다. 선박의 정상 구매·매각으로 수가 바뀔 수 있으므로 초기 함대 수 강제 고정은 하지 않는다.
- 손상되었거나 임의로 다시 계산된 로컬 SHA 체크섬을 동반하는 비정상 세션도 두 모드에서 복원하지 않으며, 정상적인 은행/교역/항해 이후 변경은 그대로 복원한다. SHA 체크섬은 변조 방지 서명이 아니라 비의도적 손상 탐지 수단이다. 이 웹 전용 임시저장 기능은 원작 DOS `Save Data` 구현이 아니며, 원본 DOS 차등/실제 Firefox/실제 파일 왕복은 **RUNTIME_VALIDATION=UNTESTED**이다.

# 대항해시대 II Web Runtime

## 원본 게임 불변 포팅 — 공식 개발 계약 (2026-10-31)

**최종 목표는 한국어 DOS 원본을 바꾸지 않고 웹에서 동일하게 실행하는 것**입니다. 원본에 없는 UI·기능·음악·텍스트·전환·밸런스는 허용하지 않습니다. 추측에 의한 구현은 완료로 간주하지 않습니다.

- [원본 역어셈블리→웹 포팅 P0~P9 마스터 계획](docs/ORIGINAL_DOS_TO_WEB_DISASSEMBLY_MASTER_PLAN_20261031.md)
- [실제 실행 결과: P0 원본 61개 SHA 확인 / P1 MAIN·OPEN 파일↔REA 매핑](docs/ORIGINAL_P0_P1_EXECUTION_20261031.md)
- [원본 61개 메타데이터 기준선](docs/original-baseline-20261031.json)

**현재 웹판은 부분 포팅이며 원본 전체 동등성은 아직 검증되지 않았습니다.** 원본 바이너리·리소스는 GitHub에 포함하지 않습니다.

N100의 REA 6.5.0 + Ghidra 12.1.4 역분석 결과를 기반으로 원본 DOS 게임을 브라우저 네이티브 런타임으로 재구현하는 작업 디렉터리입니다.

현재 구현된 1차 브라우저 마일스톤:

- 원본 `KOUKAI2.DAT`을 직접 읽어 10개 세이브 슬롯 파싱
- 슬롯당 33,340-byte 구조 및 주인공/항구/돈/명성 기본 필드 파싱
- 원본 `MENU.DAT`의 61개 CP949 메뉴 문자열 파싱
- 원본 `MESSAGE.DAT`의 1,179개 CP949 대사 문자열 파싱
- 원본 `KAO.LZW` LS11 해제: FAT 256개, 64×80×3bpp 초상화 직접 Canvas 렌더링
- 세이브 인물 레코드의 미확정 얼굴 후보 바이트를 `portraitIdCandidate`로 보존하고 선택 슬롯 얼굴 표시
- REA에서 식별한 `FUN_1fb7_5f6b` 메인 루프의 제어 형태를 브라우저 런타임 골격에 반영
- 원본 게임 리소스만 제한적으로 제공하는 로컬 HTTP 서버

아직 원본 그래픽/항해/전투/이벤트 로직을 완성한 게임은 아닙니다. 확인되지 않은 함수 의미는 임의로 이름 붙이지 않고 REA 주소/함수명을 유지합니다.

## 실행

N100에서:

```bash
python3 /home/chatgpt-runner/uw2-web/serve.py
```

같은 LAN의 브라우저에서:

```
http://192.168.0.48:18082
```

기본 원본 게임 데이터 경로:

```
/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD
```

다른 경로를 사용할 때는 `UW2_GAME_DIR`, 포트 변경은 `UW2_WEB_PORT` 환경 변수를 사용합니다.

## 테스트

```bash
node /home/chatgpt-runner/uw2-web/tests/runtime.test.mjs
```

## 역분석 SSOT

`/home/chatgpt-runner/rea-analysis/uncharted-waters-2/`

## 검증 상태 (2026-10-29)

- N100 Node parser tests: PASS
- 실제 KAO.LZW: LS11 FAT 256 entries, first decoded entries 1,920 bytes each
- Firefox WebDriver: 원본 56개 리소스, 세이브 슬롯, 메뉴 61개, 메시지 표시 120개, 얼굴 8개 DOM 로드 PASS
- Firefox runtime: 선택 슬롯 시작 후 frame counter 증가와 Canvas 합성 PASS
- 현재 상태는 브라우저 네이티브 재구현의 초기 실행 마일스톤이며 원본 항해/전투/항구/이벤트 로직은 계속 REA로 복원 중입니다.

LS11/bitplane 구조는 실제 제공된 KAO.LZW와 공개 프로젝트 `gcjjyy/koei_viewer`의 포맷 설명을 교차검증했습니다. 원본 게임 바이너리/데이터 파일은 GitHub에 커밋하지 않습니다.

## Browser M2 — 항구 지도 + GRAPH/OPGRAPH (2026-10-29)

추가 구현:
- `PORTCHIP.LZW`: LS11 14 entries 중 짝수 7개가 30,720-byte 그래픽 뱅크. 각 뱅크는 240개의 16×16/4bpp 타일.
- `PORTMAP.LZW`: 101개 엔트리, 전부 9,216 bytes = 96×96 tile index map.
- `CHIP_NO.DAT`: 100 bytes, 값 0..6만 존재. 정규 항구 ID 0..99를 7개 PORTCHIP 뱅크에 연결.
- 선택 세이브의 항구 ID를 실제 PORTMAP/PORTCHIP로 렌더링. 현재 슬롯 1은 PORT #5 튀니스, bank 2.
- `GRAPH.DAT`/ `GRAPH2.DAT`/ `ENDGRP.DAT`/ `OPGRAPH.LZW` 공통 GRAPH 레코드 디코더 구현.
- 사용자 OPGRAPH 원본은 LS11 14 parts / GRAPH 108 records. 시작 화면은 실제 640×128 타이틀 레코드를 직접 복원.
- OPGRAPH 갤러리와 런타임의 '원본 오프닝' 버튼 추가.

검증:
- GRAPH.DAT 65 records 전부 decode PASS
- GRAPH2.DAT 2 records 전부 decode PASS
- ENDGRP.DAT 59 records 전부 decode PASS
- OPGRAPH.LZW 14 parts / 108 records 전부 decode PASS
- REA로 사용자 `OPEN.EXE` file offset `0x0F7A` screen decoder와 `0x13A2` buffer decoder를 직접 decompile해 명령 구조를 교차검증.
- Firefox WebDriver: OPGRAPH 12-card gallery, 640×128 실제 타이틀 화면, 튀니스 96×96 tile map, 세이브 런타임 전환 PASS.

주의:
- OPGRAPH 색은 현재 16색 근사 팔레트다. 픽셀/압축 명령 구조는 원본이지만 정확한 장면별 EGA/VGA palette 전환은 추가 역분석 대상.
- 항구 런타임 미니뷰는 실제 플레이어 좌표가 아직 확정되지 않아 배경 타일을 제외한 콘텐츠 중심으로 보여준다. 이를 플레이어 위치로 주장하지 않는다.

## Browser M3/M4 — 실제 항구 보행 + 출항/해상 이동 (2026-10-29)

### M3: save-position town walking
- 한국어판 세이브 슬롯 데이터 기준점을 `page + 0x97`로 확정.
- 슬롯 기준 `+0x10/+0x12/+0x14/+0x16` = `viewX/viewY/playerX/playerY`.
- SAVE 1 튀니스: view=(1,72), player=(15,17), map=(16,89).
- SAVE 2 단치히: view=(10,38), player=(12,14), map=(22,52).
- ZA_DAT.DAT 101×24 바이트 = 항구 101개 × 건물 문 12개 × (x,y).
- SAVE 1의 (16,89)은 튀니스 주점 문 (16,88) 바로 아래, SAVE 2의 (22,52)는 단치히 항 문 (22,51) 바로 아래로 두 독립 슬롯에서 검증.
- PORTCHIP companion 4-byte walk bounds를 정확한 충돌 규칙으로 사용.
- 23×23 실제 save viewport, 한 칸 이동, 원본식 view scroll, 우회 이동, 건물 자동 진입 구현.
- 방향키/WASD/8·6·2·4로 실제 항구 이동.
- GRAPH.DAT records 6..17의 원본 건물 vendor art 표시.
- ESC로 건물에서 문 아래로 복귀.

### M4: sail to world map
- KOUKAI2.DAT DOS port table record = 20 bytes: `nation,u16le x,u16le y,name[15]`, table at slot-relative 0x53BA.
- 튀니스 world chip=(242,372), 단치히=(288,240).
- WORLDMAP.LZW 3 parts를 1080×540 cells로 복원.
- DATA1.LZW[18] 1024-byte quad table + DATA1.LZW[11] 앞 16KB의 128 world tiles를 이용해 2160×1080 chip map을 on-demand 렌더링.
- chip < 0x34만 항해 가능하며 함대 2×2 네 칩이 모두 바다여야 이동.
- 항구 건물에서 ENTER/1/S로 출항.
- 단치히의 nearest valid 2×2 sea = (286,238). 좌/우 회전, 전진, 해안 충돌 구현.
- Firefox 실검증에서 북/북동 진행은 coast-block, 동쪽으로 회전 후 (287,238)로 실제 1칸 이동 PASS.

### 정확성 경계
- 항구 위치/충돌/문/세계지도/해상 칩 충돌은 사용자 원본 데이터 기반.
- 항해 속도, 바람·해류, 선박 능력치, 날짜/식량, NPC 함대, 전투, 이벤트, 상거래 전체는 아직 완전 재구현되지 않음.
- 항구 player/sea ship은 아직 diagnostic marker. 사용자 CHAR.LZW는 이식판 자료와 크기가 달라 별도 해석 중.

## Browser M5 — Korean sprites + WINDCUR + fleet grounding (2026-10-29)

- `CHAR.LZW`: 5,120×6 + 15,360. Hero chunks are 8×640-byte frames; first four 128-byte planar blocks per frame form a 32×32 color layer. Fifth 128-byte blitter block remains unresolved, so current browser uses the confirmed color layer with index 0 transparent and does not claim final mask fidelity.
- `DATA1.LZW[11]`: 32,768 bytes = 0x4000 world tiles + 16×0x400 Korean sea-ship frames. Each ship frame is 0x200 packed 4bpp color + 0x200 packed mask, nibble 0xF transparent. Actual ship artwork now replaces the sea marker.
- Save-body clock at `page+0x97 + {6,7,8,9}` is decoded and cross-checks the slot headers exactly.
- `WINDCUR.DAT`: 30×15×3 pages, 72 world chips per cell. Browser now shows real seasonal wind and current at the live sea position.
- Korean `HORIEDIT` fleet layouts are decoded and exposed: Catalina save=Galleon 1; João save=Caravel Latina/Brigantine/La Reale 3, total crew 80.
- Next: prove remaining speed inputs and replace one-key-one-chip movement with the original 60-subunit tick integrator.

## Browser M5 — exact Korean CHAR + saved townspeople (2026-10-29)

- CHAR.LZW exact structure implemented: 6 protagonists × 8 frames and char6 × 24 town frames, all 32×32 RGBA.
- Each 640-byte frame is four 16×16 quadrants; each quadrant has four 256-bit colour planes plus one 256-bit transparency plane.
- Exact RGBA sheet hashes match independent extracted references for hero0, hero1, and char6.
- Player marker replaced by the selected protagonist's real sprite.
- Save actor table at saveBase+0x18 (8 × 3 bytes) restored and rendered with char6.
- Saved townspeople participate in proximity collision and wall-around logic; walkers use the original direction/move probabilities.
- Firefox validation: Tunis Catalina down frame on load, ArrowLeft changes to the real left walking frame; saved residents are visible around town.

## Browser M6 — Korean fleet speed + 20-minute sailing ticks (2026-10-29)

- Rejected the incompatible English/reference save fleet offsets after direct Korean-save validation.
- Korean Ship2 30-byte provision record decoded for water/food/lumber/shot, Lookout%, Navigation%, load, goods and captain.
- Korean Ship4 +7 proven as Sail Type for all 25 ship models (25/25 match).
- Captain Seamanship and Navigation Level taken from Korean Person records.
- Original integer sailing-speed formula implemented: wind/sail type, Power, crew Navigation ratio, load factor, Navigation Level, Seamanship and Tacking.
- WINDCUR current vector is added to fleet velocity.
- Movement now uses original-style independent 60-unit X/Y accumulators and one 20-minute game tick per forward input.
- Firefox Danzig validation: north coast-block, east speed12/6 knots, accumulators 12→24→36→48→60 and movement (286,238)→(287,238), clock 16:20→18:20.
- Remaining exactness edge: original 16-bit load-factor overflow for very large loads (>327) is not yet byte-for-byte emulated.

## Browser M7 — Port Call round-trip (2026-10-29)

- Korean save's full 130-port world catalog is decoded from page-relative 0x53BA.
- Original-style Port Call scans the 12 world tiles in the 4×4 ring around the fleet's occupied 2×2 block.
- ENTER/P at sea calls a nearby port by exact world coordinate.
- Arrival uses ZA_DAT Harbor door, places the player one row below it, and reconstructs view = Harbor − (12,13), clamped to 0..72.
- Danzig round-trip is exact: town (22,52), view(10,38), player(12,14) → sail (286,238) → Port Call Danzig (288,240) → town (22,52), view(10,38), player(12,14).
- Firefox validation PASS. The first complete interactive town→sea→town loop now works.

## Browser M8 — 한국어판 OPEN.EXE 12장면 오프닝 (2026-10-30)

기존 오프닝 구현은 공개 영문판의 13-scene/16-part 구조를 일부 참고한 근사치였지만, 사용자 한국어판 `OPEN.EXE`를 직접 추적해 교체했다.

- 한국어판 scene table: `DS:0x0740`, 12개 함수 포인터.
- 실제 장면 수: **12**. 웹의 가짜 13번째 `HIT ANY BUTTON` 장면 제거.
- 실제 한국어판 OPGRAPH: 14 parts / 108 GRAPH records.
- `0x18493` part loader와 `0x14E58` record lookup을 추적해 108개 record가 오프닝 12장면에서 전부 사용됨을 확인.
- 타이틀 scene은 part0 record `5,6,7,8,9,11,12,13,14,15,10` 순서. 32×32 twinkle 11..15도 실제 사용.
- 스토리 순서: Otto → Catalina → Ernst → Pietro → Ali → lovers/story → antagonist → João Ferrero → boarding.
- João scene은 Korean part3를 다시 로드해 part10과 함께 사용하며, scene10 후반에서 part11/12 승선 전환을 시작한다.
- scene11은 part12 record0으로 승선/마무리 애니메이션을 계속한다.
- Firefox 20× accelerated validation에서 scene 1/12 → 12/12 → title hold 전체 PASS.
- Node exact-record-map: 14 parts / 108 records / 12 scenes / 108 used PASS.

정확도 경계:
- scene/part/record 순서와 사용 여부는 사용자 OPEN.EXE/OPGRAPH 직접 근거.
- 일부 저수준 rectangle blit/wipe는 브라우저에서 시각적으로 동등한 transition으로 재현하며, 아직 framebuffer instruction 단위 에뮬레이션은 아니다.
- D2.MML/FMDRV FM 음악은 아직 브라우저 네이티브 재생 미구현.

## Browser M10 — D2 음악 + 연속 항해 + 웹 컨트롤러 (2026-10-30)

- 사용자 원본 `D2.MML`을 직접 파싱해 22곡/최대 4채널의 브라우저 음악 재생기를 추가했다. Firefox에서 AudioContext running, scheduler 재생 및 트랙 전환 PASS.
- 현재 음원은 원본 D2 데이터를 사용하지만 `FMDRV.COM` OPL-II 명령/음색의 bit-exact 에뮬레이션은 아직 아니다.
- 해상 AUTO/G 연속 항해를 추가했다. 기존 WINDCUR·원본 속도식·60단위 누산·20분 tick 위에서 동작하며 해안 충돌 시 자동 정지한다.
- 날짜가 하루 넘어갈 때 함선별 선원 수만큼 식수/식량을 소비하도록 연결했다.
- 웹 컨트롤러에 현재 모드/BGM 상태, AUTO, BGM on/off, 이전/다음 곡을 추가하고 A/B 배치를 정리했다.
- P 기항 버튼은 실제 가까운 항구가 있을 때만 활성화되고 항구명을 표시한다.
- Firefox 500px 폭에서 document/body scrollWidth=500으로 가로 스크롤 없음 PASS.
- 상세 검증: `docs/BROWSER_M10_MUSIC_SAIL_CONTROLLER_20261030.md`.


## Browser M11 — 원본 FM 음원 + 한국어판 HUD/메뉴/대화창 (2026-10-30)

- 이전 D2 바이트→WebAudio oscillator 휴리스틱을 제거했다. 해당 경로가 원곡이 아닌 삑삑음의 원인이었다.
- 사용자 원본 `FMDRV.COM` 3.12의 8086 코드를 실행해 0x388/0x389 OPL 레지스터 출력 자체를 캡처하고, Nuked-OPL 호환 코어로 로컬 OGG를 생성하는 도구를 추가했다.
- 생성 음원이 없으면 잘못된 합성음을 대신 재생하지 않고 `BGM 생성 필요`로 조용히 유지한다.
- N100 라이브에서는 트랙 1/20/22가 로컬 생성되어 있으며 Firefox에서 FM 트랙 재생 시간이 실제 증가하는 것을 확인했다. 현재 opening/town/sea 곡 번호 매핑은 MAIN.EXE 호출 추적 완료 전까지 잠정값이다.
- 한국어판 `GRAPH.DAT` #4의 640×400 원본 게임 HUD를 실제 항구/해상 화면에 적용했다.
- `GRAPH.DAT` #22 368×152 원본 양피지 창을 9-slice로 사용해 건물 메뉴, 출항 확인, 주민 대화창을 원본 형태로 교체했다.
- 중앙 플레이 영역은 (104,16) 기준 23×23 타일 = 368×368으로 원본 HUD 안에 배치한다.
- 개발용 화면 좌표/디버그 설명과 하단 상태 오버레이는 실제 게임 화면에서 제거했다.
- 아직 남은 정확도 과제: `ALL_FONT.16P`/KSS1 원본 비트맵 글꼴, 교역/아이템/은행/보급/주점의 세부 창을 각각 원본 GRAPH 구성으로 교체.
- 상세: `docs/BROWSER_M11_FM_AUDIO_20261030.md`, `docs/BROWSER_M11_ORIGINAL_UI_20261030.md`.
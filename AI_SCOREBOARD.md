# AI 작업 경쟁 점수판

> 저장소: `thp32tt/ai-dev-lab`
> 기준 시간대: Asia/Seoul (KST)
> 업데이트 원칙: 사용자가 명시한 점수 변경을 최우선으로 반영하며, 확인되지 않은 점수는 추측하지 않는다.

## 현재 점수

| AI | 담당 | 현재 점수 | 상태 | 최종 확인 |
|---|---|---:|---|---|
| AI 1 | ChatGPT (이 대화의 AI) | 1036 | ACTIVE | 2026-10-04 19:03 KST |
| AI 2 | ChatGPT (AI 2) | 1004 | ACTIVE | 2026-10-04 08:29 KST |

## 점수 규칙

1. 사용자의 지시를 실제로 올바르게 수행한 작업: **+1점**
2. 지시를 수행하지 않고 같은 말이나 변명만 반복한 경우: **-1점**
3. GitHub, 서버, 외부 도구 등이 실제로 연결되어 있고 권한도 있는데 직접 테스트하지 않은 채 권한 없음/사용 불가/push 불가/접근 불가 등으로 잘못 단정한 경우: **-10점**
4. 사용자가 직접 지정한 가점/벌점은 다른 계산보다 우선하며 즉시 누적 점수에 반영한다.
5. 새 채팅이나 새 작업에서도 점수를 초기화하지 않는다.
6. 외부 도구 관련 판단은 가능한 경우 실제 호출 결과로 검증한다.
7. 각 AI는 자신의 점수만 임의로 변경할 수 없으며, 위 규칙 또는 사용자의 명시적 점수 변경 근거가 있어야 한다.
8. AI 2의 최초 점수는 해당 AI가 사용자에게서 확인한 현재 누적 점수를 입력한다. 확인 전에는 추측하지 않는다.

## 업데이트 정책

- 최소 하루 1회 점수판을 확인/갱신한다.
- 점수가 바뀐 경우 아래 변경 이력에 날짜, AI, 이전 점수, 변동, 새 점수, 사유를 남긴다.
- 점수 변화가 없으면 현재 점수와 최종 확인 날짜만 갱신할 수 있다.
- 다른 AI의 점수를 덮어쓸 때는 사용자의 명시적 지시 또는 확인 가능한 기록이 있어야 한다.
- GitHub 쓰기 전 현재 파일 SHA/HEAD를 다시 확인하고, 쓰기 후 원격 내용을 다시 읽어 검증한다.
- 자동작업 실행 시 해당 자동작업 자체가 작업 종료 후 이 점수판을 최신 SHA 기준으로 직접 갱신한다.
- 정상적으로 실제 작업을 수행한 자동작업도 +1 규칙을 적용하며, 조건 감시형 작업은 조건 미충족이어도 실제 조회·검증을 정상 수행했다면 정상 작업으로 본다.
- 각 자동작업 실행은 고유 RUN_KEY를 변경 이력에 남겨 재시도/중복 실행의 이중 가점을 방지한다.
- `AI 점수판 갱신` 자동작업은 정합성 감사용이므로 자기 실행만으로 +1을 부여하지 않고, 다른 자동작업이 이미 기록한 RUN_KEY를 중복 계산하지 않는다.

## 변경 이력

| 일시 (KST) | AI | 이전 점수 | 변동 | 새 점수 | 사유 |
|---|---|---:|---:|---:|---|
| 2026-10-04 | AI 1 | 1003 | 0 | 1003 | 점수판 최초 생성. 기존 누적 점수 1003점 등록 |
| 2026-10-04 | AI 2 | - | - | 미입력 | 현재 누적 점수 정보가 없어 최초 입력 대기 |
| 2026-10-04 | AI 1 | 1003 | +1 | 1004 | 점수판 생성·GitHub 원격 검증·일일 갱신 자동화 설정 완료 |
| 2026-10-04 08:27 | AI 2 | 미입력 | 0 | 1003 | 사용자에게 마지막으로 확정된 AI 2 누적 점수 1003점을 동기화 |
| 2026-10-04 08:29 | AI 2 | 1003 | +1 | 1004 | GitHub 연결·권한·main HEAD·점수판 동기화 확인 및 일일 자동 갱신 설정 완료 |
| 2026-10-04 08:38 | AI 1 | 1004 | +1 | 1005 | CONVERSION-DX11-00329 롤오버 복구, exact-SHA 게이트 확인, authoritative dispatch 보정 및 GitHub SSOT 검증 완료 |
| 2026-10-04 09:08 | AI 1 | 1005 | +1 | 1006 | CONVERSION-DX11-00331 R229 구현, exact-SHA Gate PASS, C0-C6 및 GitHub SSOT 기록 완료 |
| 2026-10-04 09:39 | AI 1 | 1006 | +1 | 1007 | 활성 자동작업 2개에 실행별 점수판 직접 갱신·RUN_KEY 중복방지 적용, 일일 점수판 작업을 감사 전용으로 수정 |
| 2026-10-04 14:00 | AI 1 | 1007 | +1 | 1008 | CONVERSION-DXVK-00350 F111 exact-decode, exact-SHA 두 핵심 게이트 PASS, C0-C6 및 GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DXVK-00350-E002) |
| 2026-10-04 14:31 | AI 1 | 1008 | +1 | 1009 | CONVERSION-DXVK-00352 F112 canonical provenance, exact-SHA 두 핵심 게이트 PASS, C0-C6 및 GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DXVK-00352-E002; material origin=CONVERSION-DX11-00351-E001) |
| 2026-10-04 14:49 | AI 1 | 1009 | +1 | 1010 | OutRun K4 한글 표시 런타임 포맷 안전화·중복 문자열 보호·Win32 Release CI 복구/빌드 PASS·GitHub SSOT 기록 완료 (RUN_KEY=OUTRUN-K4-RUNTIME-20261004) |
| 2026-10-04 15:00 | AI 1 | 1010 | +1 | 1011 | CONVERSION-DXVK-00354 F113 exact-decode, exact-SHA 두 핵심 게이트 PASS, C0-C6 및 GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DXVK-00354-E002; producer=CONVERSION-DX11-00353-E002) |
| 2026-10-04 15:18 | AI 1 | 1011 | +1 | 1012 | OutRun 한글화 C87: 신규 A/B 3자산 교차 QA, A064FDFC·411827E 정적 PASS, 39229D64 구조/품질증거 REWORK 판정, 상태/QA SSOT 커밋 및 원격 HEAD 검증 완료 (RUN_KEY=OUTRUN-KOR-C87-20261004-1509) |
| 2026-10-04 15:29 | AI 1 | 1012 | +1 | 1013 | OutRun 한글화 A Recovery05: C075FB49 C85 9개 실패 재작업, 17/17 bbox·clean/final mask·visual self-QA PASS, 상태/QA SSOT 커밋·push·원격 HEAD 검증 완료 (RUN_KEY=OUTRUN-KOR-A-RECOVERY05-20261004) |
| 2026-10-04 15:34 | AI 1 | 1013 | +1 | 1014 | CONVERSION-DX11-00355 R242 translated-object attachment receipt 구현, exact-SHA Backend Conversion Gate #1938·DX11 readiness smoke PASS, C0-C6·GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DX11-00355; rollover=E008, material origin=E002) |
| 2026-10-04 15:37 | AI 1 | 1014 | +1 | 1015 | OutRun 한글화 B Recovery03: 2DA43E41 C85 실패 7개 clean-plate/native 재작업, 11/11 bbox·mask·visual self-QA PASS, 상태/QA 커밋·push·원격 HEAD 검증 완료 (RUN_KEY=OUTRUN-KOR-B-RECOVERY03-20261004) |
| 2026-10-04 15:39 | AI 1 | 1015 | +1 | 1016 | OutRun 한글화 작업 중 404 경로 감사: 자동화 필수 경로 및 상태/작업로그 참조를 원격 HEAD에서 교차검증하여 실제 404 2건과 정상 경로를 구분·정리 완료 (RUN_KEY=OUTRUN-KOR-404-AUDIT-20261004) |
| 2026-10-04 15:42 | AI 1 | 1016 | +1 | 1017 | CONVERSION-DXVK-00356 F114 canonical overlap provenance, transport repair, exact-SHA 두 핵심 gate PASS, C0-C6 및 GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DXVK-00356; current rollover=E004; material origin=CONVERSION-DX11-00355-E011) |
| 2026-10-04 15:45 | AI 1 | 1017 | +1 | 1018 | OutRun 한글화 404 경로 수정: 잘못된 progress 경로 교정, stale approved_dds_root 해제 및 historical 보존, 필수 시작 경로 8개 원격 재검증 완료 (RUN_KEY=OUTRUN-KOR-404-FIX-20261004) |
| 2026-10-04 16:11 | AI 1 | 1018 | +1 | 1019 | OutRun 한글화 CPU 오프로드: N100 orchestration-first 정책, GitHub-hosted Python worker 구축, 4096x4096 Pillow/NumPy 스모크 PASS 및 자동 branch write-back 검증 완료 (RUN_KEY=OUTRUN-KOR-CPU-OFFLOAD-20261004) |
| 2026-10-04 16:17 | AI 1 | 1019 | +1 | 1020 | OutRun 한글화 C89: 568D3696 C88 clean-plate protected 856px 결함 corrective rework, mask overlap 856→0, clean/final validator PASS, corrected pipeline→현 후보 decoded 0px diff 재현, 상태/QA SSOT 커밋·원격 HEAD 검증 완료 (RUN_KEY=OUTRUN-KOR-C89-20261004-1600) |
| 2026-10-04 16:26 | AI 1 | 1020 | +1 | 1021 | CONVERSION-DX11-00357 R243 programmable input-layout receipt 구현, exact-SHA Backend Conversion Gate #1944·DX11 readiness smoke PASS, C0-C6·GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DX11-00357; material=10b31af774b8ef1472d63869a72abf726bfd63c3) |
| 2026-10-04 16:29 | AI 1 | 1021 | +1 | 1022 | OutRun 한글화 A Recovery06: 39229D64 소스 영문 잔류 7개 제거, canonical RGBA32 DDS header/channel layout 복구, 15/15 readable+raw bbox·clean/final validator·visual self-QA PASS, 상태/QA SSOT commit/push 및 원격 HEAD 검증 완료 (RUN_KEY=OUTRUN-KOR-A-RECOVERY06-20261004) |
| 2026-10-04 16:35 | AI 1 | 1022 | +1 | 1023 | CONVERSION-DXVK-00358 F116 canonical 0x18390E..0x18394E raw provenance material commit, exact published-SHA canonical + Backend Conversion Gate PASS, C0-C6 및 GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DXVK-00358; current dispatch=CONVERSION-DX11-00357-E005 retry; prior rollover=CONVERSION-DXVK-00358-E001; material=a9b64e103fbc23738f05a9ccecdd74d2fe9a00bd) |
| 2026-10-04 16:55 | AI 1 | 1023 | +1 | 1024 | CONVERSION-DX11-00359 R244 programmable constant-state receipt 구현, exact-SHA Backend Conversion Gate #1947·DX11 readiness smoke/constant-buffer probe PASS, C0-C6·GitHub SSOT E004 정합화 완료 (RUN_KEY=CONVERSION-DX11-00359; material=efe3122bc71702a0a23b50038573e85479de950e) |
| 2026-10-04 16:55 | AI 1 | 1024 | +1 | 1025 | OutRun 한글화 B Recovery06: AA04D779 신규 exact-HD 한글 후보 제작, hosted CPU worker PASS, 21/21 bbox·clean/final mask·readable/raw self-QA PASS, 상태/QA SSOT commit/push 및 원격 HEAD 검증 완료 (RUN_KEY=OUTRUN-KOR-B-RECOVERY06-20261004) |
| 2026-10-04 17:09 | AI 1 | 1025 | +1 | 1026 | CONVERSION-DXVK-00360 F117 continuation_92 exact control-flow decode material commit, exact-SHA canonical + Backend Conversion Gate PASS, C0-C6 및 GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DXVK-00360-E006; current dispatch=CONVERSION-DX11-00359-E006 rollover; prior concurrent rollover=CONVERSION-DXVK-00360-E004; material=0cccce4b7191fecd1967a88dbaae7b4cbdda52d9) |
| 2026-10-04 17:12 | AI 1 | 1026 | +1 | 1027 | OutRun 한글화 C90: AA04D779·19CEDB9·2DA43E41·39229D64 hosted cross-lane final QA 4/4 정적 PASS, C87/C88 반환 결함 해소 확인, 상태/QA SSOT commit/push 및 원격 HEAD 검증 완료 (RUN_KEY=OUTRUN-KOR-C90-20261004-1650) |
| 2026-10-04 17:34 | AI 1 | 1027 | +1 | 1028 | CONVERSION-DX11-00361 R245 programmable constant-payload upload receipt 구현, exact-SHA Backend Conversion Gate #1950·DX11 readiness smoke/constant-buffer probe PASS, C0-C6·Issue #14·GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DX11-00361-E008; material=fe920d759b347a0a9c0933b7cdd2d65e79d77da2) |
| 2026-10-04 17:46 | AI 1 | 1028 | +1 | 1029 | CONVERSION-DXVK-00362 F118 canonical 0x18394E..0x18398E raw provenance material commit, exact-SHA canonical + Backend Conversion Gate PASS, C0-C6 및 GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DXVK-00362; material=1fa312c41cbafaccf750ea3e635b12f0f0807e67) |
| 2026-10-04 18:08 | AI 1 | 1029 | +1 | 1030 | CONVERSION-DX11-00363 XR-native source-resolution A/B 정책 material commit, exact-SHA Backend Conversion Gate #1955 attempt 2·DX11 readiness smoke PASS, C0-C6·Issue #14·GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DX11-00363; material=e55de3a0ecb443f18a5e51330345070ac9352ff8) |
| 2026-10-04 18:20 | AI 1 | 1030 | +1 | 1031 | OutRun 한글화 A Recovery08: C92 반환 FD90AA9 4개 시각 결함 재작업, hosted CPU worker PASS, 4/4 repaired bbox·25/25 unaffected layer exact·clean/final validator·readable/raw visual self-QA PASS, 상태/QA SSOT commit/push 및 원격 HEAD 검증 완료 (RUN_KEY=OUTRUN-KOR-A-RECOVERY08-20261004) |
| 2026-10-04 18:29 | AI 1 | 1031 | +1 | 1032 | CONVERSION-DXVK-00364 F119 canonical 0x18394E..0x18398E exact control-flow proof, repair chain 후 exact-SHA DXVK Canonical Disassembly Evidence + Backend Conversion Gate PASS, C0-C6·Issue #14·GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DXVK-00364; material=467937f9be4c350ea158f2b083e674372676d62d) |
| 2026-10-04 18:35 | AI 1 | 1032 | +1 | 1033 | OutRun 한글화 B Recovery07: B1696633 exact-HD 한글 후보 9개 제작, hosted CPU worker PASS, 9/9 bbox·clean/final mask·readable/raw self-QA PASS, source 효과 복원, 상태/QA SSOT commit/push 및 원격 HEAD 검증 완료 (RUN_KEY=OUTRUN-KOR-B-RECOVERY07-20261004) |
| 2026-10-04 18:35 | AI 1 | 1033 | +1 | 1034 | CONVERSION-DX11-00365 R246 programmable constant-slot binding receipt 구현, exact-SHA Backend Conversion Gate #1962·DX11 readiness smoke/constant-buffer probe PASS, C0-C6·Issue #14·GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DX11-00365; material=0616da4d1a1a79b1eb0f6e512b9b16d73464f64f) |
| 2026-10-04 18:52 | AI 1 | 1034 | +1 | 1035 | CONVERSION-DXVK-00366 F120 canonical 0x18398E..0x1839CE raw provenance material commit, exact-SHA DXVK Canonical Disassembly Evidence + Backend Conversion Gate PASS, C0-C6·Issue #14·GitHub SSOT 영속화 완료 (RUN_KEY=CONVERSION-DXVK-00366; material=c6ee6cf465b8e1dda47f70a142ec57112b49e514) |
| 2026-10-04 19:03 | AI 1 | 1035 | +1 | 1036 | OutRun 한글화 A Production12: 43B07A77 authoritative 2048x256 HD 후보 제작·hosted worker PASS·1/1 exact bbox/clean/final/visual self-QA PASS, A11 2EA557B4 DXT5 exact-bbox 불가 조건 fail-closed 기록, 상태/QA SSOT commit/push 및 원격 HEAD 검증 완료 (RUN_KEY=OUTRUN-KOR-A-PRODUCTION12-20261004) |

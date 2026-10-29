# 대항해시대 II Web Runtime

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
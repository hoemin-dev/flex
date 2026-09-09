# Flex UI 재설계 결과

## 1. 기존 구조

`App.tsx` 하나에 room 조회, WebSocket 수명 관리, 메시지 변환, 참여자, 타임라인, 입력창이 함께 있었다. 제목 표시줄 아래 약 40%를 방 목록과 참여자 목록이 나누고 나머지를 대화가 차지했다. 본문은 11px, 보조 정보는 8–9px 중심이었다.

## 2. 발견한 UX 문제

- 작은 창에서 디렉터리 영역 때문에 실제 대화 높이가 부족했다.
- 날짜를 시각 문자열로 변환해 보관하고 구분선을 항상 ‘오늘’로 표시했다.
- 연속 메시지에도 발신자와 아바타가 반복되었고 본문 줄바꿈이 유지되지 않았다.
- 메시지 도착 시 스크롤이 무조건 아래로 이동했다.
- 한글 조합 중 Enter를 전송으로 처리할 수 있었다.
- 초안이 방별로 분리되지 않았고, 전송 직후 입력을 지워 실패 내용을 복구하기 어려웠다.
- 연결 상태에 영어 내부 상태와 sequence를 노출하고 로딩·빈 기록·오류를 충분히 구분하지 않았다.
- 동작하지 않는 메뉴 버튼, 항상 노출되는 참여자, 서버 반응처럼 보일 수 있는 로컬 반응이 있었다.

## 3. 새 정보 구조와 동작

- 상단: Flex / Mona-HUB 브랜드, 기존 Tauri 접기 제어.
- 왼쪽: 워크스페이스, 방 검색, 선택 상태, API 기반 방 목록, 테스트 프로필.
- 대화 헤더: 현재 방과 한국어 연결 상태, 참여자 열기.
- 본문: 로컬 날짜 구분, 5분 미만 동일 발신자의 연속 텍스트 묶음, 발신자/직책/시각, 줄바꿈·긴 문자열 처리, 멘션 강조.
- system은 조용한 안내 행, notice/live는 가벼운 구분 영역으로 표시한다. API의 replyToMessageId가 존재하면 현재 기록의 원문 미리보기 또는 원문 미포함 안내를 제공한다.
- 읽던 스크롤 위치를 유지하고 새 메시지 버튼으로 최신 위치로 이동한다. 본인이 전송한 새 메시지는 아래에 보여 준다.
- 입력창: Enter 전송, Shift+Enter 줄바꿈, IME 조합 보호, 공백 차단, 높이 자동 조절, 전송 확인 중 표시, 방별 메모리 초안.
- 연결이 끊겨도 작성할 수 있고 전송만 제한한다. 서버 오류/15초 확인 지연 시 초안을 유지한다. 자동 재전송은 하지 않는다.
- 네이티브 dialog 기반 부가 패널: 포커스 제한, Esc 닫기, 배경 클릭 닫기, 닫힌 뒤 열기 버튼으로 포커스 복귀.

## 4. 이번 작업에서 변경·추가한 파일

- `src/App.tsx`: 화면 조합과 방 조회, 검색/초안/패널 상태.
- `src/styles.css`: 토큰, 전체 레이아웃, 타임라인, 입력창, 반응형 스타일을 재구성.
- `src/types/chat.ts`: 답장 참조와 선택적인 방 유형/멘션 수 표현용 필드 추가.
- `src/components/Avatar.tsx`
- `src/components/RoomNavigation.tsx`
- `src/components/MembersPanel.tsx`
- `src/components/MessageTimeline.tsx`
- `src/components/Composer.tsx`
- `src/components/PanelDialog.tsx`
- `src/hooks/useRoomChat.ts`: 기존 API/소켓 처리를 분리하고 상태·전송 확인·정리 방어를 보강.
- `src/hooks/useMediaQuery.ts`
- `src/lib/messages.ts`: ID 병합/sequence 정렬, 날짜·그룹·로컬 반응 처리.
- `src/lib/messages.test.ts`: 5개 회귀 테스트 추가.
- `scripts/verify-ui.mjs`: 브라우저 시나리오 검증. 테스트 안에서만 HTTP/WebSocket fixture를 주입한다.
- `artifacts/flex-ui/*.png`: 브라우저 테스트 화면 기록.
- `docs/flex-ui-redesign.md`: 이 보고서.
- `tsconfig.app.tsbuildinfo`: 빌드로 갱신된 캐시.

작업 시작 시 이미 변경되어 있던 package/lockfile, README, Worker/D1/설정 파일 등의 변경은 유지했다. 이번 작업에서 의존성을 추가하거나 해당 백엔드 파일을 수정하지 않았다. 기존 `src/backend-status.css` 파일은 유지하고 새 통합 스타일에서는 import하지 않는다.

## 5. 보존한 기능

`src/services/roomSocket.ts`와 Worker/D1/Durable Object/API 계약은 변경하지 않았다. 기존 `/rooms`, `/rooms/:id/messages`, WebSocket 수신 및 `message.create` 텍스트 전송을 사용한다. 메시지 ID 중복 제거와 sequence 순서 정렬을 유지하고, 재연결 시 history를 병합한다. 방 변경 시 AbortController, socket 종료, 재연결 timer 정리와 generation 검사를 유지·보강했다. 전송 대기 timer도 정리한다. Tauri host 명령과 창 설정은 유지했다.

## 6. mock / placeholder 범위

기존 조직 provider와 `devRoomMemberIds`, `mockRooms` fixture를 제거하지 않았다. 런타임 방 목록/메시지에 mockRooms를 섞지 않는다. 프로필·참여자·presence는 MOCK으로 명시한다. 반응은 현재 방을 보는 동안 해당 창에서만 적용되며 서버 저장/동기화를 주장하지 않는다. unread/mention/type 필드는 UI 구조만 준비하고 실제 API 값이 없어 배지와 임의 유형을 표시하지 않는다. 초안은 현재 앱 세션 메모리이며 재시작 후 복구하는 기능은 아니다.

## 7. 의도적으로 구현하지 않은 기능

읽음/미읽음 서버 추적, 멘션 알림 전달, 실제 presence, 반응 영속화, 답장 작성/스레드, 첨부, emoji/mention picker, 메시지 전문 검색, 과거 기록 pagination, 메시지 수정/삭제, 방 생성/권한 변경을 추가하지 않았다. 검색은 기존 방 이름 검색이다. EMP/PER/AC-DC 및 HR/Task/Space 등 외부 시스템 연동을 변경하지 않았다.

## 8. 작은 Tauri 창 대응

- 700px 이상: 왼쪽 방 목록과 대화가 나란히 배치된다.
- 699px 이하: 대화 중심 단일 열, 방 검색/목록을 왼쪽 drawer로 연다.
- 참여자는 기본 닫힘. 1120px 이상에서 오른쪽 패널, 그보다 작으면 오른쪽 modal drawer.
- 낮은 창에서는 헤더·입력창 높이를 줄이고 textarea 최대 높이를 제한한다.
- 350×520 / 440×800 / 768×640 / 1280×800 브라우저 viewport에서 가로 넘침이 없고 전송 버튼이 보이는 것을 확인했다.
- Tauri의 기존 440×800 기본 크기, 최소 크기, host 접기 동작 설정은 변경하지 않았다. 네이티브 Tauri 실행/패키징은 이번 검증에 포함하지 않았다.

## 9. 검증 결과와 재현

- `npm test`: 4개 파일, 13개 테스트 통과. 기존 8개 + 새 5개.
- `npm run build`: TypeScript 및 Vite production build 통과.
- `npm run build:worker`: 통과.
- `git diff --check`: 통과.
- Headless Edge + Playwright 브라우저 테스트 통과: 날짜/그룹/멘션/답장 표시, 중복 수신, 방별 초안, 공백 차단, 한글 조합 Enter, Shift+Enter, message.create payload, 성공 확인, 서버 오류 및 확인 timeout의 초안 유지, 스크롤 고정과 새 메시지 이동, 반응 토글, 네 가지 viewport, 검색 결과 없음, dialog/Esc/포커스 복귀, 재연결 중 작성, history/room 재시도, 방 전환 시 늦은 history 무시 및 이전 socket 종료. pageerror 없음.

재현하려면 Vite가 localhost:1420에서 실행 중이어야 한다. 테스트용 Playwright가 설치된 환경에서 `node scripts/verify-ui.mjs`를 실행한다. 별도 런타임 패키지를 사용할 경우 첫 인수로 Playwright의 `index.mjs` 절대 경로를 전달한다. 기본 브라우저는 설치된 Edge이며 `FLEX_TEST_BROWSER`로 Playwright channel을 지정할 수 있다. 제품 의존성에는 테스트 브라우저 패키지를 추가하지 않았다.

실제 로컬 Worker를 실행해 확인했으나 현재 로컬 D1에서 `no such table: rooms`가 반환되었다. 스키마/fixture를 변경하거나 가짜 API를 제품에 추가하지 않았다. 따라서 실제 D1 저장까지의 end-to-end 전송 검증과 `verify:worker`는 완료했다고 주장하지 않는다. 브라우저 검증과 PNG는 명시적인 테스트 fixture를 사용하며 실제 사내 대화를 의미하지 않는다.

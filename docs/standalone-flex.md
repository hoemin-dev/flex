# 독립형 Flex 구현 보고

## 1. 작업 전 구조
React/Vite 프런트, Cloudflare Worker, 방별 FlexRoomDO, D1이 구성되어 있었다. 기본 화면은 HUB 모양의 사이드카였고 FullFlex 대안 화면과 native host 코드가 별도로 있었다.

## 2. 기존 구현
GET /rooms, GET /rooms/:id/messages, GET /rooms/:id/ws, membership 검사, D1 메시지 저장 후 broadcast, sequence 순서 병합·ID 중복 제거, 재연결·방 변경 시 소켓 정리, IME 입력·초안 보관·스크롤 앵커가 있었다. read_cursors 테이블은 존재했지만 읽음 API/UI는 없었다.

## 3. 변경 파일
- src/StandaloneFlex.tsx: 독립 기본 화면, 목록 조회, unread 동기화, read 저장.
- src/standalone.css: 최대 360px 단일 화면과 메시지 스타일.
- src/App.tsx: 기본 화면 라우팅, 기존 화면 보존.
- src/config/devActors.ts: 개발 사용자 표시 정보.
- src/identity/currentActor.ts: 탭별 actor 선택과 공통 HTTP/WS identity.
- src/services/roomSocket.ts: 방 요약 타입과 읽음 API 호출.
- src/types/chat.ts: 방 종류 호환과 unread 설명.
- src/components/MessageTimeline.tsx: 내 메시지 클래스, Flex 대소문자 표기.
- worker/index.ts: 방별 요약·멤버·unread 조회, POST /rooms/:id/read.
- worker/identity.ts: 향후 resolver 교체 설명 정리.
- scripts/dev-room-fixtures.sql: 8개 방과 예제 메시지 확장.
- scripts/verify-standalone.mjs: 실제 Worker/D1/WS/read 통합 검증.
- scripts/verify-standalone-ui.mjs: 실제 Worker UI 및 브라우저 스트레스 검증.
- scripts/verify-ui.mjs: 기존 UI 검증 경로 명시, actor query가 포함된 소켓 URL 매칭 수정.
- README.md, docs/standalone-flex.md: 실행과 완료 보고.
빌드 산출물과 UI 캡처도 갱신된다. 스키마 migration 및 Cloudflare 운영 설정은 변경하지 않았다.

## 4. Mock actor
기존 데이터 호환을 위해 ID를 유지했다. me=이호민/연구개발, kim=김영업/영업, lee=박자재/자재, jang=최제조/제조현장, choi=최지원/지원, han=한임원/임원. 실제 인증은 추가하지 않았다. DEV 선택은 개발 빌드에서만 노출되고 탭별로 보관한다. 변경 시 재로드하며 이전 초안은 초기화한다.

## 5. Mock room
전체(all), 영업(sales), 연구개발(rnd), 지원(support), 자재(materials), 제조현장(factory), 임원 + 영업(exec-sales), 임원 + 연구개발(exec-rnd). 모두 GROUP이다. me는 모든 방에 접근하고 다른 사용자는 fixture membership에 따라 일부 방에만 접근한다. 기존 membership은 삭제하지 않았다. 각 방에 고정 ID 예제 메시지 1개를 추가하여 fixture 재실행 시 중복 생성하지 않는다.

## 6. Room list
아이콘 없는 Flex 제품명, 현재 사용자, DEV 선택, 검색, 방 이름, 마지막 메시지 미리보기, 시간, unread 배지와 totalUnread를 제공한다. 긴 이름과 미리보기는 생략 표시한다. 99 초과 배지는 99+로 표시한다. 방 목록 자체가 스크롤된다.

## 7. Chat
뒤로가기·방 이름·연결 상태·참여 인원·재연결, 기존 MessageTimeline과 Composer를 재사용한다. 내 메시지는 녹색 배경으로 구분한다. 메시지 영역만 스크롤하고 긴 문자열을 줄바꿈한다. 입력창은 하단에 유지한다. 기존 로컬 반응과 날짜/답장 표시를 보존했다.

## 8. WebSocket
기존 connectRoomSocket/useRoomChat/FlexRoomDO를 유지했다. 서버 저장이 성공한 메시지만 같은 방에 broadcast된다. history와 실시간 메시지는 ID로 병합된다. 연결 종료 후 자동 재시도 및 수동 재연결, 방을 나갈 때 소켓·타이머·history 요청 정리를 유지했다.

## 9. Unread/read cursor
GET /rooms가 actor membership과 read cursor를 기준으로 unreadCount를 계산하며 sender_id가 자신인 메시지는 제외한다. POST /rooms/:id/read는 membership, 해당 방 메시지 여부를 검사하고 sequence가 앞으로 이동할 때만 기존 cursor를 갱신한다. 현재 보이는 방의 history 로드·새 메시지 수신·탭 복귀 시 마지막 표시 메시지까지 읽음 저장한다. 저장 실패는 표시하고 재시도한다. 이미 시작한 읽음 저장은 뒤로가기로 취소하지 않는다. 다른 방 상태는 2초 polling으로 동기화한다. totalUnread는 내부 UI에서만 계산한다. mentionUnread는 새로 구현하지 않았다.

## 10. 테스트
- npm test: 기존 6개 파일, 17개 테스트 통과.
- npm run build, npm run build:worker: 통과.
- verify-standalone.mjs: 실제 로컬 D1/Worker에서 8개 방 조회, actor별 membership, history, 2 client broadcast, 다른 방 격리, close/reconnect, unread 증가·자기 메시지 제외, read 초기화·cursor 역행 방지·다른 방 메시지 거부 통과.
- verify-standalone-ui.mjs: 실제 전송·history·사용자 전환·읽음 저장·다른 방 unread polling 통과. 브라우저 fixture로 60개 메시지, 긴 방/사용자 이름, 큰 배지, 중복 이벤트, 재접속, 뒤로가기 시 소켓 종료 검증 통과.
- 기존 verify-ui.mjs: IME, 초안, 전송 오류/timeout, 스크롤, 반응, dialog focus, 기존 full/sidecar 화면 회귀 통과.
로컬 테스트 DB에는 검증용 메시지와 cursor가 남는다.

## 11. 360px UI 검증
320/360/400/1280px 너비, 360px 높이 검증 통과. 본체 최대 폭 360px, 가로 overflow 없음, 긴 URL 줄바꿈, 입력 버튼 viewport 내부 유지, 60개 메시지 및 긴 이름 스트레스 검증 통과. artifacts/flex-standalone에 실제 캡처를 저장하고 360px 방 목록/채팅 캡처를 시각 확인했다.

## 12. 남은 제한
다른 방 unread/요약은 실시간 push가 아니라 최대 약 2초 polling 지연이 있다. 기존 history API는 최근 100개만 제공하며 이전 기록 페이지네이션은 없다. 반응은 기존처럼 창 내부 상태다. DEV identity는 인증이 아니며 운영용 인증은 범위 밖이다. 배포, Git 명령, 원격 D1, 다른 Mona 시스템, native 창 제어 작업을 수행하지 않았다.

## 13. 실제 identity 교체 경계
프런트 src/identity/currentActor.ts의 resolveCurrentActor(), currentActorHeaders(), applyCurrentActorToSocketUrl()를 실제 identity·검증 credential 어댑터로 교체한다. Worker worker/identity.ts의 resolveCurrentActor(request, env)를 검증된 identity resolver로 교체한다. 사용자 표시 데이터는 src/config/devActors.ts와 StandaloneFlex의 people 매핑을 실제 프로필 공급자로 교체한다. 채팅 코어의 sender_id, room_members.user_id, read_cursors.user_id와 DO actor attachment는 동일 actorId 계약을 유지한다. 새 ID 체계를 선택한다면 별도 데이터 매핑 계획이 필요하다.

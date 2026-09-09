# Flex 독립 개발 기반 — 2026-09-09

## 작업 트리와 제품 방향

작업 시작 시 최신 커밋은 `5519dd3` (`flex chat`), 이전은 `a03ad0d`였다. Sidecar/FullFlex, Worker, migrations, scripts, docs 등은 이미 수정 또는 untracked 상태였다. 이번 작업은 이를 보존하고 identity 경계만 정리했다. 기본 `/`는 `[ FLEX ][ MONA-HUB BAR ]` Vertical Sidecar, `/?view=full`은 보존된 Full UI다. Always-on-top 호스트 완성은 이번 범위가 아니다.

## D1 계약

- 공식 DEV/TEST: `flextrans-api-d` Worker → `DB` → `flextrans-d`.
- database ID: `72756a7e-6e04-40b0-b2f4-f6ea03f11ba2` (`wrangler.jsonc` 유지).
- PROD: 향후 별도 Flex 전용 D1. Collaboration/Mono Space/GreenBox와 통합하지 않는다.
- 기존 migration/컬럼/개발 데이터는 변경하지 않았다. `room_members.user_id`, `messages.sender_id`를 EMP 이름으로 바꾸지 않는다.
- `read_cursors`는 **deprecated / unused candidate**다. Worker/UI 런타임에서 읽거나 쓰지 않으며 DROP도 하지 않았다. `Room.unreadCount`는 사용되지 않는 레거시 fixture 필드로 deprecated 주석을 추가했다. 읽음/미읽음 기능으로 연결하지 않는다.
- 로컬에 기존 migration과 fixture를 적용하여 코드 기대 스키마의 정상 동작을 확인했다. 원격 D1 스키마 및 배포 binding 실측은 이번에 수행하지 않았다. 위 연결은 저장소 설정 기준이다. 배포/원격 쓰기/새 DB 생성은 없었다.

## Identity 흐름과 교체 경계

1. `shared/devIdentity.ts`의 `DEFAULT_DEV_ACTOR_ID = "me"`가 유일한 현재 actor 기본값이다.
2. `src/identity/currentActor.ts`의 `resolveCurrentActor()`가 `{ id }`를 제공한다. UI의 프로필, 나 표시, 반응, 자동 스크롤, 전송 확인이 이 경계를 사용한다. 현재 provider는 세션 동안 고정되며 계정 전환 기능은 없다.
3. 같은 모듈의 `currentActorHeaders()`는 HTTP `X-Flex-Dev-User`를 만들고 `applyCurrentActorToSocketUrl()`은 브라우저 WS URL에 `devActor`를 넣는다. 이전 WS의 무시되던 userId 인수는 제거했다.
4. `worker/identity.ts`의 `resolveCurrentActor(request, env)`가 rooms/history/WS 모두를 해석한다. `DEV_ALLOW_MOCK_IDENTITY === "true"`일 때만 허용한다. 미전달 시 기존 `me` 동작을 유지하되 빈 값/잘못된 값/중복 쿼리/헤더와 쿼리 불일치는 거부한다.
5. Worker는 해당 actor의 fixture 접근 권한을 확인하고 내부 `X-Flex-User-Id`를 덮어쓴다. DO는 이를 socket attachment의 `userId`로 고정한다. `message.create` payload가 sender를 결정하지 않는다. D1 `sender_id`와 `message.created.senderId`는 attachment에서 나온다.

이것은 실제 인증이 아니다. 쿼리 ID는 개발용 공개 fixture 식별자이며 EMP 토큰을 URL에 넣는 계약이 아니다. 향후 verified EMP 세션 provider로 프런트/Worker 경계를 함께 교체하고 DEV 기본값을 비활성화한다. 현재 원격 Worker는 배포하지 않았으므로 새 쿼리 규약 적용 여부를 가정하지 않는다. 기본 `me`는 기존 배포와 호환되며 다른 actor 검증은 수정된 로컬 Worker에서 수행했다.

## 개발 identity가 남는 정확한 파일

| 파일 | 의미 |
| --- | --- |
| `shared/devIdentity.ts` | 현재 개발 actor 기본값 `me`, HTTP/WS 필드 이름 |
| `src/config/devIdentity.ts` | me/kim/lee/choi/jang/han의 UI 참여자 fixture |
| `src/providers/mockOrganization.ts` | 개발 프로필 이름/부서/presence; 실제 직원 매핑이 아님 |
| `src/data/mockRooms.ts` | 런타임에서 import하지 않는 이전 방/메시지/반응 fixture |
| `scripts/dev-room-fixtures.sql` | D1 개발 방 접근 데이터 |
| `scripts/verify-ui.mjs` | 브라우저 테스트의 개발 sender/echo |
| `scripts/verify-identity.mjs` | me/kim 및 없는 actor의 로컬 통합 검증 |
| `src/App.test.ts`, `src/lib/messages.test.ts`, `src/services/roomSocket.test.ts`, `worker/index.test.ts`, `worker/identity.test.ts` | 테스트 fixture 및 actor 기대값 |

`me-label` CSS class는 시각 스타일 이름이며 identity 결정 로직이 아니다. 소비 UI는 더 이상 `devIdentity.userId`를 직접 참조하지 않는다.

## Room과 향후 메시지

`room_members`는 actor가 볼 수 있는 방의 접근 assignment다. `/rooms`는 membership JOIN으로 목록을 제한하고 history/WS는 같은 테이블로 접근을 확인한다. 프런트 `devRoomMemberIds`는 표시용이며 접근 권한을 부여하지 않는다. Join/Leave/Invite/공개방 탐색은 추가하지 않았다. 향후 EMP 조직/부서/역할 assignment 정책을 별도로 연결한다.

Mention은 기존 텍스트 강조와 Sidecar `mentionEntry` 슬롯을 유지한다. 개인/부서 Mention, Mention Center, Task 승격은 향후 기능이다. `text/system/notice/live` 타입과 backend metadata/reply reference 저장·전송을 보존했다. GreenBox reference는 향후 메시지 metadata 계약으로 확장 가능하고 파일 저장은 GreenBox/R2의 책임이다. 현재 UI mapper는 metadata의 label/detail만 표시하므로 실제 외부 reference 도입 시 별도 계약과 렌더러가 필요하다. 새 외부 연동이나 backend는 구현하지 않았다.

## 검증

- `npm test`: 6개 파일, 17개 테스트 통과. 기존 dedupe/sequence/grouping/날짜/반응과 새 HTTP/WS actor 일치, 비활성/잘못된 identity 거부, 내부 헤더 덮어쓰기 검증.
- `npm run build`, `npm run build:worker`: 통과.
- `git diff --check`: 통과 (기존 CRLF 안내만 출력).
- 로컬 실제 Wrangler/D1/DO: `me`, `kim` room/history, 없는 actor 및 접근 불가 방 403, 브라우저 방식 WS 연결, payload sender 위조 무시, 4개 타입 저장, 두 클라이언트 동일 event, sequence 증가, history의 저장 결과 일치 통과.
- 로컬 `.wrangler/identity-verification`에 기존 방 fixture와 `[DEV identity verification]` 접두사 테스트 메시지 4개만 생성했다. 기존 기본 로컬 저장소와 원격 데이터는 변경하지 않았다.
- UI 소비 경로는 코드와 기존 mapper 테스트/빌드로 확인했다. 실제 브라우저와 D1을 함께 연결한 UI E2E 및 기존 `verify-ui.mjs`의 IME/레이아웃 회귀 테스트는 이번에 재실행하지 않았다. Composer, reconnect/cleanup 타이머, draft, grouping/date, dedupe/sequence, 좁은 폭 CSS는 기능 변경하지 않았다.

재현 (각 명령 순서대로, 서버는 별도 터미널):

```powershell
npx wrangler d1 migrations apply flextrans-d --local --persist-to .wrangler/identity-verification
npx wrangler d1 execute flextrans-d --local --persist-to .wrangler/identity-verification --file scripts/dev-room-fixtures.sql
npx wrangler dev --local --port 8791 --persist-to .wrangler/identity-verification
node scripts/verify-identity.mjs
```

기존 `verify-worker.mjs`는 환경변수에 따라 원격 쓰기가 가능하므로 원격 대상에 무심코 실행하지 않는다. 새 검증 스크립트는 localhost만 허용하며 실행당 테스트 메시지 4개를 남긴다.

## 이번 변경 파일

신규: `shared/devIdentity.ts`, `src/identity/currentActor.ts`, `worker/identity.ts`, `worker/identity.test.ts`, `src/services/roomSocket.test.ts`, `scripts/verify-identity.mjs`, 이 문서.

수정: `src/config/devIdentity.ts`, `src/services/roomSocket.ts`, `worker/index.ts`, `src/App.tsx`, `src/FullFlex.tsx`, `src/hooks/useRoomChat.ts`, `src/components/RoomNavigation.tsx`, `src/components/MembersPanel.tsx`, `src/components/MessageTimeline.tsx`, `src/types/chat.ts`, `README.md`. 빌드가 `tsconfig.app.tsbuildinfo`도 갱신했다. 기존 작업의 변경 파일 전체를 이번 변경으로 간주하지 않는다.

## EMP 준비 후 교체할 부분 (4개)

1. 프런트 currentActor provider/HTTP·WS credentials를 실제 EMP 세션으로 교체.
2. Worker actor resolver를 verified ACTIVE EMP 판별로 교체하고 DEV fallback 비활성화.
3. MockOrganization/참여자 fixture 및 room 접근 assignment를 실제 조직 정책에 연결.
4. 최종 EMP ID 계약에 맞춘 개발 데이터 전환과 별도 Flex production D1 준비를 독립 작업으로 수행. 기존 fixture를 실제 직원에게 임의 매핑하지 않는다.

# Flex

다른 Mona 시스템 없이 실행하는 360px 채팅 웹앱입니다. 기본 화면은 방 목록 → 채팅 → 뒤로가기 흐름이며 넓은 브라우저에서도 본체 최대 폭은 360px입니다.

## 로컬 실행

```sh
npm install
npm run db:migrate:local
npx wrangler d1 execute flextrans-d --local --file scripts/dev-room-fixtures.sql
npm run dev:worker
# 별도 터미널
npm run dev
```

브라우저: http://localhost:1420

프런트 API 주소는 `VITE_FLEX_API_URL`로 설정하며 기본값은 `http://localhost:8787`입니다. Worker / Durable Object / D1 설정과 기존 스키마를 유지합니다. fixture는 로컬 개발 DB에만 적용하세요.

방 목록의 DEV 선택기로 사용자를 변경합니다. 선택은 탭별 sessionStorage에 보관하고 화면을 다시 로드하여 소켓·초안·읽음 상태가 다른 사용자에게 섞이지 않게 합니다. 개발 서버에서만 선택기가 보입니다. 두 탭에서 각각 다른 사용자를 선택하여 실시간 채팅을 테스트할 수 있습니다.

## 검증

```sh
npm test
npm run build
npm run build:worker
node scripts/verify-standalone.mjs
node scripts/verify-standalone-ui.mjs /absolute/path/to/playwright/index.mjs
```

통합 검증은 실행 중인 로컬 Worker와 fixture가 필요하며, UI 검증은 Vite와 Playwright/Edge도 필요합니다. 통합 테스트는 로컬 DB에 검증 메시지와 read cursor를 남깁니다. UI 캡처는 `artifacts/flex-standalone`에 저장합니다.

현재 방은 WebSocket으로 즉시 수신하고, 방 목록의 마지막 메시지와 unread는 2초 간격으로 동기화합니다. 읽음 상태는 기존 D1 `read_cursors`에 저장합니다.

기존 화면 구현은 `?view=full`, `?view=sidecar`에 보존되어 있습니다. 독립 앱 기본 경로에서는 HUB UI나 native host를 실행하지 않습니다. 기존 host 설명은 [이전 사이드카 문서](docs/vertical-sidecar.md)에 있습니다.

구현 범위·검증 결과·identity 교체 경계는 [독립형 Flex 완료 보고](docs/standalone-flex.md)를 참조하세요.

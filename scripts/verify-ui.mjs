// Browser-only test doubles. Never used by the application or written to D1.
// Usage: node scripts/verify-ui.mjs [absolute path to playwright/index.mjs]
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.FLEX_TEST_BROWSER || 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'ko-KR' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir('artifacts/flex-sidecar', { recursive: true });
const rooms = [{ id: 'all', name: 'MONAS 전체' }, { id: 'rnd', name: '연구개발부' }, { id: 'sales', name: '영업부' }, { id: 'support', name: '지원' }, { id: 'factory', name: '제조현장' }];
const make = (id, sequence, body, extra = {}) => ({ id, sequence, body, roomId: 'all', senderId: 'kim', type: 'text', createdAt: '2026-09-09T00:10:00Z', replyToMessageId: null, metadata: null, editedAt: null, ...extra });
const history = [
 make('a', 1, '내일 오전에 검토할 자료를 정리해 두었습니다.', { createdAt: '2026-09-08T07:20:00Z' }),
 make('b', 2, '오늘의 업무 공유', { type: 'notice', metadata: { label: '팀 공지', detail: '오후 2시, 회의실 A에서 제품 리뷰를 진행합니다.\n참석 전에 변경 사항을 확인해 주세요.' } }),
 make('c', 3, '안녕하세요! 이번 주 고객 미팅 내용 공유드립니다.\n\n1. 납기 일정 확인\n2. 새 시안 검토\n3. 다음 주 테스트 범위 합의'),
 make('d', 4, '@박서윤 검토 후 의견 부탁드려요.', { createdAt: '2026-09-09T00:11:00Z' }),
 make('e', 5, '네, 확인했습니다. 오전 중으로 정리할게요.', { senderId: 'me', createdAt: '2026-09-09T00:12:00Z', replyToMessageId: 'd' }),
 make('f', 6, '자료도 함께 확인하겠습니다. 감사합니다!', { senderId: 'choi', createdAt: '2026-09-09T00:14:00Z' }),
 make('g', 7, '리뷰 준비가 완료되었습니다.', { type: 'live', metadata: { label: '업데이트', detail: '공유된 내용을 바탕으로 대화를 이어가세요.' } }),
 make('h', 8, '대화방 안내가 업데이트되었습니다.', { type: 'system' }),
];
let failRooms = false;
let failHistory = false;
let holdHistory = false;
let releaseHistory;
await page.route('http://localhost:8787/rooms', route => failRooms ? route.fulfill({ status: 503, body: '{}' }) : route.fulfill({ json: { rooms } }));
await page.route('**/rooms/*/messages', async route => {
 const room = new URL(route.request().url()).pathname.split('/')[2];
 if (holdHistory && room === 'all') await new Promise(resolve => { releaseHistory = resolve; });
 await route.fulfill(failHistory ? { status: 503, body: '{}' } : { json: { messages: room === 'all' ? history : [] } }).catch(() => {});
});
const sockets = [];
const sent = [];
let echo = true;
await page.routeWebSocket(/\/rooms\/[^/]+\/ws(?:\?.*)?$/, ws => {
 const record = { ws, room: new URL(ws.url()).pathname.split('/')[2], closed: false };
 sockets.push(record);
 ws.onClose(() => { record.closed = true; });
 ws.onMessage(raw => {
   const payload = JSON.parse(String(raw)); sent.push(payload);
   if (echo) ws.send(JSON.stringify({ event: 'message.created', message: make(`sent-${sent.length}`, 100 + sent.length, payload.body, { roomId: record.room, senderId: 'me' }) }));
 });
});
const wait = async (fn, arg) => page.waitForFunction(fn, arg);
const socket = () => sockets.filter(s => !s.closed).at(-1).ws;
const sendLive = (message) => socket().send(JSON.stringify({ event: 'message.created', message }));
const input = () => page.getByRole('textbox', { name: /메시지 작성/ });
const countMessages = () => page.locator('article.message').count();
const select = async name => {
 if (await page.getByRole('button', { name: '방 목록 및 검색 열기' }).isVisible()) await page.getByRole('button', { name: '방 목록 및 검색 열기' }).click();
 await page.getByRole('navigation', { name: '대화방', exact: true }).getByRole('button', { name, exact: true }).click();
 await page.getByRole('heading', { name, exact: true }).waitFor();
};
try {
 await page.goto('http://localhost:1420/?view=sidecar');
 await page.getByText('자료도 함께 확인하겠습니다. 감사합니다!', { exact: true }).waitFor();
 assert.equal(await page.locator('.day-divider').count(), 2);
 assert.equal(await page.locator('.message.grouped').count(), 1);
 assert.equal(await page.locator('mark').count(), 1);
 assert.equal(await page.locator('.reply-context').count(), 1);
 const initialCount = await countMessages();
 sendLive(history[2]); await page.waitForTimeout(80);
 assert.equal(await countMessages(), initialCount, 'duplicate socket events deduplicate');
 await page.getByRole('button', { name: '참여자 정보', exact: true }).click();
 await page.locator('.message-list').evaluate(el => { el.scrollTop = 0; });
 await page.screenshot({ path: 'artifacts/flex-sidecar/wide.png' });
 await page.getByRole('button', { name: '참여자 닫기' }).click();
 await input().fill('연구개발부 초안 아님');
 await select('연구개발부');
 await page.getByText('연구개발부의 대화를 시작하세요', { exact: true }).waitFor();
 assert.equal(await input().inputValue(), '');
 await input().fill('연구개발부 초안');
 await select('MONAS 전체');
 assert.equal(await input().inputValue(), '연구개발부 초안 아님');
 await input().fill('  ');
 assert.equal(await page.getByRole('button', { name: '메시지 보내기' }).isDisabled(), true);
 await input().fill('한글 조합');
 await input().dispatchEvent('compositionstart');
 await input().press('Enter');
 assert.equal(sent.length, 0, 'IME Enter must not send');
 await input().dispatchEvent('compositionend');
 await input().press('Shift+Enter');
 await input().press('End');
 await input().type('둘째 줄');
 await input().press('Enter');
 await wait(() => document.querySelector('textarea').value === '');
 assert.equal(sent.at(-1).type, 'message.create');
 assert.equal(sent.at(-1).messageType, 'text');
 assert.ok(sent.at(-1).body.includes('\n'));
 echo = false;
 await input().fill('전송 실패 시 보관');
 await input().press('Enter');
 await page.getByText('전송 확인 중…', { exact: true }).waitFor();
 socket().send(JSON.stringify({ event: 'error', error: { code: 'TEST', message: '테스트 전송 오류' } }));
 await page.getByText('테스트 전송 오류', { exact: true }).waitFor();
 assert.equal(await input().inputValue(), '전송 실패 시 보관');
 await input().fill('전송 응답 지연 시 보관');
 await input().press('Enter');
 await page.getByText('전송 확인 중…', { exact: true }).waitFor();
 await page.getByText(/전송 확인이 지연되고 있습니다/).waitFor({ timeout: 20000 });
 assert.equal(await input().inputValue(), '전송 응답 지연 시 보관');
 assert.equal(await page.getByRole('button', { name: '메시지 보내기' }).isEnabled(), true);
 echo = true;
 await input().fill('');
 // Long history exercises scroll anchoring, short text and unbroken content.
 for (let i = 0; i < 35; i++) sendLive(make(`long-${i}`, 200 + i, i === 10 ? '아주긴메시지'.repeat(100) : `확인 사항 ${i + 1}: 진행 내용을 공유합니다.`, { senderId: i % 2 ? 'lee' : 'kim' }));
 await wait(() => document.querySelectorAll('article.message').length > 35);
 await page.locator('.message-list').evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
 sendLive(make('new', 300, '읽는 동안 도착한 새 메시지'));
 await page.getByRole('button', { name: '새 메시지 · 아래로 이동' }).waitFor();
 assert.equal(await page.locator('.message-list').evaluate(el => el.scrollTop), 0);
 await page.getByRole('button', { name: '새 메시지 · 아래로 이동' }).click();
 // Emoji toggles are keyboard accessible, and local-only.
 await page.locator('article.message').last().hover();
 await page.locator('article.message').last().getByRole('button', { name: /좋아요/ }).click();
 assert.equal(await page.locator('article.message').last().getByRole('button', { name: /👍 반응 1개/ }).getAttribute('aria-pressed'), 'true');
 await page.locator('article.message').last().getByRole('button', { name: /👍 반응 1개/ }).click();
 assert.equal(await page.locator('article.message').last().locator('.reaction-row').count(), 0);
 for (const [width, height] of [[360,800],[400,800],[440,800],[500,800],[350,520],[1280,800]]) {
   await page.setViewportSize({ width, height });
   await page.waitForTimeout(80);
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no page overflow`);
   assert.ok(await page.locator('.message-list').evaluate(el => el.scrollWidth <= el.clientWidth), `${width}: no timeline overflow`);
   assert.ok(await page.getByRole('button', { name: '메시지 보내기' }).isVisible());
   await page.screenshot({ path: `artifacts/flex-sidecar/${width}x${height}.png` });
 }
 await page.setViewportSize({ width:440, height:800 });
 await page.getByRole('button', { name: '방 목록 및 검색 열기' }).waitFor();
 await select('MONAS 전체');
 await page.getByRole('button', { name: '방 목록 및 검색 열기' }).click();
 await page.getByRole('textbox', { name: '방 검색', exact: true }).fill('없는 방');
 await page.getByText('‘없는 방’ 검색 결과가 없습니다.').waitFor();
 await page.getByRole('button', { name: '검색어 지우기' }).click();
 await page.screenshot({ path: 'artifacts/flex-sidecar/mobile-navigation.png' });
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog').count(), 0);
 assert.equal(await page.getByRole('button', { name: '방 목록 및 검색 열기' }).evaluate(el => el === document.activeElement), true);
 await page.getByRole('button', { name: '참여자 정보', exact: true }).click();
 await page.getByRole('dialog', { name: '참여자 정보', exact: true }).waitFor();
 await page.screenshot({ path: 'artifacts/flex-sidecar/mobile-members.png' });
 await page.keyboard.press('Escape');
 socket().close({ code: 1011, reason: 'UI reconnect test' });
 await page.getByText('다시 연결 중', { exact: true }).waitFor();
 await input().fill('연결 중 작성한 초안');
 assert.equal(await page.getByRole('button', { name: '메시지 보내기' }).isDisabled(), true);
 await page.getByText('실시간 연결됨', { exact: true }).waitFor();
 assert.equal(await input().inputValue(), '연결 중 작성한 초안');
 failHistory = true;
 await select('연구개발부');
 await page.getByText('최근 대화를 불러오지 못했습니다. 다시 연결해 주세요.').waitFor();
 failHistory = false;
 await page.getByRole('button', { name: '다시 연결', exact: true }).click();
 await page.getByText('연구개발부의 대화를 시작하세요', { exact: true }).waitFor();
 // Changing rooms aborts a pending history fetch and closes the previous socket.
 holdHistory = true;
 await select('MONAS 전체');
 await page.waitForTimeout(100);
 const oldSocket = sockets.at(-1);
 await select('연구개발부');
 releaseHistory?.(); holdHistory = false;
 await page.getByText('연구개발부의 대화를 시작하세요', { exact: true }).waitFor();
 await page.waitForTimeout(100);
 assert.equal(await countMessages(), 0, 'stale history must not enter the new room');
 assert.equal(oldSocket.closed, true, 'previous socket closes on room change');
 failRooms = true;
 await page.reload();
 await page.getByText('대화방 목록에 연결할 수 없습니다.').waitFor();
 await page.screenshot({ path: 'artifacts/flex-sidecar/connection-error.png' });
 failRooms = false;
 await page.getByRole('button', { name: '방 목록 다시 불러오기' }).click();
 await page.getByRole('heading', { name: 'MONAS 전체', exact: true }).waitFor();
 await page.getByText('자료도 함께 확인하겠습니다. 감사합니다!', { exact: true }).waitFor();
 await page.screenshot({ path: 'artifacts/flex-sidecar/mobile.png' });
 await input().fill('접어도 유지되는 초안');
 await page.locator('.window-actions').getByRole('button', { name: 'Flex 접기', exact: true }).click();
 await page.waitForTimeout(250);
 assert.equal(await page.locator('.sidecar-clip').evaluate(el => el.getBoundingClientRect().width), 0);
 assert.equal(await page.getByRole('button', { name: 'Flex 펼치기' }).evaluate(el => el === document.activeElement), true);
 await page.screenshot({ path: 'artifacts/flex-sidecar/collapsed.png' });
 await page.getByRole('button', { name: 'Flex 펼치기' }).click();
 await page.waitForTimeout(250);
 assert.equal(await input().inputValue(), '접어도 유지되는 초안');
 assert.equal(await page.locator('.unread-count').count(), 0);
 await input().fill('');
 await page.locator('.message-list').evaluate(el => { el.scrollTop = 0; });
 await page.screenshot({ path: 'artifacts/flex-sidecar/sidecar-440.png' });
 for (const width of [360, 400, 440, 500]) {
   await page.setViewportSize({ width: width + 54, height: 800 });
   await page.locator('.hub-shell').evaluate((el, width) => el.style.setProperty('--flex-width', `${width}px`), width);
   await page.waitForTimeout(260);
   assert.equal(await page.locator('.sidecar-clip').evaluate(el => el.getBoundingClientRect().width), width);
   assert.equal(await page.locator('.sidecar').evaluate(el => el.getBoundingClientRect().width), width);
   assert.ok(await page.locator('.message-list').evaluate(el => el.scrollWidth <= el.clientWidth));
   assert.ok(await page.locator('.timeline-wrap').evaluate(el => el.clientHeight > 400));
   await page.screenshot({ path: `artifacts/flex-sidecar/panel-${width}.png` });
 }
 await page.setViewportSize({ width: 1280, height: 800 });
 await page.goto('http://localhost:1420/?view=full');
 await page.getByRole('navigation', { name: '대화방', exact: true }).waitFor();
 await page.getByRole('button', { name: '참여자 정보', exact: true }).click();
 assert.equal(await page.locator('.workspace.with-members').count(), 1);
 await page.screenshot({ path: 'artifacts/flex-sidecar/full-preserved.png' });
 assert.deepEqual(errors, []);
 console.log('PASS: UI fixtures, grouping/date/reply, dedupe, drafts, IME, multiline, send/error/timeout, scroll anchoring, reactions, 6 shell viewports + 4 panel widths, collapse/draft/focus, full variant, dialogs/focus, reconnect, API retry, room cleanup.');
} finally { await browser.close(); }

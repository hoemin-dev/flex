# Flex Vertical Sidecar

- Default `/`: one vertical communication panel attached to the left of a 52px Mona-HUB preview rail. Both share the host height. Default panel width is 440px, constrained by available space; `--flex-width` is the integration sizing point.
- `/?view=full`: preserved pre-change App in `src/FullFlex.tsx`. Original stylesheet and conversation/composer components remain shared. Room unread badges were removed from the shared navigation to respect the product policy in both variants.
- Hierarchy: compact Flex strip → current room/connection/participants → flexible scrolling conversation → composer. No permanent room or member columns.
- Room name opens a searchable temporary dialog. Participants opens a separate temporary dialog. Escape, focus containment/restoration, close controls, and backdrop dismissal use the existing native dialog.
- The panel folds toward the right rail with a width transition. Its component stays mounted, retaining conversation position and drafts. Collapsed content is inert; focus moves to the HUB control. Reduced motion disables the transition.
- `Sidecar` accepts an optional `mentionEntry` React node in its top controls. Nothing misleading is displayed before Mention Center exists. No unread counts or read receipts are shown.
- Timeline and Composer are reused unchanged: grouping, date separators, 14px body, sender/time, mention marks, reply references, local reactions, new-message jump; subtle notice/live cards and system messages; Enter/Shift+Enter/IME, multiline sizing, send confirmation, connection state, per-room drafts and focus.
- No attachment toolbar. GreenBox can later extend the existing composer; no storage or file backend added.
- This is a UI shell and representative HUB rail, not an implementation of the real Mona-HUB host. OS window resizing/animation and Tauri commands remain unchanged.

## Changed files in this task

- src/App.tsx — default sidecar and full variant selection, optional Mention entry.
- src/FullFlex.tsx — preserved original app component.
- src/sidecar.css — scoped panel/rail/dialog layout and fold animation.
- src/components/RoomNavigation.tsx — remove unread badge rendering.
- scripts/verify-ui.mjs — existing browser regression plus narrow panel sizes, collapse/draft/focus, full variant and separate screenshots.
- docs/vertical-sidecar.md — this report.
- artifacts/flex-sidecar/ — screenshots from browser fixtures; prior artifacts/flex-ui preserved.

## Backend boundaries

No changes to Worker, D1/migrations, room/history APIs, WebSocket services, message.create/message.created, ID deduplication, sequence ordering, reconnect or room cleanup hooks. No AC/DC, PER, EMP, HR, Task, Mention Center, GreenBox or unread backend implementation.

## Validation

Production build and 13 Vitest tests passed. Playwright uses browser-only room/history/WebSocket fixtures, not production data. Browser coverage includes grouping/date/mention/reply, dedupe, per-room drafts, IME/multiline, send/error/timeout, scroll anchoring/new message jump, local reactions, room/member dialogs and focus, reconnect, room/history API retry, stale-history cancellation and socket cleanup. Added shell widths 360/400/440/500/350/1280px, explicit panel widths 360/400/440/500px, collapse/reopen draft and keyboard focus, and preserved Full three-column rendering. Screenshots are generated in artifacts/flex-sidecar.

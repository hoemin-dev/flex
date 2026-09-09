-- Development-only organization fixture. Idempotent and non-destructive.
INSERT OR IGNORE INTO rooms (id, name, created_at, updated_at) VALUES
  ('all', 'MONAS', datetime('now'), datetime('now')),
  ('sales', '영업부', datetime('now'), datetime('now')),
  ('rnd', '연구개발부', datetime('now'), datetime('now')),
  ('support', '지원', datetime('now'), datetime('now')),
  ('factory', '제조현장', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO room_members (room_id, user_id, role, joined_at) VALUES
  ('all', 'me', 'member', datetime('now')),
  ('all', 'kim', 'member', datetime('now')),
  ('all', 'lee', 'member', datetime('now')),
  ('all', 'choi', 'member', datetime('now')),
  ('all', 'jang', 'member', datetime('now')),
  ('all', 'han', 'member', datetime('now')),
  ('sales', 'me', 'member', datetime('now')),
  ('sales', 'kim', 'member', datetime('now')),
  ('sales', 'han', 'member', datetime('now')),
  ('rnd', 'me', 'member', datetime('now')),
  ('rnd', 'lee', 'member', datetime('now')),
  ('rnd', 'choi', 'member', datetime('now')),
  ('support', 'me', 'member', datetime('now')),
  ('support', 'choi', 'member', datetime('now')),
  ('factory', 'me', 'member', datetime('now')),
  ('factory', 'jang', 'member', datetime('now'));

-- Standalone Flex fixtures. Existing messages and memberships are preserved.
UPDATE rooms SET name = '전체' WHERE id = 'all';
UPDATE rooms SET name = '영업' WHERE id = 'sales';
UPDATE rooms SET name = '연구개발' WHERE id = 'rnd';
INSERT OR IGNORE INTO rooms (id, name, created_at, updated_at) VALUES
 ('materials', '자재', datetime('now'), datetime('now')),
 ('exec-sales', '임원 + 영업', datetime('now'), datetime('now')),
 ('exec-rnd', '임원 + 연구개발', datetime('now'), datetime('now'));
INSERT OR IGNORE INTO room_members (room_id, user_id, role, joined_at) VALUES
 ('materials','me','member',datetime('now')), ('materials','lee','member',datetime('now')),
 ('exec-sales','me','member',datetime('now')), ('exec-sales','kim','member',datetime('now')), ('exec-sales','han','member',datetime('now')),
 ('exec-rnd','me','member',datetime('now')), ('exec-rnd','lee','member',datetime('now')), ('exec-rnd','han','member',datetime('now'));
INSERT OR IGNORE INTO messages (id,room_id,sender_id,type,body,created_at) VALUES ('fixture-all-01','all','kim','text','안녕하세요. 오늘 업무 공유는 이 방에서 진행해 주세요.','2026-09-09T00:00:00.000Z');
INSERT OR IGNORE INTO messages (id,room_id,sender_id,type,body,created_at) VALUES ('fixture-sales-01','sales','kim','text','이번 주 고객 미팅 일정을 정리했습니다.','2026-09-09T00:00:00.000Z');
INSERT OR IGNORE INTO messages (id,room_id,sender_id,type,body,created_at) VALUES ('fixture-rnd-01','rnd','lee','text','시제품 검토 결과를 오후에 공유하겠습니다.','2026-09-09T00:00:00.000Z');
INSERT OR IGNORE INTO messages (id,room_id,sender_id,type,body,created_at) VALUES ('fixture-support-01','support','choi','text','회의실 사용 일정을 확인해 주세요.','2026-09-09T00:00:00.000Z');
INSERT OR IGNORE INTO messages (id,room_id,sender_id,type,body,created_at) VALUES ('fixture-materials-01','materials','lee','text','자재 입고 일정 확인했습니다. 내일 오전에 도착합니다.','2026-09-09T00:00:00.000Z');
INSERT OR IGNORE INTO messages (id,room_id,sender_id,type,body,created_at) VALUES ('fixture-factory-01','factory','jang','text','오전 생산 점검을 마쳤습니다.','2026-09-09T00:00:00.000Z');
INSERT OR IGNORE INTO messages (id,room_id,sender_id,type,body,created_at) VALUES ('fixture-exec-sales-01','exec-sales','han','text','주요 고객사 미팅 내용을 함께 검토해 주세요.','2026-09-09T00:00:00.000Z');
INSERT OR IGNORE INTO messages (id,room_id,sender_id,type,body,created_at) VALUES ('fixture-exec-rnd-01','exec-rnd','han','text','개발 일정과 검토가 필요한 사항을 공유해 주세요.','2026-09-09T00:00:00.000Z');

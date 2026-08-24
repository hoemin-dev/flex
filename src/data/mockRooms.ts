import type { Room } from "../types/chat";

export const mockRooms: Room[] = [
  {
    id: "all", name: "MONAS 전체", memberIds: ["me", "kim", "lee", "choi", "jang", "han"], unreadCount: 3, canPost: true,
    messages: [
      { id: "m1", roomId: "all", kind: "notice", content: "오늘 15:00 설비 점검", createdAt: "09:10", metadata: { label: "공지", detail: "제조동 네트워크가 약 20분간 중단될 수 있습니다." } },
      { id: "m2", roomId: "all", authorId: "kim", kind: "text", content: "확인했습니다. 영업팀에도 공유할게요.", createdAt: "09:14", reactions: [{ emoji: "👍", personIds: ["me", "choi"] }] },
      { id: "m3", roomId: "all", authorId: "choi", kind: "text", content: "점검 전에 필요한 자료는 공용 드라이브에 올려두겠습니다.", createdAt: "09:18" },
      { id: "m4", roomId: "all", kind: "live", content: "프로젝트 상태 변경", createdAt: "10:02", metadata: { label: "LIVE", detail: "M-Flow 시범 운영 · 검토 중 → 진행" } },
      { id: "m5", roomId: "all", authorId: "lee", kind: "text", content: "@박서윤 그럼 내일 오전에 진행하죠.", createdAt: "10:06", reactions: [{ emoji: "🙌", personIds: ["me"] }] }
    ]
  },
  { id: "rnd", name: "연구개발부", memberIds: ["me", "lee", "choi"], unreadCount: 0, canPost: true, messages: [
    { id: "r1", roomId: "rnd", authorId: "lee", kind: "text", content: "오늘 리뷰는 2시부터 시작하겠습니다.", createdAt: "08:42" },
    { id: "r2", roomId: "rnd", authorId: "me", kind: "text", content: "네, 새 시안까지 준비해둘게요.", createdAt: "08:47" }
  ] },
  { id: "sales", name: "영업부", memberIds: ["kim", "han", "me"], unreadCount: 7, canPost: true, messages: [
    { id: "s1", roomId: "sales", authorId: "han", kind: "text", content: "이번 주 고객 미팅 일정 정리했습니다.", createdAt: "어제" }
  ] },
  { id: "support", name: "지원", memberIds: ["choi", "me"], unreadCount: 0, canPost: true, messages: [] },
  { id: "factory", name: "제조현장", memberIds: ["jang", "me"], unreadCount: 1, canPost: false, messages: [
    { id: "f1", roomId: "factory", kind: "notice", content: "안전 점검 안내", createdAt: "어제", metadata: { label: "공지", detail: "이 Room은 현장 관리자만 메시지를 작성할 수 있습니다." } }
  ] }
];

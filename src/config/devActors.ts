export type DevActor = { actorId: string; displayName: string; department: string };
// Keep existing IDs so local message ownership and read cursors remain valid.
export const DEV_ACTORS: DevActor[] = [
  { actorId: "me", displayName: "이호민", department: "연구개발" },
  { actorId: "kim", displayName: "김영업", department: "영업" },
  { actorId: "lee", displayName: "박자재", department: "자재" },
  { actorId: "jang", displayName: "최제조", department: "제조현장" },
  { actorId: "choi", displayName: "최지원", department: "지원" },
  { actorId: "han", displayName: "한임원", department: "임원" }
];

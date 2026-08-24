export type Presence = "online" | "away" | "offline";

export interface Organization { id: string; name: string }
export interface Person { id: string; name: string; title: string; departmentId: string; presence: Presence; avatarColor: string }
export interface Membership { personId: string; organizationId: string; departmentId: string }

export interface Reaction { emoji: string; personIds: string[] }
export interface Message {
  id: string;
  roomId: string;
  authorId?: string;
  kind: "text" | "notice" | "live";
  content: string;
  createdAt: string;
  reactions?: Reaction[];
  metadata?: { label?: string; detail?: string };
}

export interface Room {
  id: string;
  name: string;
  memberIds: string[];
  messages: Message[];
  unreadCount: number;
  canPost: boolean;
  metadata?: Record<string, string>;
}

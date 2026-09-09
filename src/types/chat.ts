export type Presence = "online" | "away" | "offline";

export interface Organization { id: string; name: string }
export interface Person { id: string; name: string; title: string; departmentId: string; presence: Presence; avatarColor: string }
export interface Membership { personId: string; organizationId: string; departmentId: string }

export interface Reaction { emoji: string; personIds: string[] }
export interface Message {
  id: string;
  sequence?: number;
  roomId: string;
  authorId?: string;
  kind: "text" | "system" | "notice" | "live";
  content: string;
  createdAt: string;
  replyToMessageId?: string | null;
  reactions?: Reaction[];
  metadata?: { label?: string; detail?: string };
}

export interface Room {
  id: string;
  name: string;
  memberIds: string[];
  messages: Message[];
  /** Actor-scoped count supplied by the room API. */
  unreadCount: number;
  canPost: boolean;
  type?: "room" | "department" | "direct" | "GROUP" | "DIRECT" | "SYSTEM";
  mentionCount?: number;
  metadata?: Record<string, string>;
}

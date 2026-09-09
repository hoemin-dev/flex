import type { Person } from "../types/chat";

export function Avatar({ person, presence = false }: { person?: Person; presence?: boolean }) {
  return <span className="avatar" style={{ background: person?.avatarColor ?? "#57616b" }} aria-hidden="true">
    {person?.name.slice(0, 1) ?? "?"}{presence && person && <i className={`presence ${person.presence}`} />}
  </span>;
}

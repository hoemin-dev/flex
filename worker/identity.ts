import { DEFAULT_DEV_ACTOR_ID, DEV_ACTOR_HEADER, DEV_ACTOR_QUERY } from "../shared/devIdentity";

// Replace with verified identity resolution later; never trust these DEV
// identifiers in production. Missing credentials retain legacy fixture behavior.
export function resolveCurrentActor(request: Request, env: { DEV_ALLOW_MOCK_IDENTITY?: string }): string | null {
  if (env.DEV_ALLOW_MOCK_IDENTITY !== "true") return null;
  const header = request.headers.get(DEV_ACTOR_HEADER)?.trim();
  const query = new URL(request.url).searchParams.getAll(DEV_ACTOR_QUERY).map(value => value.trim());
  if (query.length > 1 || (header !== undefined && query.length && header !== query[0])) return null;
  const candidate = header ?? query[0] ?? DEFAULT_DEV_ACTOR_ID;
  return /^[A-Za-z0-9][A-Za-z0-9_.@-]{0,127}$/.test(candidate) ? candidate : null;
}

import { DEFAULT_DEV_ACTOR_ID, DEV_ACTOR_HEADER, DEV_ACTOR_QUERY } from "../../shared/devIdentity";

export type ActorId = string;
export interface CurrentActor { id: ActorId }

// Session-stable development provider. Replace only this resolver and request
// credential adapters when a real identity provider is available.
export function resolveCurrentActor(): CurrentActor {
  let id = DEFAULT_DEV_ACTOR_ID;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    try { id = sessionStorage.getItem("flex.devActor") || id; } catch { /* unavailable storage */ }
  }
  return { id };
}

export function currentActorHeaders(): Record<string, string> {
  return { [DEV_ACTOR_HEADER]: resolveCurrentActor().id };
}

export function applyCurrentActorToSocketUrl(url: URL): void {
  // Browser WebSockets cannot set custom headers. DEV only, never an EMP token.
  url.searchParams.set(DEV_ACTOR_QUERY, resolveCurrentActor().id);
}

export function selectDevActor(id: string): void {
  if (!import.meta.env.DEV) return;
  sessionStorage.setItem("flex.devActor", id);
  window.location.reload();
}

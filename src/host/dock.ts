export interface WindowRect { x: number; y: number; width: number; height: number }
export interface FlexDockRect extends WindowRect {}

export function calculateDockRect(hub: WindowRect, flexWidth: number): FlexDockRect {
  return { x: hub.x - flexWidth, y: hub.y, width: flexWidth, height: hub.height };
}

async function invokeHost<T>(command: string, args?: Record<string, unknown>): Promise<T | undefined> {
  if (!("__TAURI_INTERNALS__" in window)) return undefined;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export const flexHost = {
  syncToHub: (hubRect: WindowRect, flexWidth = 440) => invokeHost<FlexDockRect>("sync_to_hub_rect", { hubRect, flexWidth }),
  collapse: () => invokeHost<void>("collapse_flex"),
  expand: (hubRect: WindowRect, flexWidth = 440) => invokeHost<FlexDockRect>("expand_flex", { hubRect, flexWidth })
};

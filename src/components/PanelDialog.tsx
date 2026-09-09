import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

export function PanelDialog({ label, side, close, children }: { label: string; side: "left" | "right"; close: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className={`panel-dialog ${side}`} aria-label={label} onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === dialog.current) close(); }}><div className="dialog-content">{children}</div></dialog>;
}

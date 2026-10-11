import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Renders children inside a placeholder in the sticky top navigation (AppNav), which mounts per page. */
export function NavSlot({ id, children }: { id: string; children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () => setEl((prev) => {
      const next = document.getElementById(id);
      return prev === next ? prev : next;
    });
    find();
    const obs = new MutationObserver(find);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [id]);
  return el ? createPortal(children, el) : null;
}

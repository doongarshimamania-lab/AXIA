"use client";

import { useEffect, useState } from "react";

/**
 * useScrollSpy — returns the id of the section currently in view.
 * Used by the nav to highlight the active link.
 */
export function useScrollSpy(ids: string[], offset = 120): string {
  const [active, setActive] = useState<string>(ids[0] ?? "");

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + offset;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) {
          current = id;
        }
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids, offset]);

  return active;
}

"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

/**
 * Sets the data-vertical attribute on <html> based on the active business vertical.
 * This drives CSS custom properties (--vertical-tint, --vertical-accent) defined in globals.css.
 */
export default function VerticalThemeProvider({ children }: { children: React.ReactNode }) {
  const vertical = useAppStore((s) => s.activeBusiness?.vertical);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (vertical) {
      htmlElement.setAttribute("data-vertical", vertical);
    } else {
      htmlElement.removeAttribute("data-vertical");
    }
    return () => {
      htmlElement.removeAttribute("data-vertical");
    };
  }, [vertical]);

  return <>{children}</>;
}

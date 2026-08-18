"use client";

import { useEffect } from "react";

/**
 * Sets a CSS variable `--keyboard-height` based on the visual viewport
 * so inline inputs (chat, moment caption) can compensate for the on-screen
 * keyboard without re-laying out the whole page.
 */
export function KeyboardViewport() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const updateKeyboardHeight = () => {
      const vv = window.visualViewport;
      const winHeight = window.innerHeight;
      // Visual viewport shrinks when the keyboard appears (iOS, Android Chrome)
      const kbHeight = Math.max(0, winHeight - vv.height);
      document.documentElement.style.setProperty(
        "--keyboard-height",
        `${kbHeight}px`,
      );
    };

    updateKeyboardHeight();
    window.visualViewport.addEventListener("resize", updateKeyboardHeight);
    window.visualViewport.addEventListener("scroll", updateKeyboardHeight);

    return () => {
      window.visualViewport.removeEventListener("resize", updateKeyboardHeight);
      window.visualViewport.removeEventListener("scroll", updateKeyboardHeight);
      document.documentElement.style.removeProperty("--keyboard-height");
    };
  }, []);

  return null;
}
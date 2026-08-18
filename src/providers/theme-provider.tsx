"use client";

import { useEffect } from "react";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Force dark mode by adding dark class to HTML element
    document.documentElement.classList.add("dark");
  }, []);

  return <>{children}</>;
};
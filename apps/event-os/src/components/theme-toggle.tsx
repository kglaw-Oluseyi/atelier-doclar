"use client";

import { useLayoutEffect, useRef } from "react";
import {
  applyTheme,
  nextTheme,
  persistTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@maison-doclar/design-system";

function currentTheme(): ThemePreference {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function syncButton(button: HTMLButtonElement | null, theme: ThemePreference): void {
  if (!button) return;
  button.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
  button.dataset.themeCurrent = theme;
}

export function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    syncButton(buttonRef.current, currentTheme());
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") return;
      const theme = media.matches ? "light" : "dark";
      applyTheme(theme, document.documentElement);
      syncButton(buttonRef.current, theme);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked="true"
      aria-label="Dark appearance"
      data-theme-toggle=""
      data-theme-current="dark"
      suppressHydrationWarning
      onClick={() => {
        const theme = nextTheme(currentTheme());
        applyTheme(theme, document.documentElement);
        persistTheme(theme, window.localStorage, (value) => {
          document.cookie = value;
        });
        syncButton(buttonRef.current, theme);
      }}
    >
      <span className="theme-toggle-dark" aria-hidden="true">
        Dark
      </span>
      <span className="theme-toggle-light" aria-hidden="true">
        Light
      </span>
    </button>
  );
}

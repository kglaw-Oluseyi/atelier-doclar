"use client";

import { useEffect } from "react";

const STORAGE_KEY = "md-event-os-discovery-section";

export function DiscoveryScrollRestore() {
  useEffect(() => {
    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const section = form.querySelector('input[name="section"]');
      if (!(section instanceof HTMLInputElement) || !/^[a-z][a-z0-9-]{0,80}$/.test(section.value)) return;
      sessionStorage.setItem(STORAGE_KEY, section.value);
    };
    document.addEventListener("submit", onSubmit, true);
    const section = sessionStorage.getItem(STORAGE_KEY);
    const timers: number[] = [];
    if (section) {
      const deadline = Date.now() + 2_000;
      const restore = () => {
        if (Date.now() > deadline) return;
        document.getElementById(section)?.scrollIntoView({ block: "center", behavior: "auto" });
        if (window.scrollY > 40) sessionStorage.removeItem(STORAGE_KEY);
      };
      restore();
      requestAnimationFrame(restore);
      for (const ms of [50, 150, 300, 600, 1_000]) timers.push(window.setTimeout(restore, ms));
    }
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);
  return null;
}

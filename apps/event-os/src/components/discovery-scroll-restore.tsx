"use client";

import { useEffect } from "react";

const STORAGE_KEY = "md-event-os-discovery-section";
const SECTION = /^[a-z][a-z0-9-]{0,80}$/;

function persistFromForm(form: HTMLFormElement) {
  const field = form.querySelector('input[name="section"]');
  if (!(field instanceof HTMLInputElement) || !SECTION.test(field.value)) return;
  sessionStorage.setItem(STORAGE_KEY, field.value);
}

function restoreSectionId(section?: string): string | undefined {
  if (section && SECTION.test(section)) return section;
  const fromQuery = new URLSearchParams(window.location.search).get("section");
  if (fromQuery && SECTION.test(fromQuery)) return fromQuery;
  const hash = window.location.hash.replace(/^#/, "");
  if (hash && SECTION.test(hash)) return hash;
  const saved = sessionStorage.getItem(STORAGE_KEY);
  return saved && SECTION.test(saved) ? saved : undefined;
}

function restoreNode(target: string): Element | null {
  if (target === "discovery-evidence") {
    return (
      document.querySelector('[data-testid="discovery-receipt-discovery-evidence"]') ??
      document.querySelector('[data-testid="discovery-evidence-list"]') ??
      document.getElementById(target)
    );
  }
  return document.getElementById(target);
}

function intersectsViewport(node: Element): boolean {
  const rect = node.getBoundingClientRect();
  return rect.bottom > 80 && rect.top < window.innerHeight - 40;
}

export function DiscoveryScrollRestore({ section }: { section?: string }) {
  useEffect(() => {
    const onSubmit = (event: Event) => {
      if (event.target instanceof HTMLFormElement) persistFromForm(event.target);
    };
    const onClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const form = target.closest("form");
      if (form instanceof HTMLFormElement) persistFromForm(form);
    };
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    const target = restoreSectionId(section);
    let interval = 0;
    let observer: MutationObserver | undefined;
    if (target) {
      const deadline = Date.now() + 12_000;
      const restore = () => {
        if (Date.now() > deadline) {
          window.clearInterval(interval);
          observer?.disconnect();
          return;
        }
        const node = restoreNode(target);
        if (!node) return;
        if (intersectsViewport(node)) {
          sessionStorage.removeItem(STORAGE_KEY);
          window.clearInterval(interval);
          observer?.disconnect();
          return;
        }
        const top = window.scrollY + node.getBoundingClientRect().top - 96;
        window.scrollTo(0, Math.max(0, top));
      };
      restore();
      interval = window.setInterval(restore, 100);
      observer = new MutationObserver(restore);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
      window.clearInterval(interval);
      observer?.disconnect();
    };
  }, [section]);
  return null;
}

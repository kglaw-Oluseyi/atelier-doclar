export const THEME_STORAGE_KEY = "md-theme";
export const THEME_COOKIE_NAME = "md-theme";
export const DEFAULT_THEME = "dark" as const;

export type ThemePreference = "light" | "dark";

export function resolveTheme(
  stored: string | null | undefined,
  prefersLight: boolean,
): ThemePreference {
  if (stored === "light" || stored === "dark") return stored;
  return prefersLight ? "light" : DEFAULT_THEME;
}

export function nextTheme(current: ThemePreference): ThemePreference {
  return current === "dark" ? "light" : "dark";
}

export function persistTheme(
  theme: ThemePreference,
  storage?: Pick<Storage, "setItem"> | null,
  cookieWriter?: (value: string) => void,
): void {
  storage?.setItem(THEME_STORAGE_KEY, theme);
  cookieWriter?.(`${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`);
}

export function readStoredTheme(storage?: Pick<Storage, "getItem"> | null, cookieHeader?: string): string | null {
  const fromStorage = storage?.getItem(THEME_STORAGE_KEY);
  if (fromStorage === "light" || fromStorage === "dark") return fromStorage;
  const match = cookieHeader?.match(/(?:^|;\s*)md-theme=(light|dark)/);
  return match?.[1] ?? null;
}

export function applyTheme(theme: ThemePreference, root: { setAttribute: (name: string, value: string) => void; style: { colorScheme: string } }): void {
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

export const THEME_INIT_SCRIPT = `(function(){try{var stored=null;try{stored=localStorage.getItem("${THEME_STORAGE_KEY}");}catch(e){}if(stored!=="light"&&stored!=="dark"){var match=document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=(light|dark)/);stored=match?match[1]:null;}var prefersLight=false;try{prefersLight=window.matchMedia("(prefers-color-scheme: light)").matches;}catch(e){}var theme=stored==="light"||stored==="dark"?stored:(prefersLight?"light":"${DEFAULT_THEME}");var root=document.documentElement;root.setAttribute("data-theme",theme);root.style.colorScheme=theme;}catch(e){document.documentElement.setAttribute("data-theme","${DEFAULT_THEME}");document.documentElement.style.colorScheme="${DEFAULT_THEME}";}})();`;

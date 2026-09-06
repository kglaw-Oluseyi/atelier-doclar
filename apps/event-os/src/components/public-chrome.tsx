import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

export function PublicChrome({ children }: { children?: ReactNode }) {
  return (
    <div className="public-chrome">
      <div className="public-toolbar">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}

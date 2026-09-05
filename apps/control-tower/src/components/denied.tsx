import { deniedPortfolio } from "@maison-doclar/programme-tower";
import { PortfolioPanel } from "./portfolio-view";
import { TowerShell } from "./shell";

export function DeniedPage() {
  return (
    <TowerShell>
      <h1>Access denied</h1>
      <PortfolioPanel view={deniedPortfolio()} />
    </TowerShell>
  );
}

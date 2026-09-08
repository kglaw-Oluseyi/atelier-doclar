import { allowedNextPhases, isScaffoldedPhase, type EventPhase } from "@maison-doclar/shared-platform";

export function phaseOptionLabel(phase: EventPhase): string {
  switch (phase) {
    case "DISCOVER":
      return "Discover";
    case "DESIGN":
      return "Design";
    case "PREPARE":
      return "Prepare";
    case "READY":
      return "Ready";
    case "LIVE":
      return "Live";
    case "CLOSE":
      return "Close";
    case "LEARN":
      return "Learn";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export function phaseTransitionOptions(current: EventPhase) {
  const next = allowedNextPhases(current);
  return {
    selectable: next.filter((phase) => !isScaffoldedPhase(phase)),
    unavailable: next.filter((phase) => isScaffoldedPhase(phase)),
  };
}

export function scaffoldedPhaseExplanation(phase: EventPhase): string {
  return `${phaseOptionLabel(phase)} remains scaffolded until a later authorised slice. It cannot be selected or submitted.`;
}

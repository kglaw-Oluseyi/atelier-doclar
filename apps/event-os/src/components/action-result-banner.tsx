import type { PresentedActionResult } from "../server/action-result";
import { ActionResultConsumer } from "./action-result-consumer";
import { AtelierOperationalState } from "./atelier-operational-state";
import { AtelierStateFocus } from "./atelier-state-focus";

export function ActionResultBanner({
  presented,
  reloadAction,
  reloadFields,
  focusOnSuccess = false,
}: {
  presented: PresentedActionResult;
  reloadAction?: (formData: FormData) => void | Promise<void>;
  reloadFields?: Record<string, string>;
  focusOnSuccess?: boolean;
}) {
  if (!presented.view) return <ActionResultConsumer enabled={false} />;
  return (
    <>
      <AtelierStateFocus
        targetId="operational-state"
        active={
          presented.view.kind === "conflict" ||
          presented.view.kind === "forbidden" ||
          presented.view.kind === "validation" ||
          (focusOnSuccess && presented.view.kind === "success")
        }
      />
      <AtelierStateFocus targetId="placeholder-validation" active={presented.view.kind === "validation"} />
      <AtelierOperationalState
        state={presented.view}
        reloadAction={presented.mutationLocked ? reloadAction : undefined}
        reloadFields={presented.mutationLocked ? reloadFields : undefined}
      />
      <ActionResultConsumer enabled={presented.shouldConsume} correlationId={presented.correlationId} />
    </>
  );
}

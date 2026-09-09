import type { PresentedActionResult } from "../server/action-result";
import { ActionResultConsumer } from "./action-result-consumer";
import { AtelierOperationalState } from "./atelier-operational-state";
import { AtelierStateFocus } from "./atelier-state-focus";

export function ActionResultBanner({
  presented,
  reloadAction,
  reloadFields,
  focusOnSuccess = true,
}: {
  presented: PresentedActionResult;
  reloadAction?: (formData: FormData) => void | Promise<void>;
  reloadFields?: Record<string, string>;
  focusOnSuccess?: boolean;
}) {
  if (!presented.view) return <ActionResultConsumer enabled={false} />;
  const focusTarget = presented.focusTargetId ?? "operational-state-title";
  const shouldFocus =
    presented.view.kind === "conflict" ||
    presented.view.kind === "forbidden" ||
    presented.view.kind === "validation" ||
    (focusOnSuccess && (presented.view.kind === "success" || Boolean(presented.application)));
  const onceKey = [presented.correlationId, presented.actionType, presented.subjectId, focusTarget]
    .filter(Boolean)
    .join(":");
  return (
    <>
      <AtelierStateFocus targetId={focusTarget} active={shouldFocus} onceKey={onceKey} />
      <AtelierStateFocus targetId="placeholder-validation" active={presented.view.kind === "validation"} onceKey={onceKey} />
      <AtelierOperationalState
        state={presented.view}
        reloadAction={presented.mutationLocked || presented.retryLock ? reloadAction : undefined}
        reloadFields={presented.mutationLocked || presented.retryLock ? reloadFields : undefined}
      />
      <ActionResultConsumer enabled={presented.shouldConsume} correlationId={presented.correlationId} />
    </>
  );
}

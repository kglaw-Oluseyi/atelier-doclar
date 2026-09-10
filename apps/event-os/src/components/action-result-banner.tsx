import type { PresentedActionResult } from "../server/action-result";
import { shouldRequestActionResultFocus } from "./action-result-focus";
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
  const shouldFocus = shouldRequestActionResultFocus({
    shouldConsume: presented.shouldConsume,
    viewKind: presented.view.kind,
    application: presented.application,
    focusOnSuccess,
  });
  const onceKey = [presented.correlationId, presented.actionType, presented.subjectId, focusTarget]
    .filter(Boolean)
    .join(":");
  return (
    <>
      <AtelierStateFocus
        targetId={focusTarget}
        active={shouldFocus}
        onceKey={onceKey}
        correlationId={presented.correlationId}
        consumeAfterFocus={shouldFocus}
      />
      <AtelierStateFocus
        targetId="placeholder-validation"
        active={presented.view.kind === "validation" && shouldFocus}
        onceKey={onceKey}
        correlationId={presented.correlationId}
      />
      <AtelierOperationalState
        state={presented.view}
        reloadAction={presented.mutationLocked || presented.retryLock ? reloadAction : undefined}
        reloadFields={presented.mutationLocked || presented.retryLock ? reloadFields : undefined}
      />
      <ActionResultConsumer enabled={presented.shouldConsume && !shouldFocus} correlationId={presented.correlationId} />
    </>
  );
}

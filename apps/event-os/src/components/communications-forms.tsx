import type { Campaign, ChannelPolicy, GuestSafeOccasion, MessageTemplate } from "@maison-doclar/shared-platform";
import {
  actOnCampaignAction,
  actOnTaskAction,
  approveTemplateAction,
  createCampaignAction,
  createTemplateVersionAction,
  decideCampaignAction,
  decideCorrectionAction,
  ingestInboundAction,
  prepareCommunicationsAction,
  publishChannelPolicyAction,
  publishOccasionAction,
  replyOnThreadAction,
  requestCampaignApprovalAction,
  upsertAudienceAction,
} from "../server/actions";

export function PrepareCommunicationsForm({ eventId }: { eventId: string }) {
  return (
    <form className="form" action={prepareCommunicationsAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <label>
        Reason
        <input name="reason" defaultValue="Prepare guest communications" required />
      </label>
      <button type="submit">Prepare communications</button>
    </form>
  );
}

export function PublishPolicyForm({ eventId, policy }: { eventId: string; policy: ChannelPolicy }) {
  return (
    <form className="form" action={publishChannelPolicyAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="expectedVersion" value={policy.version} />
      <label>
        Quiet hours start
        <input name="quietHoursStart" defaultValue={policy.quietHoursStart} />
      </label>
      <label>
        Quiet hours end
        <input name="quietHoursEnd" defaultValue={policy.quietHoursEnd} />
      </label>
      <label>
        Frequency cap per day
        <input name="frequencyCapPerDay" type="number" min={1} max={24} defaultValue={policy.frequencyCapPerDay} />
      </label>
      <label>
        Acknowledgement minutes
        <input name="acknowledgementMinutes" type="number" min={1} defaultValue={policy.acknowledgementMinutes ?? ""} />
      </label>
      <input type="hidden" name="sandboxDispatchEnabled" value="1" />
      <label className="check">
        <input type="checkbox" name="sandboxDispatchVisible" value="1" defaultChecked={policy.sandboxDispatchEnabled} disabled />
        Synthetic sandbox dispatch (required in this non-production slice)
      </label>
      <label>
        Reason
        <input name="reason" defaultValue="Publish channel policy" required />
      </label>
      <button type="submit">Publish channel policy</button>
    </form>
  );
}

export function PublishOccasionForm({ eventId, occasion }: { eventId: string; occasion: GuestSafeOccasion }) {
  return (
    <form className="form" action={publishOccasionAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="expectedVersion" value={occasion.version} />
      <label className="check">
        <input type="checkbox" name="verifyWhen" value="1" defaultChecked />
        Verify date and time for guests
      </label>
      <label className="check">
        <input type="checkbox" name="verifyVenue" value="1" defaultChecked={Boolean(occasion.venue)} />
        Verify guest-safe venue
      </label>
      <label>
        Arrival guidance
        <input name="arrival" defaultValue={occasion.arrival?.value ?? ""} />
      </label>
      <label>
        Dress guidance
        <input name="dress" defaultValue={occasion.dress?.value ?? ""} />
      </label>
      <label>
        Approved context
        <input name="context" defaultValue={occasion.context?.value ?? ""} />
      </label>
      <label>
        Reason
        <input name="reason" defaultValue="Publish guest-safe occasion" required />
      </label>
      <button type="submit">Publish guest-safe occasion</button>
    </form>
  );
}

export function TemplateEditorForm({
  eventId,
  templateId,
  subject,
  body,
}: {
  eventId: string;
  templateId: string;
  subject?: string;
  body: string;
}) {
  return (
    <form className="form" action={createTemplateVersionAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="templateId" value={templateId} />
      <label>
        Subject
        <input name="subject" defaultValue={subject ?? ""} />
      </label>
      <label>
        Body
        <textarea name="body" rows={8} defaultValue={body} required />
      </label>
      <label>
        Reason
        <input name="reason" defaultValue="Save template version" required />
      </label>
      <button type="submit">Save new version</button>
    </form>
  );
}

export function ApproveTemplateForm({
  eventId,
  templateId,
  templateVersionId,
  expectedVersion,
}: {
  eventId: string;
  templateId: string;
  templateVersionId: string;
  expectedVersion: number;
}) {
  return (
    <form className="form" action={approveTemplateAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="templateVersionId" value={templateVersionId} />
      <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
      <input type="hidden" name="reason" value="Approve template version" />
      <button type="submit">Approve template</button>
    </form>
  );
}

export function AudienceForm({ eventId }: { eventId: string }) {
  return (
    <form className="form" action={upsertAudienceAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <label>
        Audience name
        <input name="name" defaultValue="Active guests with email" required />
      </label>
      <p className="lede">This audience includes active guests who have an email. Seating predicates remain unavailable.</p>
      <label>
        Reason
        <input name="reason" defaultValue="Save audience" required />
      </label>
      <button type="submit">Save audience</button>
    </form>
  );
}

export function CampaignComposerForm({
  eventId,
  templates,
  audiences,
}: {
  eventId: string;
  templates: MessageTemplate[];
  audiences: Array<{ id: string; name: string }>;
}) {
  return (
    <form className="form" action={createCampaignAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <label>
        Campaign name
        <input name="name" required />
      </label>
      <label>
        Purpose
        <select name="purpose" defaultValue="INVITATION">
          <option value="INVITATION">Invitation</option>
          <option value="REMINDER">Reminder</option>
          <option value="PRE_EVENT_INFO">Pre-event information</option>
          <option value="CONCIERGE">Concierge</option>
        </select>
      </label>
      <label>
        Channel
        <select name="channel" defaultValue="EMAIL">
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      </label>
      <label>
        Template
        <select name="templateId" required>
          {templates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.key}
            </option>
          ))}
        </select>
      </label>
      <label>
        Audience
        <select name="audienceDefinitionId" required>
          {audiences.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" name="testOnly" value="1" defaultChecked />
        Test only — synthetic watermark, no guest-derived destination
      </label>
      <label>
        Reason
        <input name="reason" defaultValue="Compose campaign" required />
      </label>
      <button type="submit">Create campaign</button>
    </form>
  );
}

export function CampaignLifecycleForms({
  eventId,
  campaign,
  canApprove = false,
}: {
  eventId: string;
  campaign: Campaign;
  canApprove?: boolean;
}) {
  return (
    <div className="stack">
      {campaign.status === "DRAFT" ? (
        <form action={requestCampaignApprovalAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="campaignId" value={campaign.id} />
          <input type="hidden" name="expectedVersion" value={campaign.version} />
          <input type="hidden" name="reason" value="Request approval" />
          <button type="submit">Request approval</button>
        </form>
      ) : null}
      {campaign.status === "AWAITING_APPROVAL" && canApprove ? (
        <form className="form" action={decideCampaignAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="campaignId" value={campaign.id} />
          <input type="hidden" name="expectedVersion" value={campaign.version} />
          <label>
            Decision
            <select name="decision" defaultValue="APPROVED">
              <option value="APPROVED">Approve</option>
              <option value="REJECTED">Reject</option>
            </select>
          </label>
          <label>
            Comment
            <input name="comment" />
          </label>
          <label>
            Reason
            <input name="reason" defaultValue="Approve campaign" required />
          </label>
          <button type="submit">Record approval decision</button>
        </form>
      ) : null}
      {campaign.status === "APPROVED" || campaign.status === "SCHEDULED" ? (
        <form action={actOnCampaignAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="campaignId" value={campaign.id} />
          <input type="hidden" name="expectedVersion" value={campaign.version} />
          <input type="hidden" name="action" value="TEST_SEND" />
          <input type="hidden" name="reason" value="Synthetic test send" />
          <button type="submit">Send synthetic test</button>
        </form>
      ) : null}
      {campaign.status === "APPROVED" || campaign.status === "SCHEDULED" || campaign.status === "DISPATCHING" ? (
        <form action={actOnCampaignAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="campaignId" value={campaign.id} />
          <input type="hidden" name="expectedVersion" value={campaign.version} />
          <input type="hidden" name="action" value="RUN" />
          <input type="hidden" name="reason" value="Run synthetic dispatch" />
          <button type="submit">Run synthetic dispatch</button>
        </form>
      ) : null}
      {campaign.status !== "CANCELLED" && campaign.status !== "COMPLETED" ? (
        <form action={actOnCampaignAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="campaignId" value={campaign.id} />
          <input type="hidden" name="expectedVersion" value={campaign.version} />
          <input type="hidden" name="action" value="CANCEL" />
          <input type="hidden" name="reason" value="Cancel campaign" />
          <button type="submit" className="secondary">
            Cancel campaign
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function SyntheticInboundForm({ eventId }: { eventId: string }) {
  return (
    <form className="form" action={ingestInboundAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <label>
        Sender
        <input name="sender" required />
      </label>
      <label>
        Message
        <textarea name="body" rows={4} required />
      </label>
      <label>
        Attachment file name
        <input name="attachmentFileName" />
      </label>
      <label>
        Reason
        <input name="reason" defaultValue="Inject synthetic inbound" required />
      </label>
      <button type="submit">Receive synthetic inbound</button>
    </form>
  );
}

export function ReplyForm({ eventId, threadId }: { eventId: string; threadId: string }) {
  return (
    <form className="form" action={replyOnThreadAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="threadId" value={threadId} />
      <label>
        Guest-visible reply
        <textarea name="body" rows={4} required />
      </label>
      <label>
        Private note
        <input name="privateNote" />
      </label>
      <label>
        Reason
        <input name="reason" defaultValue="Concierge reply" required />
      </label>
      <button type="submit">Send reply</button>
    </form>
  );
}

export function TaskActionForm({
  eventId,
  taskId,
  expectedVersion,
  ownerPersonId,
}: {
  eventId: string;
  taskId: string;
  expectedVersion: number;
  ownerPersonId?: string;
}) {
  return (
    <form className="form" action={actOnTaskAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <input type="hidden" name="ownerPersonId" value={ownerPersonId ?? ""} />
      <label>
        Action
        <select name="action" defaultValue="ACKNOWLEDGE">
          <option value="ACKNOWLEDGE">Acknowledge</option>
          <option value="ASSIGN">Assign to me</option>
          <option value="ESCALATE">Escalate</option>
          <option value="RESOLVE">Resolve</option>
        </select>
      </label>
      <label>
        Resolution
        <input name="resolution" />
      </label>
      <label>
        Reason
        <input name="reason" defaultValue="Update follow-up task" required />
      </label>
      <button type="submit">Update task</button>
    </form>
  );
}

export function CorrectionDecisionForm({
  eventId,
  correctionId,
  expectedVersion,
}: {
  eventId: string;
  correctionId: string;
  expectedVersion: number;
}) {
  return (
    <form className="form" action={decideCorrectionAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="correctionId" value={correctionId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <label>
        Decision
        <select name="decision" defaultValue="REJECTED">
          <option value="APPROVED">Apply through guest amend</option>
          <option value="REJECTED">Reject</option>
        </select>
      </label>
      <label>
        Reason
        <input name="reason" defaultValue="Review contact correction" required />
      </label>
      <button type="submit">Record correction decision</button>
    </form>
  );
}

import {
  addressingStatusRequiresConfirm,
  renderFamiliarName,
  renderGuestSalutation,
  type OperationalGuest,
  type RenderedSalutation,
} from "@maison-doclar/shared-platform";

export interface GuestChoice {
  id: string;
  displayName: string;
  ageBand?: string;
}

export interface DirectoryNameLines {
  primary: string;
  formal: string;
  familiar: string;
  showFormal: boolean;
  formalKind: RenderedSalutation["kind"];
  inferredTitle: false;
}

export function directoryNameLines(guest: OperationalGuest): DirectoryNameLines {
  const familiar = renderFamiliarName(guest);
  const formal = renderGuestSalutation(guest);
  const confirmed = addressingStatusRequiresConfirm(guest.addressing?.addressingStatus);
  return {
    primary: familiar.text,
    formal: formal.text,
    familiar: familiar.text,
    showFormal: confirmed || formal.kind === "FORMAL",
    formalKind: formal.kind,
    inferredTitle: false,
  };
}

export function guestChoicesFromRecords(guests: OperationalGuest[]): GuestChoice[] {
  return guests.map((guest) => ({
    id: guest.id,
    displayName: renderFamiliarName(guest).text,
    ...(guest.ageBand ? { ageBand: guest.ageBand } : {}),
  }));
}

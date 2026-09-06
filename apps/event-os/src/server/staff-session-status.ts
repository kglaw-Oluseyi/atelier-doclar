const SIGN_IN_STATUS_COPY = {
  "signed-out": "You have been signed out.",
  "already-signed-out": "You are already signed out.",
  "session-required": "Sign in is required.",
  "session-expired": "Your session expired or was revoked. Sign in again. The last attempted change was not applied.",
  "session-ended": "Your session has ended. Sign in again.",
  expired: "Your session has expired. Sign in again.",
  revoked: "This session is no longer active. Sign in again.",
  malformed: "Sign in is required.",
  legacy: "This sign-in is no longer valid. Sign in again.",
  inactive: "Sign in failed. Check the named identity and access token.",
} as const;

export type SignInStatus = keyof typeof SIGN_IN_STATUS_COPY;

export function signInStatusMessage(status: string | undefined): string | undefined {
  if (!status) return undefined;
  return Object.hasOwn(SIGN_IN_STATUS_COPY, status) ? SIGN_IN_STATUS_COPY[status as SignInStatus] : undefined;
}

export function staffSessionRedirectStatus(details: readonly string[] | undefined): SignInStatus {
  const status = details?.[0];
  if (status && Object.hasOwn(SIGN_IN_STATUS_COPY, status)) {
    return status as SignInStatus;
  }
  return "session-ended";
}

import { LEGAL_UPDATED } from "@/lib/content/legal";

/**
 * Explicit consent to the terms and the privacy policy, recorded on the
 * Supabase user as metadata. One record per version of the documents: when
 * LEGAL_UPDATED changes, everyone is asked once more on their next visit.
 *
 * The record names the two things a person is agreeing to that a notice
 * alone would not cover: the terms of use, and storage and processing of
 * their data outside Kuwait (Supabase in India, processors mostly in the
 * United States). Whether Kuwaiti law requires that as consent rather than
 * as a notice is a question for a lawyer; recording it costs nothing and
 * answers either way.
 */
export const CONSENT_VERSION = LEGAL_UPDATED;

export interface ConsentRecord {
  version: string;
  accepted_at: string;
  terms: true;
  privacy: true;
  transfer_outside_kuwait: true;
}

export function newConsent(): ConsentRecord {
  return { version: CONSENT_VERSION, accepted_at: new Date().toISOString(), terms: true, privacy: true, transfer_outside_kuwait: true };
}

/** True when the user's metadata carries a consent record for the current version. */
export function hasCurrentConsent(metadata: Record<string, unknown> | null | undefined): boolean {
  const c = metadata?.consent as Partial<ConsentRecord> | undefined;
  return !!c && c.version === CONSENT_VERSION && c.terms === true && c.privacy === true && c.transfer_outside_kuwait === true;
}

import type { DictKey } from "@/lib/i18n/dictionary";
import type { PlaceholderKey } from "@/lib/config/placeholders";

/**
 * The privacy policy and terms of use, as shown on /privacy and /terms.
 *
 * Drafted 2026-09-21 from how the code actually behaves: what the sign-up form
 * asks for, what the schema stores, what row-level security lets each role
 * read, which services are called and with what. Nothing describes a feature
 * as live that is not. Neither document has been reviewed by a lawyer or
 * approved by the operator, and the pages say so above the text.
 *
 * The copy lives in the dictionary, both languages, like every other page.
 * This file is the structure: which keys make up each section, in order.
 * Three things only the owner can supply are written as {operator},
 * {contact} and {law} inside the copy and rendered as placeholders.
 */
export type LegalDoc = "privacy" | "terms";

export interface LegalSection {
  /** Anchor id, also the table-of-contents key. */
  id: string;
  title: DictKey;
  body: DictKey[];
}

export interface LegalDocument {
  path: `/${LegalDoc}`;
  title: DictKey;
  sub: DictKey;
  sections: LegalSection[];
}

/** Bump when either document changes. Shown at the top of both pages. */
export const LEGAL_UPDATED = "2026-09-21";

/** Tokens the copy may contain, and the placeholder each renders as. */
export const LEGAL_TOKENS = {
  operator: "LEGAL_OPERATOR",
  contact: "LEGAL_CONTACT",
  law: "GOVERNING_LAW",
} as const satisfies Record<string, PlaceholderKey>;

export type LegalToken = keyof typeof LEGAL_TOKENS;

export const LEGAL: Record<LegalDoc, LegalDocument> = {
  privacy: {
    path: "/privacy",
    title: "legal.privacy.title",
    sub: "legal.privacy.sub",
    sections: [
      { id: "who", title: "privacy.who.t", body: ["privacy.who.1", "privacy.who.2"] },
      { id: "collect", title: "privacy.collect.t", body: ["privacy.collect.1", "privacy.collect.2", "privacy.collect.3", "privacy.collect.4", "privacy.collect.5"] },
      { id: "why", title: "privacy.why.t", body: ["privacy.why.1", "privacy.why.2"] },
      { id: "share", title: "privacy.share.t", body: ["privacy.share.1", "privacy.share.2", "privacy.share.3"] },
      { id: "processors", title: "privacy.processors.t", body: ["privacy.processors.1", "privacy.processors.2", "privacy.processors.3"] },
      { id: "browser", title: "privacy.browser.t", body: ["privacy.browser.1", "privacy.browser.2"] },
      { id: "ai", title: "privacy.ai.t", body: ["privacy.ai.1", "privacy.ai.2"] },
      { id: "retain", title: "privacy.retain.t", body: ["privacy.retain.1"] },
      { id: "rights", title: "privacy.rights.t", body: ["privacy.rights.1", "privacy.rights.2"] },
      { id: "security", title: "privacy.security.t", body: ["privacy.security.1"] },
      { id: "children", title: "privacy.children.t", body: ["privacy.children.1"] },
      { id: "changes", title: "privacy.changes.t", body: ["privacy.changes.1"] },
      { id: "contact", title: "privacy.contact.t", body: ["privacy.contact.1"] },
    ],
  },
  terms: {
    path: "/terms",
    title: "legal.terms.title",
    sub: "legal.terms.sub",
    sections: [
      { id: "about", title: "terms.about.t", body: ["terms.about.1"] },
      { id: "account", title: "terms.account.t", body: ["terms.account.1", "terms.account.2"] },
      { id: "information", title: "terms.information.t", body: ["terms.information.1", "terms.information.2"] },
      { id: "ai", title: "terms.ai.t", body: ["terms.ai.1"] },
      { id: "marketplace", title: "terms.marketplace.t", body: ["terms.marketplace.1", "terms.marketplace.2"] },
      { id: "content", title: "terms.content.t", body: ["terms.content.1"] },
      { id: "acceptable", title: "terms.acceptable.t", body: ["terms.acceptable.1"] },
      { id: "availability", title: "terms.availability.t", body: ["terms.availability.1"] },
      { id: "liability", title: "terms.liability.t", body: ["terms.liability.1"] },
      { id: "termination", title: "terms.termination.t", body: ["terms.termination.1"] },
      { id: "law", title: "terms.law.t", body: ["terms.law.1"] },
      { id: "changes", title: "terms.changes.t", body: ["terms.changes.1"] },
      { id: "contact", title: "terms.contact.t", body: ["terms.contact.1"] },
    ],
  },
};

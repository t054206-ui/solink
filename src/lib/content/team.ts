/**
 * The Solink team, as shown on /about.
 *
 * Names were supplied by the owner on 2026-09-20 and are spelled as given.
 * Roles, biographies, photographs and links have NOT been supplied: those
 * fields are placeholders, rendered exactly as written so a missing detail is
 * unmistakable. Do not invent them.
 *
 * Social links render only when they are real URLs; leave them null otherwise.
 * A photo is a path under /public or a full URL; null keeps the placeholder
 * frame. The grid adapts to the head-count: one centred, two paired, three in a
 * row, four two-by-two then four across, more as a responsive grid.
 */
export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  photo: string | null;
  linkedin: string | null;
  github: string | null;
}

const member = (name: string): TeamMember => ({
  name,
  role: "[TEAM MEMBER ROLE]",
  bio: "[TEAM MEMBER SHORT BIO]",
  photo: null, // [TEAM MEMBER PHOTO]
  linkedin: null, // [LINKEDIN URL]
  github: null, // [GITHUB URL]
});

export const TEAM: TeamMember[] = [
  member("Maria Alshammari"),
  member("Noura Alsubaiei"),
  member("Zahraa Almumen"),
  member("Lolwah Alansari"),
];

/** True when any text field is still a bracketed placeholder. */
export const isPlaceholderText = (v: string) => v.startsWith("[");
export const isPlaceholderMember = (m: TeamMember) => [m.name, m.role, m.bio].some(isPlaceholderText);

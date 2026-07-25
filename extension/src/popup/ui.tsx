// Small UI primitives shared across popup views (Find & Replace, Bulk Edit).
// Kept dependency-free so both views stay visually consistent.

export type Banner = { kind: "info" | "ok" | "err"; text: string } | null;

/** Inline status banner. Renders nothing when `banner` is null. */
export function Message({ banner }: { banner: Banner }) {
  if (!banner) return null;
  return (
    <div class={`msg msg--${banner.kind}`} role="status" aria-live="polite">
      {banner.text}
    </div>
  );
}

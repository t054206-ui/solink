import type { Metadata } from "next";
import { PlacementGuide } from "./PlacementGuide";

/**
 * Which way to face a panel, before anyone has measured anything.
 *
 * The lightest step in the journey: it needs no profile, no account data and
 * no provider. The browser's own location permission is the only input, and
 * the recommendation is worked out in the browser from it. Site Analysis
 * (/analysis) is the next step for someone who wants the conditions at a
 * specific address, and this page links to it from every state, including
 * every way the permission prompt can fail.
 */

export const metadata: Metadata = {
  title: "Solar Placement Guide",
  description:
    "The direction and angle a fixed solar panel is usually set to where you are, worked out in your browser from your location. It is a direction, not a spot on your roof.",
};

export default function PlacementPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PlacementGuide
        heading={{
          eyebrow: "Plan",
          title: "Solar Placement Guide",
          description: "Which way a fixed panel should face where you are, and at what angle. Worked out from your location in this browser, with the reasoning and the limits of it shown alongside.",
        }}
      />
    </div>
  );
}

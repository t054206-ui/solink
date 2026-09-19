import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { NoSystemState } from "../../_operate/components/NoSystemState";
import { loadOperateContext } from "../../_operate/loadSystem";
import { ImageInspector } from "../_components/ImageInspector";

export const metadata = { title: "Panel inspection" };

export default async function InspectionPage() {
  const ctx = await loadOperateContext();
  if (!ctx.system) return <NoSystemState feature="Panel inspection" />;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <ImageInspector />
      </div>

      <aside className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader title="What this is" subtitle="A visual screening, not a diagnosis." />
          <CardBody className="space-y-3 text-[13.5px] leading-relaxed text-fg-secondary">
            <p>
              The AI looks at your photo and describes what it can see: dust or soiling, cracks,
              discoloration, marks, or anything that looks unusual. It reports how confident it is and
              how good the photo was.
            </p>
            <p>
              A photograph cannot measure output, temperature or electrical behaviour, so the AI is not
              allowed to tell you a component is definitely damaged. Anything concerning should be
              checked by a qualified technician.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Taking a useful photo" />
          <CardBody>
            <ul className="space-y-2 text-[13.5px] leading-relaxed text-fg-secondary">
              <li>Shoot in daylight, but avoid strong glare and reflections on the glass.</li>
              <li>Fill the frame with one or two panels rather than the whole roof.</li>
              <li>Hold the camera steady and straight on, not at a sharp angle.</li>
              <li>Take a second, closer photo of anything that looks wrong.</li>
              <li>Stay safe. Never climb on a roof to take a picture.</li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Found something?" subtitle="Turn the screening into a record." />
          <CardBody className="space-y-3">
            <p className="text-[13.5px] leading-relaxed text-fg-secondary">
              An incident report keeps the photo, the AI screening and whatever the technician
              found together permanently, and it stays visible from your Solar Passport.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button href="/incidents/new" size="sm">Create an incident report</Button>
              <Button href="/maintenance/book?kind=inspection" size="sm" variant="outline">Book an inspection</Button>
            </div>
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}

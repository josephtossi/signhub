import { Card } from "@signhub/ui";

const timeline = [
  { status: "Sent", at: "2026-03-06 09:10 UTC" },
  { status: "Viewed by signer", at: "2026-03-06 09:12 UTC" },
  { status: "Signed by signer", at: "2026-03-06 09:20 UTC" },
  { status: "Completed", at: "2026-03-06 09:21 UTC" }
];

export default function TrackingPage({ params }: { params: { envelopeId: string } }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tracking: {params.envelopeId}</h1>
      <Card>
        <h2 className="mb-3 text-lg font-medium">Activity timeline</h2>
        <ul className="space-y-2">
          {timeline.map((item) => (
            <li key={`${item.status}-${item.at}`} className="flex items-center justify-between rounded border p-3 text-sm">
              <span>{item.status}</span>
              <span className="text-slate-500">{item.at}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}


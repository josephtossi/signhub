import { EnvelopeTrackingPage } from "@/components/envelope-tracking-page";

export default function TrackingPage({ params }: { params: { envelopeId: string } }) {
  return <EnvelopeTrackingPage envelopeId={params?.envelopeId || ""} />;
}

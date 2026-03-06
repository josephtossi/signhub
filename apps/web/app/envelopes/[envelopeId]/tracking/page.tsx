import { redirect } from "next/navigation";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function EnvelopeTrackingRedirect({ params }: { params: { envelopeId: string } }) {
  if (!params?.envelopeId || !isUuid(params.envelopeId)) {
    redirect("/tracking?error=invalid-envelope-id");
  }
  redirect(`/tracking/${params.envelopeId}`);
}

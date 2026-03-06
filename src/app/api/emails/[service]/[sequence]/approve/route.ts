import { NextRequest, NextResponse } from "next/server";
import { approveEmail, type ServiceId, type SequenceId } from "@/lib/email-data";

const VALID_SERVICES = new Set(["ai-architect", "richbukae", "aihubkorea", "apppro"]);
const VALID_SEQUENCES = new Set(["d0", "d3", "d7"]);

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ service: string; sequence: string }> },
) {
  const { service, sequence } = await params;
  if (!VALID_SERVICES.has(service) || !VALID_SEQUENCES.has(sequence)) {
    return NextResponse.json({ error: "Invalid service or sequence" }, { status: 400 });
  }
  const email = approveEmail(service as ServiceId, sequence as SequenceId);
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(email);
}

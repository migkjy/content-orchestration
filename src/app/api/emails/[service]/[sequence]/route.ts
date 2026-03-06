import { NextRequest, NextResponse } from "next/server";
import { getEmail, updateEmail, type ServiceId, type SequenceId } from "@/lib/email-data";

const VALID_SERVICES = new Set(["ai-architect", "richbukae", "aihubkorea", "apppro"]);
const VALID_SEQUENCES = new Set(["d0", "d3", "d7"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ service: string; sequence: string }> },
) {
  const { service, sequence } = await params;
  if (!VALID_SERVICES.has(service) || !VALID_SEQUENCES.has(sequence)) {
    return NextResponse.json({ error: "Invalid service or sequence" }, { status: 400 });
  }
  const email = getEmail(service as ServiceId, sequence as SequenceId);
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(email);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ service: string; sequence: string }> },
) {
  const { service, sequence } = await params;
  if (!VALID_SERVICES.has(service) || !VALID_SEQUENCES.has(sequence)) {
    return NextResponse.json({ error: "Invalid service or sequence" }, { status: 400 });
  }

  const body = await req.json();
  const updates: { subject?: string; bodyHtml?: string } = {};
  if (typeof body.subject === "string") updates.subject = body.subject;
  if (typeof body.bodyHtml === "string") updates.bodyHtml = body.bodyHtml;

  const email = updateEmail(service as ServiceId, sequence as SequenceId, updates);
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(email);
}

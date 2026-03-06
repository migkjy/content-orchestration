import { NextResponse } from "next/server";
import { getAllEmails } from "@/lib/email-data";

export async function GET() {
  const emails = getAllEmails();
  return NextResponse.json(emails);
}

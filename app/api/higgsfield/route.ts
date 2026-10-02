import { NextResponse } from "next/server";

// TODO(session: higgsfield): POST starts a generation job, GET polls job status.
export async function POST() {
  return NextResponse.json({ error: "Higgsfield route not implemented yet" }, { status: 501 });
}

export async function GET() {
  return NextResponse.json({ error: "Higgsfield route not implemented yet" }, { status: 501 });
}

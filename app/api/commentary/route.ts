import { NextResponse } from "next/server";

// TODO(session: commentary): stream Groq completion using lib/groq.ts.
export async function POST() {
  return NextResponse.json({ error: "Commentary route not implemented yet" }, { status: 501 });
}

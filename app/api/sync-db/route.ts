import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: Returns current server database to seed empty IndexedDB
export async function GET() {
  try {
    const db = readDb();
    return NextResponse.json(db);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: Accepts full database JSON to sync from client back to server
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.team) {
      return NextResponse.json({ error: "Invalid database payload" }, { status: 400 });
    }
    writeDb(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

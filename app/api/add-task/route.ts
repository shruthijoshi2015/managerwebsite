import { NextRequest, NextResponse } from "next/server";
import { addTask } from "@/lib/actions";

export async function POST(req: NextRequest) {
  try {
    const { reporteeId, title, owner } = await req.json();
    if (!reporteeId || !title?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const fd = new FormData();
    fd.set("title", title.trim());
    if (owner) fd.set("owner", owner);
    await addTask(reporteeId, fd);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

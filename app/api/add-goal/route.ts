import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Goal } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const { reporteeId, title, status, description, dueDate, tags, subgoals } = await req.json();
    if (!reporteeId || !title?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = readDb();
    const memberIndex = db.team.findIndex(m => m.id === Number(reporteeId));
    if (memberIndex === -1) {
      return NextResponse.json({ error: "Reportee not found" }, { status: 404 });
    }

    const newGoal: Goal = {
      id: Date.now(),
      title: title.trim(),
      description: description || undefined,
      progress: 0,
      total: 100,
      status: status || 'on_track',
      dueDate: dueDate || undefined,
      tags: tags || undefined
    };

    db.team[memberIndex].goals.push(newGoal);

    if (subgoals && Array.isArray(subgoals)) {
      subgoals.forEach((sgTitle: string, i: number) => {
        db.team[memberIndex].goals.push({
          id: Date.now() + i + 1,
          title: sgTitle,
          progress: 0,
          total: 100,
          parentId: newGoal.id,
          status: 'on_track'
        });
      });
    }

    writeDb(db);
    revalidatePath("/goals");
    revalidatePath(`/team/${reporteeId}`);

    return NextResponse.json({ ok: true, goalId: newGoal.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

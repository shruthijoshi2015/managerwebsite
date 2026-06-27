import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Goal } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const { reporteeId, goalId, title, progress, status, dueDate, description, newReporteeId } = await req.json();
    if (!reporteeId || !goalId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = readDb();
    const oldMemberIndex = db.team.findIndex(m => m.id === Number(reporteeId));
    if (oldMemberIndex === -1) {
      return NextResponse.json({ error: "Reportee not found" }, { status: 404 });
    }

    const goalIndex = db.team[oldMemberIndex].goals.findIndex(g => g.id === Number(goalId));
    if (goalIndex === -1) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const targetReporteeId = newReporteeId ? Number(newReporteeId) : Number(reporteeId);
    let goal = db.team[oldMemberIndex].goals[goalIndex];

    // Update fields
    if (title !== undefined) goal.title = title.trim();
    if (progress !== undefined) {
      goal.progress = Number(progress);
      if (goal.progress === 100 && !goal.completedAt) {
        goal.completedAt = new Date().toISOString();
      } else if (goal.progress < 100) {
        goal.completedAt = undefined;
      }
    }
    if (status !== undefined) goal.status = status;
    if (dueDate !== undefined) goal.dueDate = dueDate;
    if (description !== undefined) goal.description = description;

    // If reportee changed, move goal (and its subgoals if any)
    if (targetReporteeId !== Number(reporteeId)) {
      const newMemberIndex = db.team.findIndex(m => m.id === targetReporteeId);
      if (newMemberIndex !== -1) {
        // Find subgoals
        const subgoals = db.team[oldMemberIndex].goals.filter(g => g.parentId === goal.id);
        // Remove from old
        db.team[oldMemberIndex].goals = db.team[oldMemberIndex].goals.filter(g => g.id !== goal.id && g.parentId !== goal.id);
        // Add to new
        db.team[newMemberIndex].goals.push(goal);
        subgoals.forEach(sg => db.team[newMemberIndex].goals.push(sg));
      }
    }

    writeDb(db);
    revalidatePath("/goals");
    revalidatePath(`/team/${reporteeId}`);
    if (targetReporteeId !== Number(reporteeId)) {
      revalidatePath(`/team/${targetReporteeId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

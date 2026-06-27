import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const { itemId, reporteeId, title, status, priority, timeframe, newReporteeId } = await req.json();
    if (!itemId || !reporteeId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = readDb();
    const oldMemberIndex = db.team.findIndex(m => m.id === Number(reporteeId));
    if (oldMemberIndex === -1) {
      return NextResponse.json({ error: "Reportee not found" }, { status: 404 });
    }

    const targetReporteeId = newReporteeId ? Number(newReporteeId) : Number(reporteeId);
    const newMemberIndex = db.team.findIndex(m => m.id === targetReporteeId);

    if (String(itemId).startsWith("ai-")) {
      // Format: ai-{noteId}-{index}
      const parts = String(itemId).split("-");
      const noteId = Number(parts[1]);
      const fUpIndex = Number(parts[2]);

      const note = db.team[oldMemberIndex].notes.find(n => n.id === noteId);
      if (note && note.aiSummary && note.aiSummary.followUps && note.aiSummary.followUps[fUpIndex]) {
        const fUp = note.aiSummary.followUps[fUpIndex];
        if (title !== undefined) fUp.task = title.trim();
        if (timeframe !== undefined) fUp.timeframe = timeframe;
        (fUp as any).status = status;
        (fUp as any).priority = priority;

        if (targetReporteeId !== Number(reporteeId) && newMemberIndex !== -1) {
          // Remove from old note followups and convert into a manual task for new reportee
          note.aiSummary.followUps.splice(fUpIndex, 1);
          db.team[newMemberIndex].tasks.push({
            id: Date.now(),
            title: fUp.task,
            done: status === "resolved",
            status: status || "pending",
            priority: priority || "P2",
            timeframe: fUp.timeframe
          });
        }
      }
    } else {
      const taskId = Number(String(itemId).replace("manual-", ""));
      const taskIndex = db.team[oldMemberIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        const task = db.team[oldMemberIndex].tasks[taskIndex];
        if (title !== undefined) task.title = title.trim();
        if (status !== undefined) {
          task.status = status;
          task.done = status === "resolved";
        }
        if (priority !== undefined) task.priority = priority;
        if (timeframe !== undefined) task.timeframe = timeframe;

        if (targetReporteeId !== Number(reporteeId) && newMemberIndex !== -1) {
          db.team[oldMemberIndex].tasks.splice(taskIndex, 1);
          db.team[newMemberIndex].tasks.push(task);
        }
      }
    }

    writeDb(db);
    revalidatePath("/actions");
    revalidatePath(`/team/${reporteeId}`);
    if (targetReporteeId !== Number(reporteeId)) {
      revalidatePath(`/team/${targetReporteeId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

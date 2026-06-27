import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { reporteeId } = await req.json();
    if (!reporteeId) {
      return NextResponse.json({ error: "reporteeId is required" }, { status: 400 });
    }

    // Read full reportee data
    const db = readDb();
    const reportee = db.team.find((m) => m.id === reporteeId);
    if (!reportee) {
      return NextResponse.json({ error: "Reportee not found" }, { status: 404 });
    }

    // Build context from real data
    const activeGoals = reportee.goals.filter((g) => !g.completedAt && !g.parentId);
    const completedGoals = reportee.goals.filter((g) => g.completedAt && !g.parentId);
    const atRiskGoals = activeGoals.filter((g) => g.status === "at_risk" || g.status === "off_track");
    const staleGoals = activeGoals.filter((g) => {
      // Goals with < 30% progress and no recent completion on subgoals
      return g.progress < 30 && !g.completedAt;
    });

    const activeTasks = reportee.tasks.filter((t) => !t.done);
    const completedTasks = reportee.tasks.filter((t) => t.done);
    const managerTasks = activeTasks.filter((t) => t.owner === "manager");

    const recentNotes = reportee.notes.slice(0, 5);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      // Return intelligent fallback based on real data
      return NextResponse.json({
        brief: buildFallbackBrief(reportee, activeGoals, completedGoals, atRiskGoals, staleGoals, activeTasks, completedTasks, managerTasks, recentNotes),
      });
    }

    // Build rich prompt
    const prompt = buildPrompt(reportee, activeGoals, completedGoals, atRiskGoals, staleGoals, activeTasks, completedTasks, managerTasks, recentNotes);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback if AI doesn't return valid JSON
      return NextResponse.json({
        brief: buildFallbackBrief(reportee, activeGoals, completedGoals, atRiskGoals, staleGoals, activeTasks, completedTasks, managerTasks, recentNotes),
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ brief: parsed });
  } catch (error: any) {
    console.error("AI Prep error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({ error: "AI Quota Exceeded. You have hit the Google AI Studio free tier rate limit. Please wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to generate prep brief" }, { status: 500 });
  }
}

function buildPrompt(
  reportee: any,
  activeGoals: any[],
  completedGoals: any[],
  atRiskGoals: any[],
  staleGoals: any[],
  activeTasks: any[],
  completedTasks: any[],
  managerTasks: any[],
  recentNotes: any[]
) {
  return `You are an expert executive coach and meeting preparation assistant. A manager is about to have a 1:1 meeting with their direct report. Generate a comprehensive, actionable prep brief.

## REPORTEE PROFILE
- Name: ${reportee.name}
- Role: ${reportee.role}
- Department: ${reportee.department || "Not specified"}
- Seniority: ${reportee.seniority || "Not specified"}
- Career Track: ${reportee.careerTrack || "Not specified"}
- Performance Rating: ${reportee.performance || "Not specified"}
- Check-in Frequency: ${reportee.checkInFreq}

## ACTIVE GOALS (${activeGoals.length})
${activeGoals.map((g) => `- "${g.title}" — ${g.progress}% complete${g.status ? `, status: ${g.status}` : ""}${g.description ? ` (${g.description})` : ""}`).join("\n") || "No active goals"}

## AT RISK / OFF TRACK GOALS
${atRiskGoals.map((g) => `- "${g.title}" — ${g.progress}% complete, status: ${g.status}`).join("\n") || "None"}

## STALE GOALS (low progress, no recent updates)
${staleGoals.map((g) => `- "${g.title}" — only ${g.progress}% progress`).join("\n") || "None"}

## RECENTLY COMPLETED GOALS
${completedGoals.slice(0, 3).map((g) => `- "${g.title}" — completed ${g.completedAt ? new Date(g.completedAt).toLocaleDateString() : "recently"}`).join("\n") || "None recently"}

## ACTIVE ACTION ITEMS (${activeTasks.length})
${activeTasks.map((t) => `- "${t.title}"${t.owner === "manager" ? " [MANAGER'S ACTION]" : ""}`).join("\n") || "No active tasks"}

## COMPLETED ACTION ITEMS (${completedTasks.length})
${completedTasks.slice(0, 5).map((t) => `- "${t.title}" — completed ${t.completedAt ? new Date(t.completedAt).toLocaleDateString() : "recently"}${t.owner === "manager" ? " [MANAGER'S ACTION]" : ""}`).join("\n") || "None recently"}

## MY PENDING ACTIONS (Manager's own action items for this person)
${managerTasks.map((t) => `- "${t.title}"`).join("\n") || "None"}

## RECENT MEETING NOTES (most recent first)
${recentNotes.map((n) => `### ${n.type} — ${new Date(n.date).toLocaleDateString()}\n${n.content.substring(0, 500)}`).join("\n\n") || "No previous notes"}

---

Generate a JSON object with this EXACT structure (no markdown, just raw JSON):
{
  "snapshot": {
    "summary": "A 1-2 sentence executive summary of where this person stands right now",
    "goalsMoved": ["One line per goal that had meaningful progress since context suggests"],
    "tasksCompleted": "X tasks completed recently",
    "keyWin": "One specific accomplishment to celebrate, or null if none"
  },
  "risks": [
    { "title": "Short risk title", "detail": "Why this matters and what to ask about it", "severity": "high|medium|low" }
  ],
  "unresolvedTopics": [
    "Topic from past notes that seems unresolved or needs follow-up"
  ],
  "suggestedQuestions": [
    "Specific, thoughtful question tailored to this person's situation"
  ],
  "talkingPoints": [
    "A concrete agenda item with context"
  ],
  "managerActions": [
    "Reminder of what YOU (the manager) promised or need to do"
  ]
}

Rules:
- Be specific to THIS person — reference their actual goals, tasks, and notes by name
- suggestedQuestions should be empathetic and open-ended, not interrogative
- risks should be genuinely useful, not generic filler
- If there's not enough data for a section, return a short array with 1 helpful generic item
- Return ONLY valid JSON, no markdown fences, no explanation`;
}

function buildFallbackBrief(
  reportee: any,
  activeGoals: any[],
  completedGoals: any[],
  atRiskGoals: any[],
  staleGoals: any[],
  activeTasks: any[],
  completedTasks: any[],
  managerTasks: any[],
  recentNotes: any[]
) {
  // Build a data-driven brief from what we actually know
  const goalsMoved = activeGoals
    .filter((g) => g.progress > 0)
    .map((g) => `"${g.title}" is at ${g.progress}%`);

  const risks = [
    ...atRiskGoals.map((g) => ({
      title: `"${g.title}" is ${g.status === "off_track" ? "off track" : "at risk"}`,
      detail: `Currently at ${g.progress}% progress. Discuss blockers and whether the timeline needs adjusting.`,
      severity: g.status === "off_track" ? "high" : "medium",
    })),
    ...staleGoals.map((g) => ({
      title: `"${g.title}" has low progress`,
      detail: `Only ${g.progress}% complete with no recent movement. Check if this is still a priority or needs re-scoping.`,
      severity: "medium" as const,
    })),
    ...managerTasks.map((t) => ({
      title: `You have a pending action: "${t.title}"`,
      detail: `This is your action item — make sure to update ${reportee.name} on the status.`,
      severity: "low" as const,
    })),
  ];

  if (risks.length === 0) {
    risks.push({
      title: "No immediate risks detected",
      detail: `${reportee.name}'s goals and tasks appear to be on track. Use this time for growth conversations.`,
      severity: "low",
    });
  }

  const unresolvedTopics: string[] = [];
  if (recentNotes.length > 0) {
    const latestNote = recentNotes[0];
    if (latestNote.content.includes("blocker") || latestNote.content.includes("Blocker")) {
      unresolvedTopics.push("A blocker was mentioned in the last check-in — verify if it's resolved.");
    }
    if (latestNote.content.includes("career") || latestNote.content.includes("Career")) {
      unresolvedTopics.push("Career growth was discussed — follow up on any actions taken.");
    }
    if (latestNote.content.includes("improvement") || latestNote.content.includes("Improvement")) {
      unresolvedTopics.push("Areas of improvement were noted — check on progress.");
    }
  }
  if (unresolvedTopics.length === 0) {
    unresolvedTopics.push("Review any open threads from your last conversation.");
  }

  const suggestedQuestions = [
    `How are you feeling about your workload right now?`,
    activeGoals.length > 0
      ? `What's your biggest blocker on "${activeGoals[0].title}"?`
      : `What would you like to focus on this quarter?`,
    `Is there anything I can do to unblock you this week?`,
    reportee.careerTrack
      ? `How do you feel about your growth on the ${reportee.careerTrack} track?`
      : `What skills are you most excited to develop next?`,
  ];

  const talkingPoints = [
    activeGoals.length > 0
      ? `Review progress on ${activeGoals.length} active goal${activeGoals.length > 1 ? "s" : ""}`
      : "Discuss setting new goals for the quarter",
    activeTasks.length > 0
      ? `Check in on ${activeTasks.length} open action item${activeTasks.length > 1 ? "s" : ""}`
      : "No open action items — consider setting new ones",
    completedTasks.length > 0
      ? `Acknowledge ${completedTasks.length} completed task${completedTasks.length > 1 ? "s" : ""} since last check-in`
      : "Discuss task prioritization",
  ];

  const managerActions = managerTasks.length > 0
    ? managerTasks.map((t) => `Complete: "${t.title}"`)
    : ["No pending actions from your side — good to go!"];

  return {
    snapshot: {
      summary: `${reportee.name} (${reportee.role || "Team member"}) has ${activeGoals.length} active goal${activeGoals.length !== 1 ? "s" : ""} and ${activeTasks.length} open action item${activeTasks.length !== 1 ? "s" : ""}. ${completedTasks.length} task${completedTasks.length !== 1 ? "s" : ""} completed recently.`,
      goalsMoved,
      tasksCompleted: `${completedTasks.length} task${completedTasks.length !== 1 ? "s" : ""} completed`,
      keyWin: completedGoals.length > 0
        ? `Completed goal: "${completedGoals[0].title}"`
        : completedTasks.length > 0
          ? `Finished ${completedTasks.length} action items`
          : null,
    },
    risks,
    unresolvedTopics,
    suggestedQuestions,
    talkingPoints,
    managerActions,
  };
}

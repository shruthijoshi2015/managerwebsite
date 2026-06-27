import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { goalId, reporteeId } = await req.json();
    if (!goalId || !reporteeId) {
      return NextResponse.json({ error: "goalId and reporteeId are required" }, { status: 400 });
    }

    const db = readDb();
    const reportee = db.team.find((m) => m.id === reporteeId);
    if (!reportee) {
      return NextResponse.json({ error: "Reportee not found" }, { status: 404 });
    }

    const goal = reportee.goals.find((g) => g.id === goalId);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const subgoals = reportee.goals.filter((g) => g.parentId === goal.id);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      // Return intelligent fallback
      return NextResponse.json(buildFallbackStatus(goal, subgoals));
    }

    const prompt = `You are an expert project manager and executive coach. Analyze the given goal and suggest a realistic status.

## GOAL CONTEXT
- Title: ${goal.title}
- Description: ${goal.description || "None"}
- Current Progress: ${goal.progress}%
- Measurement Type: ${goal.measurementType || "percent"}
- Due Date: ${goal.dueDate || "Not set"}
- Priority: ${goal.priority || "Not set"}
- Current Status: ${goal.status || "None (Needs status)"}

## SUBGOALS
${subgoals.length > 0 ? subgoals.map(s => `- "${s.title}" (${s.progress}% complete)`).join("\n") : "No subgoals"}

## RULES
1. Provide a suggestedStatus which must be exactly one of: "on_track", "at_risk", "off_track", "achieved"
2. Provide a 1-sentence rationale for why you chose this status.
3. Determine if the deadline is unrealistic based on current progress. For example, if progress is <30% and due date is very soon, it's unrealistic.
4. If unrealisticDeadline is true, provide a short deadlineWarning.

Return ONLY a JSON object exactly matching this structure:
{
  "suggestedStatus": "at_risk",
  "rationale": "Progress has stalled at 20% despite the upcoming due date.",
  "unrealisticDeadline": true,
  "deadlineWarning": "With only 2 weeks left and 20% progress, consider extending the due date."
}
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(buildFallbackStatus(goal, subgoals));
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("AI Goal Status error:", error);
    return NextResponse.json({ error: "Failed to analyze goal" }, { status: 500 });
  }
}

function buildFallbackStatus(goal: any, subgoals: any[]) {
  const isComplete = goal.progress >= 100;
  if (isComplete) {
    return {
      suggestedStatus: "achieved",
      rationale: "Goal has reached 100% completion.",
      unrealisticDeadline: false,
      deadlineWarning: null
    };
  }

  const isLowProgress = goal.progress < 40;
  const isMediumProgress = goal.progress >= 40 && goal.progress < 70;

  // Simulate analyzing due date vs progress (dummy logic for fallback)
  let unrealisticDeadline = false;
  let deadlineWarning = null;
  if (goal.dueDate && isLowProgress) {
    const due = new Date(goal.dueDate);
    const today = new Date();
    const daysLeft = (due.getTime() - today.getTime()) / (1000 * 3600 * 24);
    if (daysLeft < 14) {
      unrealisticDeadline = true;
      deadlineWarning = `Only ${Math.ceil(daysLeft)} days left with ${goal.progress}% progress. Consider adjusting the timeline.`;
    }
  }

  let suggestedStatus = "on_track";
  let rationale = "Progress is moving steadily.";

  if (isLowProgress) {
    suggestedStatus = "at_risk";
    rationale = `Progress is only at ${goal.progress}%, suggesting potential blockers.`;
  } else if (unrealisticDeadline) {
    suggestedStatus = "off_track";
    rationale = `Goal is behind schedule given the upcoming deadline.`;
  } else if (isMediumProgress && subgoals.length > 0 && subgoals.every(s => s.progress < 50)) {
    suggestedStatus = "at_risk";
    rationale = "Overall progress is okay, but subgoals are lagging.";
  }

  return {
    suggestedStatus,
    rationale,
    unrealisticDeadline,
    deadlineWarning
  };
}

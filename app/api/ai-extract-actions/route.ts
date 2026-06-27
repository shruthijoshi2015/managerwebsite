import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { noteContent, reporteeId } = await req.json();

    if (!noteContent || !reporteeId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const db = readDb();
    const user = db.team.find(t => t.id === parseInt(reporteeId));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const activeGoals = user.goals.filter(g => g.status !== 'achieved').map(g => ({ id: g.id, title: g.title, progress: g.progress }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const prompt = `You are an expert engineering manager's AI assistant.
Your task is to read a newly saved 1:1 meeting note and extract structured follow-up items.

Reportee Name: ${user.name}
Role: ${user.role}

Active Goals for ${user.name}:
${JSON.stringify(activeGoals, null, 2)}

Meeting Note Content:
"""
${noteContent}
"""

Extract the following:
1. "tasks": Any concrete next steps or action items discussed. Indicate if the owner is the "manager" (you) or the "reportee" (${user.name}).
2. "goalUpdates": If the note mentions progress on any of the active goals (e.g. "80% done on migration"), suggest updating that goal's progress. Use the exact goal ID from the list provided.
3. "calendar": Any mentions of scheduling a follow-up or revisiting a topic later (e.g. "let's revisit in 2 weeks").
4. "sentiment": If the note reveals frustration, burnout, or low morale, extract a brief description of the issue. This will prompt the manager to keep a closer eye on them.
5. "blockers": If the note mentions any blocked tasks, dependencies, or impediments (e.g., "waiting on design"), extract the blocker details.
6. "kudos": If the note contains specific praise, positive feedback, or achievements (e.g., "great job on the release"), extract the praise details.
7. "agenda": If the note mentions incomplete thoughts or things to discuss next time (e.g., "we didn't get to talk about promotion"), extract the topic for the next 1:1 agenda.

Return ONLY a JSON object exactly matching this structure:
{
  "tasks": [
    { "title": "Task description", "owner": "manager" | "reportee" }
  ],
  "goalUpdates": [
    { "goalId": 12345, "suggestedProgress": 85, "reason": "Mentioned 85% done" }
  ],
  "calendar": [
    { "title": "Schedule follow-up on topic", "timeframe": "2 weeks" }
  ],
  "sentiment": [
    { "issue": "Mentioned feeling burnt out from the recent crunch" }
  ],
  "blockers": [
    { "description": "Waiting on design mockups for the new feature" }
  ],
  "kudos": [
    { "reason": "Great job leading the sprint planning" }
  ],
  "agenda": [
    { "topic": "Discuss career progression and promotion path" }
  ]
}

If no items of a specific type are found, return an empty array for that key.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON from AI");

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("AI Extract Actions error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({ error: "AI Quota Exceeded. Please try again later." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to extract actions" }, { status: 500 });
  }
}

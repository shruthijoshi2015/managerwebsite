import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { reporteeId } = await req.json();
    if (!reporteeId) return NextResponse.json({ error: "reporteeId is required" }, { status: 400 });

    const db = readDb();
    const member = db.team.find(m => m.id === reporteeId);
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Aggregate data
    const completedGoals = member.goals.filter(g => g.completedAt || g.progress >= 100);
    const inProgressGoals = member.goals.filter(g => !g.completedAt && g.progress < 100);
    const riskyGoals = member.goals.filter(g => g.status === 'at_risk' || g.status === 'off_track');
    const completedTasks = member.tasks.filter(t => t.done);
    const pendingTasks = member.tasks.filter(t => !t.done);
    const recentNotes = member.notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const prompt = `You are an expert HR business partner and engineering leader.
Draft a comprehensive performance review for this team member based on their actual data.

## EMPLOYEE INFO
- Name: ${member.name}
- Role: ${member.role}
- Department: ${member.department || 'Engineering'}
- Seniority: ${member.seniority || 'Not specified'}
- Career Track: ${member.careerTrack || 'Not specified'}
- Current Performance Tag: ${member.performance || 'Not specified'}

## COMPLETED GOALS (${completedGoals.length})
${completedGoals.map(g => `- "${g.title}" (${g.progress}%)`).join('\n') || 'None'}

## IN-PROGRESS GOALS (${inProgressGoals.length})
${inProgressGoals.map(g => `- "${g.title}" at ${g.progress}% - Status: ${g.status || 'unknown'}`).join('\n') || 'None'}

## AT-RISK GOALS (${riskyGoals.length})
${riskyGoals.map(g => `- "${g.title}" - ${g.status}`).join('\n') || 'None'}

## TASKS: ${completedTasks.length} completed, ${pendingTasks.length} pending

## RECENT 1:1 NOTES
${recentNotes.map(n => `- [${n.type}] ${n.content.substring(0, 150)}`).join('\n') || 'No notes'}

## RULES
1. Write a professional, balanced performance review with sections: Summary, Key Accomplishments, Areas of Strength, Areas for Growth, Goals for Next Quarter.
2. Use specific data points from above. Reference actual goal titles and completion rates.
3. Be constructive and actionable in growth areas.
4. Return ONLY a JSON object:
{
  "reviewText": "The full markdown-formatted performance review",
  "overallRating": "Exceeds Expectations" | "Meets Expectations" | "Needs Improvement",
  "keyStrengths": ["strength1", "strength2", "strength3"],
  "growthAreas": ["area1", "area2"]
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("AI Perf Review error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({ error: "AI Quota Exceeded. Please wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to generate performance review" }, { status: 500 });
  }
}

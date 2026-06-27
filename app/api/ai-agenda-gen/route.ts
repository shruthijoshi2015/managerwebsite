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

    const riskyGoals = member.goals.filter(g => g.status === 'at_risk' || g.status === 'off_track');
    const recentTasks = member.tasks.filter(t => !t.done).slice(0, 5);
    const recentNotes = member.notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    const completedTasks = member.tasks.filter(t => t.done && t.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()).slice(0, 3);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const prompt = `You are an expert engineering manager's AI assistant preparing for a 1:1 meeting.
Generate a smart, prioritized agenda for the next 1:1 with this team member.

## EMPLOYEE INFO
- Name: ${member.name}
- Role: ${member.role}
- Department: ${member.department || 'Engineering'}
- Seniority: ${member.seniority || 'Not specified'}
- Performance: ${member.performance || 'Not specified'}

## AT-RISK GOALS
${riskyGoals.map(g => `- "${g.title}" (${g.progress}%) - ${g.status}`).join('\n') || 'None'}

## PENDING TASKS
${recentTasks.map(t => `- "${t.title}"`).join('\n') || 'None'}

## RECENTLY COMPLETED
${completedTasks.map(t => `- "${t.title}"`).join('\n') || 'None'}

## RECENT 1:1 NOTES (for follow-up context)
${recentNotes.map(n => `- [${n.date}] (${n.type}): ${n.content.substring(0, 150)}`).join('\n') || 'No notes'}

## RULES
1. Generate 3-5 agenda items, each with a title, talking point, and priority (high/medium/low).
2. Always include: follow-up from previous notes if available, at-risk goal discussion if any, and a career development check-in.
3. Prioritize blockers and at-risk items first.
4. Make items specific and actionable, not generic.

Return ONLY a JSON object:
{
  "agendaItems": [
    {
      "title": "Short title",
      "talkingPoint": "What to discuss and why",
      "priority": "high" | "medium" | "low",
      "category": "follow-up" | "blocker" | "career" | "goal" | "kudos"
    }
  ],
  "estimatedDuration": "30 min",
  "meetingSummary": "A 1-sentence summary of what this 1:1 should focus on"
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
    console.error("AI Agenda Gen error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({ error: "AI Quota Exceeded. Please wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to generate agenda" }, { status: 500 });
  }
}

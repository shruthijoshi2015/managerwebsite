import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const db = readDb();

    // Map all team members to a simplified format for the AI prompt
    const teamData = db.team.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      department: m.department || "Unknown",
      goals: m.goals.map(g => ({ title: g.title, progress: g.progress, status: g.status || 'unknown' })),
      tasks: {
        pendingCount: m.tasks.filter(t => !t.done).length,
        completedCount: m.tasks.filter(t => t.done).length
      },
      notes: m.notes.slice(0, 5).map(n => ({ date: n.date, type: n.type, content: n.content }))
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const prompt = `You are an expert HR analytics AI monitoring an engineering team for risks.
Analyze the following team data and identify any members who are at risk.

## TEAM DATA
${JSON.stringify(teamData, null, 2)}

## RISK CATEGORIES TO DETECT
1. Burnout Predictor: High workload (many pending tasks) + negative notes/sentiment.
2. Flight Risk Indicator: Stalled goals (low progress/at risk) + declining check-in notes + lack of recent positive notes.
3. Silo Detection: Isolated goals, lack of cross-functional notes, or tasks that seem disconnected from the rest of the team.
4. Execution Risk: Stalled goals and heavily overdue tasks.

## RULES
1. Analyze the team and identify 1-4 members who exhibit the highest risks across these categories.
2. For each flagged member, specify the primary risk category (burnout, flight_risk, silo, execution_risk).
3. Provide a short "reason" explaining why they were flagged based on the data.
4. Provide an "automated check-in nudge" which is a 1-2 sentence polite Slack/Email draft for the manager to send them to start a conversation.

Return ONLY a JSON object exactly like this:
{
  "risks": [
    {
      "memberId": 1,
      "memberName": "Name",
      "category": "burnout" | "flight_risk" | "silo" | "execution_risk",
      "severity": "high" | "medium",
      "reason": "Why they were flagged...",
      "nudgeText": "Hey [Name], I noticed..."
    }
  ],
  "teamHealthSummary": "A 1-sentence summary of the team's overall risk profile."
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("AI Risk Detector error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({ error: "AI Quota Exceeded. Please wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to run risk detection" }, { status: 500 });
  }
}

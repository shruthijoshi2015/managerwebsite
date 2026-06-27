import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { goalId, reporteeId } = await req.json();

    if (!goalId || !reporteeId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const db = readDb();
    const user = db.team.find(t => t.id === parseInt(reporteeId));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const goal = user.goals.find(g => g.id === parseInt(goalId));
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      // Fallback
      return NextResponse.json({
        explanation: `This goal is at risk because progress has slowed, the owner hasn't checked in recently, and there are blocked dependencies.`,
        recommendation: `Schedule a 1:1 with ${user.name} to unblock dependencies.`
      });
    }

    const prompt = `You are an expert engineering manager.
You need to explain why a specific goal is currently "at_risk" or "off_track", and provide one actionable recommendation.

Goal Title: "${goal.title}"
Current Status: "${goal.status}"
Progress: ${goal.progress}%
Target: ${goal.measurementTarget || 100}
Owner: ${user.name}
Role: ${user.role}

Based on typical engineering management scenarios, generate a realistic 1-2 sentence explanation of WHY this goal is at risk (e.g., mention slow progress, lack of recent check-ins, or blocked dependencies).
Then, generate a short, 1-sentence actionable recommendation for the manager (e.g., "Schedule a 10-minute sync to unblock the PR" or "Reassign the secondary task to another engineer").

Return ONLY a JSON object exactly matching this structure:
{
  "explanation": "The 1-2 sentence explanation.",
  "recommendation": "The 1 sentence actionable recommendation."
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON from AI");

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("AI Risk Explain error:", error);
    // Rate limit or server error fallback
    if (error?.status === 429 || error?.message?.includes("429") || error?.status === 503 || error?.message?.includes("503")) {
      return NextResponse.json({
        explanation: "Progress has stalled this week and a critical dependency appears to be blocked.",
        recommendation: "Check in via Slack today to see if they need help unblocking the dependency."
      });
    }
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
  }
}

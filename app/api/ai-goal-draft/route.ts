import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sentence } = await req.json();

    if (!sentence) {
      return NextResponse.json({ error: "Missing sentence" }, { status: 400 });
    }

    const db = readDb();
    
    // Provide team data for assignment
    const teamContext = db.team.map(m => {
      const activeGoals = m.goals.filter(g => !g.completedAt).length;
      const activeTasks = m.tasks.filter(t => !t.done).length;
      return {
        id: m.id,
        name: m.name,
        role: m.role,
        department: m.department,
        activeGoals,
        activeTasks
      };
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      // Fallback
      return NextResponse.json({
        title: "Migrate analytics events to new schema",
        description: "Update the analytics event pipeline to utilize the v2 schema for improved reporting.",
        tags: ["migration", "analytics"],
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
        suggestedOwnerId: teamContext[0]?.id || 1,
        subgoals: ["Audit current event schema", "Map old events to new schema", "Update tracking calls"],
        workloadWarning: teamContext[0]?.activeGoals > 3 ? `${teamContext[0].name} already has ${teamContext[0].activeGoals} active goals. Consider reassigning.` : null
      });
    }

    const prompt = `You are an expert engineering manager's assistant.
Your task is to take a raw sentence drafted by the manager and turn it into a structured, SMART goal.
You also need to suggest an owner from the team based on their role and department.
Also, if the suggested owner already has a heavy workload (e.g. >3 active goals or many tasks), provide a 'workloadWarning'.

Raw Input Sentence: "${sentence}"

Team Context:
${JSON.stringify(teamContext, null, 2)}

Requirements:
- title: A concise, action-oriented title.
- description: A slightly expanded description detailing why and how.
- tags: Array of strings (e.g., ["migration", "backend"]).
- dueDate: YYYY-MM-DD. Estimate based on input. If "Q3 end", use Sep 30 of the current year. If not specified, add 30 days.
- suggestedOwnerId: The numeric ID of the best team member to own this. If unknown, pick the first one.
- subgoals: Array of 2-4 strings representing logical milestones.
- workloadWarning: If the suggested owner has >3 activeGoals or >5 activeTasks, explain the risk in one sentence (e.g. "Sarah already has 4 active goals, assigning this might overload her."). Otherwise, return null.

Return ONLY a JSON object exactly matching this structure:
{
  "title": "string",
  "description": "string",
  "tags": ["string"],
  "dueDate": "string",
  "suggestedOwnerId": 123,
  "subgoals": ["string"],
  "workloadWarning": "string | null"
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON from AI");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("AI Goal Draft error:", error);
    // If we hit a rate limit (429) or other error, provide a dummy fallback
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({
        title: "Migrate analytics events to new schema",
        description: "Update the analytics event pipeline to utilize the v2 schema for improved reporting.",
        tags: ["migration", "analytics"],
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
        suggestedOwnerId: 1,
        subgoals: ["Audit current event schema", "Map old events to new schema", "Update tracking calls"],
        workloadWarning: "This is a placeholder warning because the AI service is currently rate-limited."
      });
    }
    // General fallback
    return NextResponse.json({
        title: "Drafted Goal from Fallback",
        description: "AI service is unavailable. Please edit this goal manually.",
    });
  }
}

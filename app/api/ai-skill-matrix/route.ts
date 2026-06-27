import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const db = readDb();

    const teamContext = db.team.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      department: m.department,
      seniority: m.seniority,
      completedGoals: m.goals.filter(g => g.completedAt || g.progress >= 100).map(g => g.title),
      completedTasks: m.tasks.filter(t => t.done).map(t => t.title),
      activeGoals: m.goals.filter(g => !g.completedAt && g.progress < 100).map(g => g.title),
      activeTasks: m.tasks.filter(t => !t.done).map(t => t.title),
      goalTags: m.goals.flatMap(g => g.tags || [])
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const prompt = `You are an expert engineering manager and talent analytics AI.
Analyze each team member's completed and active work to build a skill profile and suggest optimal resource assignments.

## TEAM DATA
${teamContext.map(m => `### ${m.name} (${m.role}, ${m.seniority || 'Unknown level'})
- Completed Goals: ${m.completedGoals.join(', ') || 'None'}
- Completed Tasks: ${m.completedTasks.join(', ') || 'None'}
- Active Goals: ${m.activeGoals.join(', ') || 'None'}
- Active Tasks: ${m.activeTasks.join(', ') || 'None'}
- Goal Tags: ${m.goalTags.join(', ') || 'None'}`).join('\n\n')}

## RULES
1. For each member, infer 3-5 skill areas from their work patterns (e.g., "Frontend Development", "API Design", "DevOps", "Data Analysis", "Project Management", "Documentation").
2. Rate each skill 1-5 based on evidence from their completed work.
3. Identify the team's overall skill gaps.
4. Suggest who would be the best fit for common project types.

Return ONLY a JSON object:
{
  "members": [
    {
      "id": 1,
      "name": "Name",
      "skills": [
        { "name": "Frontend Development", "level": 4, "evidence": "Completed 3 UI-related goals" }
      ],
      "bestFitFor": ["UI redesigns", "Performance optimization"],
      "currentWorkload": "light" | "moderate" | "heavy"
    }
  ],
  "teamGaps": ["Security", "Mobile Development"],
  "recommendations": ["Consider cross-training Sarah on backend APIs", "Akhil could mentor juniors on DevOps"]
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
    console.error("AI Skill Matrix error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({ error: "AI Quota Exceeded. Please wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to generate skill matrix" }, { status: 500 });
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ goals: [] });
    }

    // Initialize inside handler so env var is always fresh
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const { role, existingGoals, count = 5, context } = await req.json();

    const prompt = `You are an expert OKR and goal-setting coach for managers. Generate ${count} specific, measurable, and actionable professional goals for a reportee managed by the user.

${role || context?.role ? `The reportee's role is: ${role || context?.role}` : "General employee role"}
${context?.department ? `Department: ${context.department}` : ""}
${context?.seniority ? `Seniority Level: ${context.seniority}` : ""}
${context?.careerTrack ? `Career Track Focus: ${context.careerTrack}` : ""}
${context?.performance ? `Current Performance Status: ${context.performance} (Tailor goal difficulty appropriately)` : ""}

${context?.teamContext && context.teamContext.length > 0 ? `Team Context (what other team members are working on):
${context.teamContext.map((tm: any) => `- ${tm.name} (${tm.role}): [${tm.activeGoals.join(", ")}]`).join("\n")}
Ensure your suggested goals align with, complement, or fill gaps in these broader team objectives if relevant.` : ""}

${context?.notes ? `Recent 1-on-1 meeting notes to draw context from:\n"${context.notes}"\n\nBased on these notes, try to suggest 1-2 goals that directly follow up on the recent discussions.` : ""}

${existingGoals?.length ? `The reportee already has these active goals (DO NOT duplicate these): ${existingGoals.join(", ")}` : ""}

Generate ${count} SMART goals that are:
- Specific and measurable (include metrics like percentages, numbers, or deadlines)
- Realistic for this employee to achieve in 1 quarter
- Tailored specifically to their seniority, career track, and performance status.
- Focused on team performance, career growth, or business outcomes
- Varied across categories: team development, process improvement, business impact, communication

Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "title": "Short goal title (max 8 words)",
    "description": "One sentence describing why this goal matters and how to measure success"
  }
]

No markdown, no explanation. Only the JSON array.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ goals: [] });

    const goals = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ goals: goals.slice(0, count) });

  } catch (error) {
    console.error("AI goal suggestion error:", error);
    return NextResponse.json({ error: String(error), goals: [] });
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ suggestions: [] });
    }

    // Initialize inside handler so env var is always fresh
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const { input, context } = await req.json();

    if (!input || input.trim().length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    const prompt = `You are an AI assistant for a manager dashboard tool. A manager is typing a new action item/task for their 1-on-1 meeting with a direct report.

Current input: "${input}"

Reportee Context:
${context?.role ? `- Role: ${context.role}` : ""}
${context?.department ? `- Department: ${context.department}` : ""}
${context?.seniority ? `- Seniority Level: ${context.seniority}` : ""}
${context?.careerTrack ? `- Career Track: ${context.careerTrack}` : ""}

${context?.activeTasks ? `Currently active tasks (DO NOT suggest these): ${context.activeTasks}` : ""}

${context?.teamContext && context.teamContext.length > 0 ? `Team Context (active tasks for the rest of the team):
${context.teamContext.map((tm: any) => `- ${tm.name}: [${tm.activeTasks.join(", ")}]`).join("\n")}
If relevant, suggest tactical tasks that help unblock or support the rest of the team's ongoing work.` : ""}

${context?.notes ? `Recent 1-on-1 meeting notes:\n"${context.notes}"\n\nIf the notes mention something related to the current input, suggest a task that completes that thought.` : ""}

Generate exactly 3 short, specific, actionable task suggestions that complete or are related to what the manager is typing.
These should be realistic manager tasks tailored to the reportee's seniority and context. Example tasks:
- Follow up on project deliverables
- Schedule performance review
- Share feedback on presentation
- Review quarterly goals progress
- Discuss career development plan

Rules:
- Each suggestion must be a single concise sentence (max 10 words)
- Return ONLY a JSON array of 3 strings, nothing else
- Example: ["Schedule weekly sync with team", "Send project update to stakeholders", "Review Q3 deliverables by Friday"]

Return only valid JSON array, no markdown, no explanation.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ suggestions: [] });

    const suggestions = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });

  } catch (error) {
    console.error("AI suggestion error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}

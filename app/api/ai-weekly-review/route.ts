import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { format = "slack" } = body;

    const db = readDb();
    
    // Gather team context
    const allGoals = db.team.flatMap(m => m.goals.map(g => ({ ...g, ownerName: m.name })));
    const allTasks = db.team.flatMap(m => m.tasks.map(t => ({ ...t, ownerName: m.name })));
    
    const recentGoals = allGoals.filter(g => g.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()).slice(0, 5);
    const riskyGoals = allGoals.filter(g => g.status === 'at_risk' || g.status === 'off_track');
    
    const recentTasks = allTasks.filter(t => t.done && t.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()).slice(0, 10);
    const blockedTasks = allTasks.filter(t => !t.done && t.title.toLowerCase().includes('block')); // simple heuristic

    // Top contributor logic (simple heuristic: most tasks completed)
    const completionsByPerson = recentTasks.reduce((acc, t) => {
      acc[t.ownerName] = (acc[t.ownerName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    let topContributor = "The whole team";
    let maxCompletions = 0;
    for (const [name, count] of Object.entries(completionsByPerson)) {
      if (count > maxCompletions) {
        maxCompletions = count;
        topContributor = name;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    let formatInstructions = "";
    if (format === "slack") {
      formatInstructions = "Format as a Slack update with bullet points and emojis. Keep it punchy.";
    } else if (format === "email") {
      formatInstructions = "Format as a formal email to leadership with professional paragraphs.";
    } else if (format === "exec") {
      formatInstructions = "Format as an Executive Summary. Strictly high-level numbers, risks, and next steps. Very concise.";
    }

    const prompt = `You are an expert engineering manager writing an end-of-week status report.
Generate a Weekly Review based on the following team data.

${formatInstructions}

## RECENT COMPLETED GOALS
${recentGoals.map(g => `- ${g.ownerName} completed "${g.title}"`).join('\n') || "None"}

## RECENT COMPLETED TASKS
${recentTasks.map(t => `- ${t.ownerName} completed "${t.title}"`).join('\n') || "None"}

## CURRENT RISKY GOALS & BLOCKERS (Escalations)
${riskyGoals.map(g => `- ${g.ownerName}: "${g.title}" is ${g.status}`).join('\n') || "None"}
${blockedTasks.map(t => `- Blocked: ${t.title} (${t.ownerName})`).join('\n') || ""}

## TOP CONTRIBUTOR
The top contributor this week based on task velocity was: ${topContributor}. Give them a shoutout in the report!

## RULES
1. The report MUST include sections for: Accomplishments, Risks/Blockers (if any), Top Contributor Kudos, and What's Coming Next.
2. If there are blockers or risky goals, escalate them clearly.
3. Be specific and use real names from the data.
4. Return ONLY a JSON object exactly matching this structure:
{
  "reportText": "The formatted markdown text of the report",
  "subjectLine": "A suggested email subject line (even if format is slack, provide one)"
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid JSON from AI" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ report: parsed });
  } catch (error: any) {
    console.error("AI Weekly Review error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({ error: "AI Quota Exceeded. You have hit the Google AI Studio free tier rate limit. Please wait a minute and try again." }, { status: 429 });
    }
    
    return NextResponse.json({ error: "Failed to generate weekly review" }, { status: 500 });
  }
}

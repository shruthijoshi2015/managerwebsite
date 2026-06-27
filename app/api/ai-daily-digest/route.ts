import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isFriday = body.isFriday !== undefined ? body.isFriday : new Date().getDay() === 5;

    const db = readDb();
    
    // Gather team context
    const allGoals = db.team.flatMap(m => m.goals.map(g => ({ ...g, ownerName: m.name })));
    const allTasks = db.team.flatMap(m => m.tasks.map(t => ({ ...t, ownerName: m.name })));
    const allNotes = db.team.flatMap(m => m.notes.map(n => ({ ...n, ownerName: m.name })));

    // For demo purposes, we'll just take the most recently completed or updated items
    const recentGoals = allGoals.filter(g => g.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()).slice(0, 3);
    const riskyGoals = allGoals.filter(g => g.status === 'at_risk' || g.status === 'off_track');
    
    const recentTasks = allTasks.filter(t => t.done && t.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()).slice(0, 5);
    
    const recentNotes = allNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      // Intelligent fallback
      return NextResponse.json({
        digestText: isFriday 
          ? `Happy Friday! This week, ${recentGoals.length} goals were completed and ${recentTasks.length} tasks were checked off. ${riskyGoals.length} goals are currently at risk.`
          : `Since yesterday, ${recentTasks[0]?.ownerName || 'a team member'} completed a task and ${recentGoals[0]?.ownerName || 'someone'} updated a goal. There are ${riskyGoals.length} goals that need your attention.`,
        actionRecommendation: "Check in with the team on any blocked items before the day ends.",
        criticalAlert: riskyGoals.length > 0 ? `Alert: ${riskyGoals[0].ownerName}'s goal "${riskyGoals[0].title}" is ${riskyGoals[0].status}. Progress has stalled and requires immediate attention.` : null,
        hasMeaningfulUpdates: true,
        isWeeklyWrapUp: isFriday
      });
    }

    const modeStr = isFriday ? "WEEKLY WRAP-UP (Summarize the whole week's progress)" : "DAILY DIGEST (Summarize what changed since yesterday)";
    
    const prompt = `You are an expert executive assistant for an engineering manager.
Generate a "${modeStr}" for the manager based on the team's recent activity.

## RECENT COMPLETED GOALS
${recentGoals.map(g => `- ${g.ownerName} completed "${g.title}"`).join('\n') || "None"}

## CURRENT RISKY GOALS
${riskyGoals.map(g => `- ${g.ownerName}: "${g.title}" is ${g.status} (Priority: ${g.priority || 'Normal'}, Progress: ${g.progress}%)`).join('\n') || "None"}

## RECENT COMPLETED TASKS
${recentTasks.map(t => `- ${t.ownerName} completed "${t.title}"`).join('\n') || "None"}

## RECENT CHECK-IN NOTES
${recentNotes.map(n => `- ${n.ownerName} (${n.type}): ${n.content.substring(0, 100)}...`).join('\n') || "None"}

## RULES
1. Provide a 'digestText' which is exactly 3 sentences summarizing the key updates.
2. Provide a 'actionRecommendation' which is a single sentence suggesting ONE high-leverage action the manager should take today based on the risks or notes.
3. Provide a 'criticalAlert' string explaining WHY a specific 'off_track' or P0 'at_risk' goal is failing and what to do. If there are no off_track/critical goals, return null.
4. Be specific, use real names from the data.

Return ONLY a JSON object exactly matching this structure:
{
  "digestText": "Three sentence summary here...",
  "actionRecommendation": "One sentence action to take here...",
  "criticalAlert": "Explanation of critical risk..." | null,
  "hasMeaningfulUpdates": true,
  "isWeeklyWrapUp": ${isFriday}
}
`;

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
  } catch (error) {
    console.error("AI Daily Digest error:", error);
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
}

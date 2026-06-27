import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { noteContent, reporteeId, noteId } = await req.json();
    if (!noteContent || !reporteeId) {
      return NextResponse.json({ error: "noteContent and reporteeId are required" }, { status: 400 });
    }

    // Skip summarization for very short notes
    if (noteContent.trim().length < 80) {
      return NextResponse.json({ skipped: true, reason: "Note too short for summarization" });
    }

    const db = readDb();
    const member = db.team.find(m => m.id === reporteeId);
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Get their active goals for goal linkage
    const activeGoals = member.goals
      .filter(g => !g.completedAt && g.progress < 100)
      .map(g => ({ id: g.id, title: g.title, progress: g.progress, status: g.status }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const prompt = `You are an expert engineering manager's AI assistant that processes check-in notes.
Analyze the following check-in note and extract structured intelligence from it.

## CHECK-IN NOTE
"""
${noteContent}
"""

## EMPLOYEE CONTEXT
- Name: ${member.name}
- Role: ${member.role}
- Department: ${member.department || 'Engineering'}

## ACTIVE GOALS (for goal linkage detection)
${activeGoals.map(g => `- "${g.title}" (${g.progress}% done, status: ${g.status || 'unknown'})`).join('\n') || 'No active goals'}

## YOUR TASK
Extract all of the following from the note:

1. **TL;DR Summary**: A concise 2-3 line summary capturing the key takeaways from this check-in.
2. **Signals**: An array of short tag-like signals detected (e.g., "Blocked on API", "Positive momentum", "Needs design review", "Cross-team dependency").
3. **Competency/Skill Tags**: Skills or competencies mentioned or demonstrated in the note (e.g., "React", "Leadership", "System Design", "Communication", "Debugging").
4. **Sentiment**: The overall emotional tone of the note. One of: "Very Positive", "Positive", "Neutral", "Frustrated", "Concerned", "Critical".
5. **Goal Mentions**: If the note discusses any of the active goals listed above, identify which goal and suggest an action (e.g., "Consider updating progress to 60%").
6. **Implicit Follow-ups**: If the note mentions any future dates, deadlines, or "let's revisit" type language, extract those as scheduled follow-up tasks with a timeframe.

Return ONLY a JSON object:
{
  "tldr": "2-3 line summary string",
  "signals": ["signal1", "signal2"],
  "skills": ["skill1", "skill2"],
  "sentiment": "Positive",
  "goalMentions": [
    { "goalTitle": "Exact goal title from the list above", "suggestedAction": "What the manager should do" }
  ],
  "followUps": [
    { "task": "What needs to be followed up on", "timeframe": "next Tuesday" }
  ]
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

    // Persist the AI summary onto the note in the database
    if (noteId) {
      const note = member.notes.find(n => n.id === noteId);
      if (note) {
        note.aiSummary = parsed;
        writeDb(db);
      }
    } else {
      // Find the most recent note (the one just saved)
      const sortedNotes = [...member.notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sortedNotes.length > 0) {
        const latestNote = member.notes.find(n => n.id === sortedNotes[0].id);
        if (latestNote) {
          latestNote.aiSummary = parsed;
          writeDb(db);
        }
      }
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("AI Note Summarizer error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({ error: "AI Quota Exceeded. Please wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to summarize note" }, { status: 500 });
  }
}

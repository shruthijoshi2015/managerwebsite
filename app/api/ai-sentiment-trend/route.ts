import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const db = readDb();

    // Gather all notes from all team members
    const allNotesByMember = db.team.map(m => ({
      id: m.id,
      name: m.name,
      notes: m.notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
    })).filter(m => m.notes.length > 0);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const prompt = `You are an expert people analytics AI for engineering managers.
Analyze the sentiment and emotional tone of the following 1:1 meeting notes for each team member.

## TEAM NOTES
${allNotesByMember.map(m => `### ${m.name} (ID: ${m.id})
${m.notes.map(n => `- [${n.date}] (${n.type}): ${n.content.substring(0, 200)}`).join('\n')}`).join('\n\n')}

## RULES
1. For each team member, assign a sentiment score from 1-10 (1=very negative, 5=neutral, 10=very positive).
2. Provide a short trend description ("improving", "declining", "stable").
3. Flag any member whose sentiment is <= 4 as "needsAttention".
4. Provide a brief 1-sentence insight for each member.
5. Provide an overall team morale summary.

Return ONLY a JSON object:
{
  "teamMorale": "A 1-2 sentence overall team morale summary",
  "averageScore": 7.2,
  "members": [
    {
      "id": 1,
      "name": "Name",
      "sentimentScore": 7,
      "trend": "improving",
      "needsAttention": false,
      "insight": "Short insight about their sentiment"
    }
  ]
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
    console.error("AI Sentiment Trend error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({ error: "AI Quota Exceeded. Please wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to analyze sentiment" }, { status: 500 });
  }
}

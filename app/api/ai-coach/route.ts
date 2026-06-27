import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const db = readDb();
    
    // Create a compact snapshot of the team data
    const teamContext = db.team.map(m => ({
      name: m.name,
      role: m.role,
      goals: m.goals.filter((g: any) => !g.parentId).map((g: any) => ({
        title: g.title,
        progress: g.progress,
        status: g.status,
        dueDate: g.dueDate,
        subgoals: m.goals.filter((sg: any) => sg.parentId === g.id).map((sg: any) => ({ title: sg.title, progress: sg.progress, status: sg.status }))
      })),
      tasks: m.tasks.map(t => ({
        title: t.title,
        done: t.done
      })),
      recentNotes: m.notes.slice(0, 3).map(n => ({
        date: n.date,
        content: n.content
      }))
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const systemPrompt = `You are "Coach Me", an expert HR and Engineering Manager AI Assistant.
Your goal is to answer the manager's questions about their team based ONLY on the following real-time data snapshot of their team.

## TEAM DATA SNAPSHOT
${JSON.stringify(teamContext, null, 2)}

## RULES
1. Base your answers ONLY on the provided JSON data. Do not make up facts or status updates.
2. If a user asks "Why is X behind?", look at their incomplete tasks or recent notes for blockers.
3. Cite your sources. e.g., "According to Sarah's recent note..." or "Looking at their incomplete tasks..."
4. Be concise, actionable, and format your response beautifully using Markdown (bullet points, bold text).
5. If you do not have enough data to answer the question, clearly state: "I don't see enough data in the current goals/notes to fully answer this."
6. Maintain a supportive, analytical, and professional tone.
`;

    // Format history for Gemini
    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    // Inject system prompt into the first user message, or prepend a user message if the history starts with model
    if (contents.length > 0 && contents[0].role === "user") {
      contents[0].parts[0].text = `[SYSTEM CONTEXT - DO NOT ACKNOWLEDGE THIS TO THE USER]\n${systemPrompt}\n\n[USER MESSAGE]\n${contents[0].parts[0].text}`;
    } else {
      contents.unshift({
        role: "user",
        parts: [{ text: `[SYSTEM CONTEXT]\n${systemPrompt}\n\n(No initial user message)` }]
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const result = await model.generateContent({ contents });
    const text = result.response.text();
    
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("AI Coach error:", error);
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json({ error: "AI Quota Exceeded. Please wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to generate coaching response" }, { status: 500 });
  }
}

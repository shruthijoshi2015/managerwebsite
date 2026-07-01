# AI Features Reference

This document tracks the advanced AI capabilities integrated into the application.

## 1. AI 1:1 Note Actions Extractor
**Where it lives**: `NotesEditor.tsx` & `/api/ai-extract-actions/route.ts`
**What it does**: Automatically extracts actionable insights from freeform 1:1 notes when saved.
**Capabilities**:
- **Tasks**: Extracts standard action items and assignments.
- **Goals**: Suggests goal progress updates based on note context.
- **Calendar**: Suggests scheduling follow-ups or next meetings.
- **Sentiment Alert**: Creates a private `[Watch]` task for frustration or burnout.
- **Blockers**: Creates a `[Blocker]` task to resolve dependencies.
- **Kudos**: Extracts praise to track for shoutouts via a `[Kudos]` task.
- **Agenda Items**: Caches topics for future discussions via an `[Agenda]` task.

## 2. Weekly Review Autocompose
**Where it lives**: `WeeklyReviewPanel.tsx`, `DashboardClient.tsx` & `/api/ai-weekly-review/route.ts`
**What it does**: Generates a beautiful, outward-facing weekly status report based on team activity.
**Capabilities**:
- **Format Selector**: Instantly switches between "Slack Update", "Formal Email", and "Exec Summary" tones.
- **Highlights Top Contributor**: Scans completed tasks and automatically gives a shoutout to the most productive team member.
- **Escalates Blockers**: Detects blocked tasks or risky goals and prominently features them for visibility.
- **One-Click Drafter**: Drafts the generated report directly into the default email client with a subject line.

---

## 3. Performance Review Drafter
**Where it lives**: `PerfReviewPanel.tsx` & `/api/ai-perf-review/route.ts` (Accessible via "Draft Review" button on Team Member Profile)
**What it does**: Aggregates a team member's completed goals, tasks, kudos, and 1:1 notes over time to generate a comprehensive "first draft" of their performance review.
**Capabilities**:
- Generates a full markdown-formatted performance review with key strengths and growth areas.
- Synthesizes actual progress and goal completion rates into actionable feedback.
- Provides a suggested overall performance rating.

## 4. Sentiment Trend Analysis
**Where it lives**: `SentimentTrendPanel.tsx` & `/api/ai-sentiment-trend/route.ts` (Accessible via "Sentiment" button on Dashboard)
**What it does**: Analyzes the tone of 1:1 notes and check-ins across the entire team to generate morale insights.
**Capabilities**:
- Provides an overall "Team Morale Score" out of 10.
- Flags employees whose sentiment has been steadily declining or needs attention.
- Provides short insights and trends (improving/declining/stable) for every team member.

## 5. Smart 1:1 Agenda Generator
**Where it lives**: `AgendaGenPanel.tsx` & `/api/ai-agenda-gen/route.ts` (Accessible via "Gen Agenda" button on Team Member Profile)
**What it does**: Analyzes recent tasks, goals, and previous notes to generate a highly prioritized agenda for an upcoming 1:1 meeting.
**Capabilities**:
- Highlights "At-Risk" goals and suggests immediate talking points.
- Reviews recently completed tasks and creates follow-ups.
- Suggests an estimated duration and meeting summary focus.

## 6. Team Skill Matrix & Resource Matcher
**Where it lives**: `SkillMatrixPanel.tsx` & `/api/ai-skill-matrix/route.ts` (Accessible via "Skill Matrix" button on Dashboard)
**What it does**: Analyzes the historical task completion data of the team to infer individual skills and find team-wide knowledge gaps.
**Capabilities**:
- Builds an inferred 1-5 rating profile for skills like "Frontend Development" or "API Design" based on actual completed tasks.
- Matches team members to specific project types (e.g., "Best fit for: UI redesigns").
- Suggests actionable AI recommendations for cross-training and resource allocation.

## 7. Daily Digest AI
**Where it lives**: `DailyDigestBanner.tsx` & `/api/ai-daily-digest/route.ts` (Accessible on Dashboard banner)
**What it does**: Synthesizes the most critical updates across the entire team for the manager's morning review.
**Capabilities**:
- Provides a morning greeting with a brief, high-level overview.
- Lists the top 3 action items the manager needs to focus on today.

## 8. AI 1:1 Prep Assistant
**Where it lives**: `PrepBriefPanel.tsx` & `/api/ai-prep/route.ts` (Accessible via "Prep for 1:1" button on Team Member Profile)
**What it does**: Generates a quick pre-read brief for a manager right before jumping into a 1:1 meeting with a specific reportee.
**Capabilities**:
- Summarizes recent goal progress, blocked tasks, and prior meeting notes.
- Highlights what's going well (kudos) and what needs attention.

## 9. AI Goal Suggestions
**Where it lives**: `ai-goal-suggest/route.ts`
**What it does**: Analyzes a team member's role, seniority, and current performance to suggest personalized, SMART goals for the quarter.
**Capabilities**:
- Recommends 3-5 tailored goals covering team development, process improvement, and business impact.
- Avoids duplicating already active goals.

## 10. AI Goal Status Analyzer
**Where it lives**: `ai-goal-status/route.ts`
**What it does**: Automatically analyzes a goal's progress percentage vs. its deadline to suggest an objective status (On Track, At Risk, Off Track).
**Capabilities**:
- Flags unrealistic deadlines if progress is too low compared to the due date.
- Provides a 1-sentence rationale for the suggested status.

## 11. AI Risk Explainer
**Where it lives**: `ai-risk-explain/route.ts`
**What it does**: Takes an "At Risk" or "Off Track" goal and generates a realistic explanation of *why* it might be blocked.
**Capabilities**:
- Looks at the goal owner's role and goal progress to infer blockers (e.g., waiting on dependencies).
- Provides a 1-sentence actionable recommendation for the manager to unblock it.

## 12. "Make it SMART" Goal Rewriter
**Where it lives**: `ai-make-smart/route.ts`
**What it does**: Takes a vague, roughly drafted goal title and instantly rewrites it into a SMART (Specific, Measurable, Achievable, Relevant, Time-bound) objective.

## 13. AI Goal Drafter
**Where it lives**: `ai-goal-draft/route.ts`
**What it does**: Takes a raw sentence from the manager and structures it into a full goal object.
**Capabilities**:
- Suggests an ideal owner from the team based on department and role.
- Warns if the suggested owner is already overloaded with active goals.
- Auto-generates subgoals/milestones and due dates.

## 14. Real-time Task Suggestions
**Where it lives**: `TaskForm.tsx` & `/api/ai-suggest/route.ts`
**What it does**: Acts as an autocomplete assistant while the manager is typing a new task for a reportee.
**Capabilities**:
- Considers the reportee's role and recent 1:1 notes to suggest highly contextual task endings.

## 15. Team Risk Radar
**Where it lives**: `RiskRadarPanel.tsx` & `/api/ai-risk-detector/route.ts` (Accessible via "Risk Radar" button on Dashboard)
**What it does**: Scans the entire team's goals, tasks, check-in frequencies, and notes to detect overarching risks like Burnout, Flight Risk, Silos, and Execution Risk.
**Capabilities**:
- **Burnout Predictor**: Identifies high workloads combined with negative sentiment.
- **Flight Risk Indicator**: Detects disengagement through stalled goals and declining check-in notes.
- **Silo Detection**: Flags team members whose goals and tasks are completely isolated from others.
- **Automated Check-in Nudge**: Provides a 1-click draft message to instantly reach out to flagged members.

## 16. Smart Note Summarizer
**Where it lives**: `NotesEditor.tsx` & `/api/ai-note-summarizer/route.ts` (Runs automatically after saving a check-in note ≥ 80 characters)
**What it does**: After a long check-in note is submitted, AI generates a rich, structured summary that gets pinned above the raw note text in the History timeline.
**Capabilities**:
- **TL;DR Summary**: A concise 2-3 line summary of the key takeaways.
- **Structured Signal Extraction**: Detects and tags signals like "Blocked on API", "Cross-team dependency", "Needs design review".
- **Competency / Skill Tagging**: Automatically tags skills mentioned or demonstrated (e.g., "React", "Leadership", "System Design"), feeding into the Skill Matrix.
- **Sentiment Detection**: Classifies the note's emotional tone (Very Positive → Critical) and integrates with Risk Radar for automatic flagging.
- **Goal Linkage**: Detects when active goals are discussed and suggests progress updates (e.g., "Consider updating 'Increase Website Traffic' to 85%").
- **Implicit Follow-up Scheduling**: Extracts future dates and "let's revisit" language to auto-create scheduled follow-up tasks.

## 17. Coach Me Mode ⏳ (Planned)
**Where it will live**: Floating chat bubble (bottom-right corner) accessible from all pages, or `Ctrl+K` command palette
**What it does**: A free-form conversational AI assistant where the manager asks questions about their team and gets context-aware answers grounded in real data.
**Capabilities**:
- **Free-form Q&A**: Ask questions like "Why is Sarah behind?" or "Should I escalate the SSR blocker?"
- **Full Context Awareness**: Answers are grounded in goals, tasks, 1:1 notes, sentiment history, and risk data.
- **Source Citations**: Every answer cites the specific data points it used (e.g., "Based on the note from May 15…").
- **Confidence Indicators**: Responses include a confidence level (High/Medium/Low) to prevent over-reliance.
**Extended Ideas**:
- **Proactive Coach Nudges**: AI pushes daily/weekly coaching reminders to the Dashboard.
- **Difficult Conversation Simulator**: Scripted opening lines using SBI framework for tough feedback.
- **Decision Framework Helper**: Structured pros/cons matrices for ambiguous decisions (e.g., "Should I promote Abhinay?").
- **Team Health Summary**: Single-prompt executive summary of overall team morale, risks, and recommended actions.

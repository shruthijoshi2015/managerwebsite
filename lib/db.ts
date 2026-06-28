import fs from 'fs';
import path from 'path';
import os from 'os';

function getDbFile(): string {
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || Boolean(process.env.VERCEL_ENV);
  if (isVercel) {
    const tmpFile = path.join(os.tmpdir(), 'data.json');
    const localFile = path.join(process.cwd(), 'data.json');
    if (!fs.existsSync(tmpFile) && fs.existsSync(localFile)) {
      try {
        fs.copyFileSync(localFile, tmpFile);
      } catch (e) {
        console.error("Could not copy initial DB to tmpdir:", e);
      }
    }
    return tmpFile;
  }
  return path.join(process.cwd(), 'data.json');
}

export type Goal = { 
  id: number; 
  title: string; 
  description?: string; 
  progress: number; 
  total: number; 
  completedAt?: string; 
  parentId?: number; 
  status?: 'on_track' | 'at_risk' | 'off_track' | 'achieved';
  icon?: string;
  tags?: string[];
  measurementType?: 'percent' | 'numeric' | 'boolean' | 'milestone';
  measurementStart?: number;
  measurementTarget?: number;
  dueDate?: string;
  priority?: 'P0' | 'P1' | 'P2';
  confidence?: number;
};
export type Task = { 
  id: number; 
  title: string; 
  done: boolean;
  status: 'pending' | 'in_progress' | 'resolved'; 
  priority: 'P0' | 'P1' | 'P2';
  timeframe?: string;
  completedAt?: string; 
  owner?: 'manager' | 'reportee'; 
  sourceNoteId?: number;
};
export type Note = { 
  id: number; 
  date: string; 
  type: string; 
  content: string; 
  aiSummary?: {
    tldr: string;
    signals: string[];
    skills: string[];
    sentiment: string;
    goalMentions: { goalTitle: string; suggestedAction: string }[];
    followUps: { task: string; timeframe: string }[];
  };
};

export type FreqConfig = { id: string; label: string; };
export type TemplateConfig = { id: string; type: 'frequency' | 'generic'; freqId?: string; name: string; content: string; };
export type CardConfig = {
  showProgressTrend: boolean;
  showWorkload: boolean;
  showQuickStats: boolean;
  showMeetingDates: boolean;
  showGoalProgress: boolean;
  showDepartment: boolean;
  fieldOrder: string[];
  cardSize?: 'mini' | 'compact' | 'large';
};

export type GoalModalConfig = {
  size: 'mini' | 'large';
  showDescription: boolean;
  showParentGoal: boolean;
  showTags: boolean;
  showDueDate: boolean;
  showPriority: boolean;
  showConfidence: boolean;
  showSubgoals: boolean;
};

export type Config = {
  checkInFrequencies: FreqConfig[];
  templates: TemplateConfig[];
  cardConfig: CardConfig;
  goalModalConfig?: GoalModalConfig;
};

export type Reportee = {
  id: number;
  name: string;
  role: string;
  email: string;
  status: string;
  checkInFreq: string;
  notes: Note[];
  goals: Goal[];
  tasks: Task[];
  scratchpad?: string;
  department?: string;
  seniority?: 'Junior' | 'Mid-Level' | 'Senior' | 'Lead' | 'Staff' | string;
  careerTrack?: 'Individual Contributor' | 'Management' | string;
  performance?: 'High Performer' | 'Steady' | 'Needs Improvement' | string;
  isManager?: boolean;
};

export type Database = {
  config: Config;
  team: Reportee[];
};

export function readDb(): Database {
  const dbFile = getDbFile();
  if (!fs.existsSync(dbFile)) {
    return { 
      config: { 
        checkInFrequencies: [], 
        templates: [], 
        cardConfig: { 
            showProgressTrend: true, 
            showWorkload: true, 
            showQuickStats: true, 
            showMeetingDates: true, 
            showGoalProgress: true, 
            showDepartment: true, 
            fieldOrder: ['showDepartment', 'showMeetingDates', 'showWorkload', 'showQuickStats', 'showGoalProgress', 'showProgressTrend'] 
        },
        goalModalConfig: {
            size: 'large',
            showDescription: true,
            showParentGoal: true,
            showTags: true,
            showDueDate: true,
            showPriority: true,
            showConfidence: true,
            showSubgoals: true
        }
      }, 
      team: [
            {
                    "id": 1,
                    "name": "Test User1",
                    "role": "Engineering Manager",
                    "email": "test.user1@company.com",
                    "status": "Online",
                    "checkInFreq": "weekly",
                    "isManager": true,
                    "department": "Engineering",
                    "seniority": "Lead",
                    "careerTrack": "Management",
                    "performance": "High Performer",
                    "notes": [
                            {
                                    "id": 1778084787729,
                                    "date": "2026-05-06T16:26:27.729Z",
                                    "type": "Quarterly Check-in",
                                    "content": "### Q1 Highlights\n\n### Goal Review\n\n### Areas of Improvement\n\n### Next Quarter Objectives\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"
                            },
                            {
                                    "id": 1778084772082,
                                    "date": "2026-05-06T16:26:12.082Z",
                                    "type": "Quarterly Check-in",
                                    "content": "### Q1 Highlights\n\n### Goal Review\n\n### Areas of Improvement\n\n### Next Quarter Objective\n\n\n\n\n\n\n\n\n\n"
                            },
                            {
                                    "id": 1776101245582,
                                    "date": "2026-04-13T17:27:25.582Z",
                                    "type": "Performance",
                                    "content": "### Strength Areas\n\n### Improvement Areas\n\n### 360 Feedback Summary\n"
                            },
                            {
                                    "id": 1776101197779,
                                    "date": "2026-04-13T17:26:37.779Z",
                                    "type": "Monthly Check-in",
                                    "content": "### Monthly Highlights\n\n### Goal Review\n\n### Areas of Improvement\n\n### Next Month Objectives\n"
                            },
                            {
                                    "id": 1776101185562,
                                    "date": "2026-04-13T17:26:25.562Z",
                                    "type": "Weekly Check-in",
                                    "content": "### How are you feeling this week?\n\n### What went well since we last spoke?\n\n### Any blockers or challenges?\n\n### Action Items\n- "
                            },
                            {
                                    "id": 1776502203304,
                                    "date": "2026-04-18T08:50:03.304Z",
                                    "type": "Monthly Check-in",
                                    "content": "11"
                            },
                            {
                                    "id": 1776502198303,
                                    "date": "2026-04-18T08:49:58.303Z",
                                    "type": "Monthly Check-in",
                                    "content": "### Monthly Highlights\n1\n### Goal Review\n\n### Areas of Improvement\n\n### Next Month Objectives\n"
                            },
                            {
                                    "id": 1776102394798,
                                    "date": "2026-04-13T17:46:34.798Z",
                                    "type": "Career Growth",
                                    "content": "### Long-term Career Goals\n\n### Skills to Develop\n\n### Mentorship Needs\n\n### Next Steps\n"
                            }
                    ],
                    "goals": [
                            {
                                    "id": 1782586695952,
                                    "title": "Deliver Strategic Roadmap",
                                    "progress": 20,
                                    "total": 100,
                                    "status": "on_track"
                            },
                            {
                                    "id": 101,
                                    "title": "Migrate Dashboard to React 19",
                                    "progress": 99,
                                    "total": 100,
                                    "status": "off_track",
                                    "dueDate": "2026-05-20"
                            },
                            {
                                    "id": 102,
                                    "title": "Complete Accessibility Audit",
                                    "progress": 100,
                                    "total": 100,
                                    "completedAt": "2026-05-06T16:14:21.492Z",
                                    "status": "achieved"
                            },
                            {
                                    "id": 1776525616341,
                                    "title": "Migrate Dashboard to React 19Migrate Dashboard to React 19Migrate Dashboard to React 19Migrate Dashboard to React 19Migrate Dashboard to React 19Migrate Dashboard to React 19",
                                    "progress": 100,
                                    "total": 100,
                                    "completedAt": "2026-05-06T16:14:34.860Z"
                            },
                            {
                                    "id": 1779212166066,
                                    "title": "testttttt",
                                    "progress": 90,
                                    "total": 100,
                                    "status": "on_track",
                                    "icon": "🚀",
                                    "tags": [],
                                    "measurementType": "percent",
                                    "measurementStart": 0,
                                    "measurementTarget": 100,
                                    "priority": "P0",
                                    "confidence": 7
                            },
                            {
                                    "id": 1779212166067,
                                    "title": "test",
                                    "progress": 100,
                                    "total": 100,
                                    "parentId": 1779212166066,
                                    "status": "on_track",
                                    "completedAt": "2026-05-19T17:36:14.866Z"
                            },
                            {
                                    "id": 1779212166068,
                                    "title": "test2",
                                    "progress": 100,
                                    "total": 100,
                                    "parentId": 1779212166066,
                                    "status": "on_track",
                                    "completedAt": "2026-05-19T17:36:21.075Z"
                            },
                            {
                                    "id": 1779212166070,
                                    "title": "test3",
                                    "progress": 100,
                                    "total": 100,
                                    "parentId": 1779212166066,
                                    "status": "on_track",
                                    "completedAt": "2026-05-19T17:36:22.488Z"
                            },
                            {
                                    "id": 1779212239577,
                                    "title": "kkk",
                                    "progress": 61,
                                    "total": 100,
                                    "parentId": 1779212166066,
                                    "status": "on_track",
                                    "icon": "🚀",
                                    "tags": [
                                            "hhh"
                                    ],
                                    "measurementType": "percent",
                                    "measurementStart": 0,
                                    "measurementTarget": 100,
                                    "priority": "P0",
                                    "confidence": 7,
                                    "description": "",
                                    "dueDate": ""
                            },
                            {
                                    "id": 1776101253757,
                                    "title": "test",
                                    "progress": 100,
                                    "total": 100,
                                    "completedAt": "2026-04-18T11:00:39.421Z"
                            },
                            {
                                    "id": 1776510297748,
                                    "title": "Test workspace and increase customer experience",
                                    "progress": 0,
                                    "total": 100
                            },
                            {
                                    "id": 1776101510527,
                                    "title": "test",
                                    "progress": 100,
                                    "total": 100
                            },
                            {
                                    "id": 1776502030433,
                                    "title": "t",
                                    "progress": 100,
                                    "total": 100
                            },
                            {
                                    "id": 1776502038895,
                                    "title": "21",
                                    "progress": 100,
                                    "total": 100
                            },
                            {
                                    "id": 1776502044451,
                                    "title": "222",
                                    "progress": 100,
                                    "total": 100
                            },
                            {
                                    "id": 1776101841024,
                                    "title": "tt",
                                    "progress": 0,
                                    "total": 100
                            }
                    ],
                    "tasks": [
                            {
                                    "id": 1782586695953,
                                    "title": "Conduct Weekly Syncs",
                                    "done": false,
                                    "status": "pending",
                                    "priority": "P0",
                                    "timeframe": "This Week"
                            },
                            {
                                    "id": 201,
                                    "title": "Review PR #4052",
                                    "done": true,
                                    "completedAt": "2026-04-12T10:00:00.000Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 202,
                                    "title": "Update Button Component spacing",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-04-18T11:20:28.260Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776501647925,
                                    "title": "STA ",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-04-18T08:58:54.690Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776502741576,
                                    "title": "Z",
                                    "done": true,
                                    "owner": "reportee",
                                    "completedAt": "2026-04-18T08:59:05.287Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1779735980352,
                                    "title": "Test upcoming feature release",
                                    "done": false,
                                    "owner": "reportee",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776102093973,
                                    "title": "test",
                                    "done": true,
                                    "completedAt": "2026-04-13T17:41:39.360Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776103072852,
                                    "title": "test",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-04-18T15:25:16.189Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776103078556,
                                    "title": "ttt",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-04-13T18:11:00.576Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776103851090,
                                    "title": "ttt",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-04-13T18:10:59.615Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776103854845,
                                    "title": "ttt",
                                    "done": true,
                                    "owner": "reportee",
                                    "completedAt": "2026-04-13T18:11:02.022Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776103893662,
                                    "title": "ff",
                                    "done": false,
                                    "owner": "reportee",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776510415707,
                                    "title": "Y is this not working, can you make it work and this should be big enough to review lengthy message",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-05-19T16:39:10.522Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776526032678,
                                    "title": "jjj",
                                    "done": true,
                                    "owner": "reportee",
                                    "completedAt": "2026-04-18T15:27:20.787Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            }
                    ]
            },
            {
                    "id": 2,
                    "name": "Test User2",
                    "role": "Senior Software Engineer",
                    "email": "test.user2@company.com",
                    "status": "Online",
                    "checkInFreq": "bi-weekly",
                    "isManager": false,
                    "department": "Engineering",
                    "seniority": "Senior",
                    "careerTrack": "Individual Contributor",
                    "performance": "High Performer",
                    "notes": [
                            {
                                    "id": 1776102391576,
                                    "date": "2026-04-13T17:46:31.576Z",
                                    "type": "Career Growth",
                                    "content": "### Long-term Career Goals\n\n### Skills to Develop\n\n### Mentorship Needs\n\n### Next Steps\n"
                            },
                            {
                                    "id": 1776102385853,
                                    "date": "2026-04-13T17:46:25.853Z",
                                    "type": "Weekly Check-in",
                                    "content": "### How are you feeling this week?\n\n### What went well since we last spoke?\n\n### Any blockers or challenges?\n\n### Action Items\n- "
                            },
                            {
                                    "id": 1780119184748,
                                    "date": "2026-05-30T05:33:04.749Z",
                                    "type": "Weekly Check-in",
                                    "content": "Had a really productive week overall. Sarah has been making strong progress on the React 19 migration — she mentioned the dashboard module is nearly complete and she's now tackling the settings page components. I'd estimate the Migrate Dashboard to React 19 goal is around 95% now. She demonstrated solid expertise in React hooks, TypeScript generics, and system design patterns throughout the migration.\n\nOne concern: she flagged that she's blocked on the design team for the new accessibility modal — they haven't delivered the updated Figma specs yet. This is a cross-team dependency that could delay the accessibility audit follow-up work. She seemed a bit frustrated about this, saying she's been waiting for over a week with no response.\n\nOn a positive note, she took the initiative to mentor two junior devs on component architecture this week — great leadership and communication skills on display. She also helped debug a critical production issue in the payment flow, showing strong debugging and incident response capabilities.\n\nWe discussed her career growth and she expressed interest in moving toward a tech lead role. Let's revisit this in our next 1:1 on June 10th. I also want to follow up on the design team blocker by next Tuesday — I'll ping the design lead directly.\n\nAction items: Sarah will write up a migration runbook by end of next week, and I need to schedule a skip-level with her director before June 15th to discuss the tech lead path.",
                                    "aiSummary": {
                                            "tldr": "Sarah made strong progress on the React 19 migration (95% complete for dashboard) and showed excellent leadership by mentoring juniors and debugging a critical production issue. However, she's blocked by the design team for new accessibility modal specs, causing frustration and potential delays. She's also expressed interest in a tech lead role.",
                                            "signals": [
                                                    "Positive momentum",
                                                    "Cross-team dependency",
                                                    "Blocked",
                                                    "Employee frustration",
                                                    "Leadership demonstrated",
                                                    "Mentorship",
                                                    "Incident response",
                                                    "Career growth interest"
                                            ],
                                            "skills": [
                                                    "React",
                                                    "TypeScript",
                                                    "System Design",
                                                    "React Hooks",
                                                    "Component Architecture",
                                                    "Leadership",
                                                    "Communication",
                                                    "Debugging",
                                                    "Incident Response"
                                            ],
                                            "sentiment": "Positive",
                                            "goalMentions": [],
                                            "followUps": [
                                                    {
                                                            "task": "Revisit career growth discussion for tech lead role with Sarah",
                                                            "timeframe": "June 10th"
                                                    },
                                                    {
                                                            "task": "Follow up on design team blocker for accessibility modal",
                                                            "timeframe": "next Tuesday"
                                                    },
                                                    {
                                                            "task": "Schedule skip-level with Sarah's director to discuss tech lead path",
                                                            "timeframe": "before June 15th"
                                                    }
                                            ]
                                    }
                            },
                            {
                                    "id": 1780068981110,
                                    "date": "2026-05-29T15:36:21.110Z",
                                    "type": "Weekly Check-in",
                                    "content": "Amazing work in previous sprint"
                            },
                            {
                                    "id": 1780061006466,
                                    "date": "2026-05-29T13:23:26.466Z",
                                    "type": "Weekly Check-in",
                                    "content": "1.Great job on your work"
                            },
                            {
                                    "id": 1780060916539,
                                    "date": "2026-05-29T13:21:56.539Z",
                                    "type": "[DEMO] AI Stress Test",
                                    "content": "They mentioned they are 80% done on the Migration goal! Great job leading the sprint planning this week. However, they are feeling a bit burnt out from the recent crunch, and they are currently blocked waiting on design mockups for the new feature. We didn't get a chance to talk about their promotion path, let's revisit that in 2 weeks."
                            },
                            {
                                    "id": 1778082887572,
                                    "date": "2026-05-06T15:54:47.572Z",
                                    "type": "Weekly Check-in",
                                    "content": "### How are you feeling this week?\n\n### What went well since we last spoke?\n\n### Any blockers or challenges?\n\n### Action Items\n\n\n\n\n\n\n\n\n\ndnfld\n\n- "
                            }
                    ],
                    "goals": [
                            {
                                    "id": 1776103904201,
                                    "title": "ff",
                                    "progress": 100,
                                    "total": 100
                            },
                            {
                                    "id": 1776505886843,
                                    "title": "tt",
                                    "progress": 0,
                                    "total": 100
                            },
                            {
                                    "id": 1776505894572,
                                    "title": "uu",
                                    "progress": 0,
                                    "total": 100
                            },
                            {
                                    "id": 1776505901355,
                                    "title": "iopsdjfoiehfoieoifvsonsonc nboisnvios nos foseihf o osnoies onsoi ",
                                    "progress": 0,
                                    "total": 100
                            },
                            {
                                    "id": 1776505910793,
                                    "title": "fefef",
                                    "progress": 0,
                                    "total": 100
                            },
                            {
                                    "id": 1776525992082,
                                    "title": "hhh",
                                    "progress": 100,
                                    "total": 100,
                                    "completedAt": "2026-04-18T15:26:35.049Z"
                            },
                            {
                                    "id": 1778081443996,
                                    "title": "test",
                                    "progress": 100,
                                    "total": 100,
                                    "completedAt": "2026-05-06T15:30:48.687Z"
                            },
                            {
                                    "id": 1778086640421,
                                    "title": "Test Goal",
                                    "description": "Goal is a goal",
                                    "progress": 32,
                                    "total": 100,
                                    "status": "at_risk",
                                    "dueDate": "2026-06-01"
                            },
                            {
                                    "id": 1778086654985,
                                    "title": "test2",
                                    "description": "child goal",
                                    "progress": 0,
                                    "total": 100,
                                    "parentId": 1778086640421
                            },
                            {
                                    "id": 1778086729834,
                                    "title": "ggg",
                                    "description": "ggg",
                                    "progress": 64,
                                    "total": 100,
                                    "parentId": 1778086640421
                            },
                            {
                                    "id": 1778088864357,
                                    "title": "test",
                                    "progress": 0,
                                    "total": 100,
                                    "parentId": 1776525992082,
                                    "status": "on_track"
                            },
                            {
                                    "id": 1778088872185,
                                    "title": "test2",
                                    "progress": 0,
                                    "total": 100,
                                    "parentId": 1776525992082,
                                    "status": "on_track"
                            },
                            {
                                    "id": 1778347963415,
                                    "title": "Enhance Delegation Skills",
                                    "description": "This goal supports both the manager's development and team empowerment by successfully transitioning two recurring tasks to direct reports, measured by their independent execution for a full cycle by quarter-end.",
                                    "progress": 50,
                                    "total": 100,
                                    "status": "on_track"
                            },
                            {
                                    "id": 1778347989722,
                                    "title": "Close Team Skill Gaps",
                                    "description": "By end of Q2, increase team's proficiency in data analysis by 20% through targeted training and project assignments, to improve data-driven decision making.",
                                    "progress": 0,
                                    "total": 100,
                                    "status": "on_track"
                            },
                            {
                                    "id": 1778351326424,
                                    "title": "test",
                                    "progress": 0,
                                    "total": 100,
                                    "parentId": 1778347963415,
                                    "status": "on_track"
                            }
                    ],
                    "tasks": [
                            {
                                    "id": 1780060939162,
                                    "title": "Review latest pull requests discussed",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-05-30T06:44:51.438Z"
                            },
                            {
                                    "id": 1780060939646,
                                    "title": "[Follow-up] Schedule follow-up sync (Next week)",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-05-30T06:44:53.074Z"
                            },
                            {
                                    "id": 1780068990764,
                                    "title": "[Kudos] Shoutout for: Amazing work in previous sprint",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-05-30T06:44:54.280Z"
                            },
                            {
                                    "id": 1780119292257,
                                    "title": "Write up a migration runbook",
                                    "done": true,
                                    "owner": "reportee",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-05-30T06:44:55.354Z"
                            },
                            {
                                    "id": 1780119292596,
                                    "title": "Schedule a skip-level with director to discuss tech lead path",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-06-28T05:22:05.621Z"
                            },
                            {
                                    "id": 1780119292893,
                                    "title": "Ping the design lead directly regarding the accessibility modal blocker",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-06-28T05:22:07.022Z"
                            },
                            {
                                    "id": 1780119293210,
                                    "title": "[Follow-up] Revisit career growth and tech lead role discussion (June 10th (next 1:1))",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119293517,
                                    "title": "[Follow-up] Follow up on design team blocker (next Tuesday)",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-06-28T05:22:21.239Z"
                            },
                            {
                                    "id": 1780119293795,
                                    "title": "[Watch] Frustrated about being blocked by the design team on the new accessibility modal, waiting over a week for Figma specs.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119294119,
                                    "title": "[Blocker] Resolve: Blocked on the design team for the new accessibility modal; they haven't delivered the updated Figma specs yet.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119294543,
                                    "title": "[Kudos] Shoutout for: Demonstrated solid expertise in React hooks, TypeScript generics, and system design patterns throughout the React 19 migration.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119294907,
                                    "title": "[Kudos] Shoutout for: Took the initiative to mentor two junior devs on component architecture, showing great leadership and communication skills.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P0",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119295198,
                                    "title": "[Kudos] Shoutout for: Helped debug a critical production issue in the payment flow, showing strong debugging and incident response capabilities.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119295507,
                                    "title": "[Agenda] Next 1:1 - Revisit discussion on career growth and moving toward a tech lead role.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            }
                    ]
            }
    ]
    };
  }
  const data = fs.readFileSync(dbFile, 'utf-8');
  const parsed = JSON.parse(data);
  if (!parsed.config) {
    parsed.config = { 
      checkInFrequencies: [], 
      templates: [],
      cardConfig: { showProgressTrend: true, showWorkload: true, showQuickStats: true, showMeetingDates: true, showGoalProgress: true, showDepartment: true, fieldOrder: ['showDepartment', 'showMeetingDates', 'showWorkload', 'showQuickStats', 'showGoalProgress', 'showProgressTrend'] }
    };
  } else if (!parsed.config.cardConfig) {
    parsed.config.cardConfig = { showProgressTrend: true, showWorkload: true, showQuickStats: true, showMeetingDates: true, showGoalProgress: true, showDepartment: true, fieldOrder: ['showDepartment', 'showMeetingDates', 'showWorkload', 'showQuickStats', 'showGoalProgress', 'showProgressTrend'] };
  } else {
    // Ensure new properties exist
    if (parsed.config.cardConfig.showGoalProgress === undefined) parsed.config.cardConfig.showGoalProgress = true;
    if (parsed.config.cardConfig.showDepartment === undefined) parsed.config.cardConfig.showDepartment = true;
    if (parsed.config.cardConfig.fieldOrder === undefined) {
      parsed.config.cardConfig.fieldOrder = ['showDepartment', 'showMeetingDates', 'showWorkload', 'showQuickStats', 'showGoalProgress', 'showProgressTrend'];
    } else {
      // Migrate old keys
      parsed.config.cardConfig.fieldOrder = parsed.config.cardConfig.fieldOrder.map((k: string) => {
        if (!k.startsWith('show')) {
          return 'show' + k.charAt(0).toUpperCase() + k.slice(1);
        }
        return k;
      });
    }
  }

  // Migrate tasks
  if (!parsed.team || parsed.team.length === 0) {
    parsed.team = [
            {
                    "id": 1,
                    "name": "Test User1",
                    "role": "Engineering Manager",
                    "email": "test.user1@company.com",
                    "status": "Online",
                    "checkInFreq": "weekly",
                    "isManager": true,
                    "department": "Engineering",
                    "seniority": "Lead",
                    "careerTrack": "Management",
                    "performance": "High Performer",
                    "notes": [
                            {
                                    "id": 1778084787729,
                                    "date": "2026-05-06T16:26:27.729Z",
                                    "type": "Quarterly Check-in",
                                    "content": "### Q1 Highlights\n\n### Goal Review\n\n### Areas of Improvement\n\n### Next Quarter Objectives\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"
                            },
                            {
                                    "id": 1778084772082,
                                    "date": "2026-05-06T16:26:12.082Z",
                                    "type": "Quarterly Check-in",
                                    "content": "### Q1 Highlights\n\n### Goal Review\n\n### Areas of Improvement\n\n### Next Quarter Objective\n\n\n\n\n\n\n\n\n\n"
                            },
                            {
                                    "id": 1776101245582,
                                    "date": "2026-04-13T17:27:25.582Z",
                                    "type": "Performance",
                                    "content": "### Strength Areas\n\n### Improvement Areas\n\n### 360 Feedback Summary\n"
                            },
                            {
                                    "id": 1776101197779,
                                    "date": "2026-04-13T17:26:37.779Z",
                                    "type": "Monthly Check-in",
                                    "content": "### Monthly Highlights\n\n### Goal Review\n\n### Areas of Improvement\n\n### Next Month Objectives\n"
                            },
                            {
                                    "id": 1776101185562,
                                    "date": "2026-04-13T17:26:25.562Z",
                                    "type": "Weekly Check-in",
                                    "content": "### How are you feeling this week?\n\n### What went well since we last spoke?\n\n### Any blockers or challenges?\n\n### Action Items\n- "
                            },
                            {
                                    "id": 1776502203304,
                                    "date": "2026-04-18T08:50:03.304Z",
                                    "type": "Monthly Check-in",
                                    "content": "11"
                            },
                            {
                                    "id": 1776502198303,
                                    "date": "2026-04-18T08:49:58.303Z",
                                    "type": "Monthly Check-in",
                                    "content": "### Monthly Highlights\n1\n### Goal Review\n\n### Areas of Improvement\n\n### Next Month Objectives\n"
                            },
                            {
                                    "id": 1776102394798,
                                    "date": "2026-04-13T17:46:34.798Z",
                                    "type": "Career Growth",
                                    "content": "### Long-term Career Goals\n\n### Skills to Develop\n\n### Mentorship Needs\n\n### Next Steps\n"
                            }
                    ],
                    "goals": [
                            {
                                    "id": 1782586695952,
                                    "title": "Deliver Strategic Roadmap",
                                    "progress": 20,
                                    "total": 100,
                                    "status": "on_track"
                            },
                            {
                                    "id": 101,
                                    "title": "Migrate Dashboard to React 19",
                                    "progress": 99,
                                    "total": 100,
                                    "status": "off_track",
                                    "dueDate": "2026-05-20"
                            },
                            {
                                    "id": 102,
                                    "title": "Complete Accessibility Audit",
                                    "progress": 100,
                                    "total": 100,
                                    "completedAt": "2026-05-06T16:14:21.492Z",
                                    "status": "achieved"
                            },
                            {
                                    "id": 1776525616341,
                                    "title": "Migrate Dashboard to React 19Migrate Dashboard to React 19Migrate Dashboard to React 19Migrate Dashboard to React 19Migrate Dashboard to React 19Migrate Dashboard to React 19",
                                    "progress": 100,
                                    "total": 100,
                                    "completedAt": "2026-05-06T16:14:34.860Z"
                            },
                            {
                                    "id": 1779212166066,
                                    "title": "testttttt",
                                    "progress": 90,
                                    "total": 100,
                                    "status": "on_track",
                                    "icon": "🚀",
                                    "tags": [],
                                    "measurementType": "percent",
                                    "measurementStart": 0,
                                    "measurementTarget": 100,
                                    "priority": "P0",
                                    "confidence": 7
                            },
                            {
                                    "id": 1779212166067,
                                    "title": "test",
                                    "progress": 100,
                                    "total": 100,
                                    "parentId": 1779212166066,
                                    "status": "on_track",
                                    "completedAt": "2026-05-19T17:36:14.866Z"
                            },
                            {
                                    "id": 1779212166068,
                                    "title": "test2",
                                    "progress": 100,
                                    "total": 100,
                                    "parentId": 1779212166066,
                                    "status": "on_track",
                                    "completedAt": "2026-05-19T17:36:21.075Z"
                            },
                            {
                                    "id": 1779212166070,
                                    "title": "test3",
                                    "progress": 100,
                                    "total": 100,
                                    "parentId": 1779212166066,
                                    "status": "on_track",
                                    "completedAt": "2026-05-19T17:36:22.488Z"
                            },
                            {
                                    "id": 1779212239577,
                                    "title": "kkk",
                                    "progress": 61,
                                    "total": 100,
                                    "parentId": 1779212166066,
                                    "status": "on_track",
                                    "icon": "🚀",
                                    "tags": [
                                            "hhh"
                                    ],
                                    "measurementType": "percent",
                                    "measurementStart": 0,
                                    "measurementTarget": 100,
                                    "priority": "P0",
                                    "confidence": 7,
                                    "description": "",
                                    "dueDate": ""
                            },
                            {
                                    "id": 1776101253757,
                                    "title": "test",
                                    "progress": 100,
                                    "total": 100,
                                    "completedAt": "2026-04-18T11:00:39.421Z"
                            },
                            {
                                    "id": 1776510297748,
                                    "title": "Test workspace and increase customer experience",
                                    "progress": 0,
                                    "total": 100
                            },
                            {
                                    "id": 1776101510527,
                                    "title": "test",
                                    "progress": 100,
                                    "total": 100
                            },
                            {
                                    "id": 1776502030433,
                                    "title": "t",
                                    "progress": 100,
                                    "total": 100
                            },
                            {
                                    "id": 1776502038895,
                                    "title": "21",
                                    "progress": 100,
                                    "total": 100
                            },
                            {
                                    "id": 1776502044451,
                                    "title": "222",
                                    "progress": 100,
                                    "total": 100
                            },
                            {
                                    "id": 1776101841024,
                                    "title": "tt",
                                    "progress": 0,
                                    "total": 100
                            }
                    ],
                    "tasks": [
                            {
                                    "id": 1782586695953,
                                    "title": "Conduct Weekly Syncs",
                                    "done": false,
                                    "status": "pending",
                                    "priority": "P0",
                                    "timeframe": "This Week"
                            },
                            {
                                    "id": 201,
                                    "title": "Review PR #4052",
                                    "done": true,
                                    "completedAt": "2026-04-12T10:00:00.000Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 202,
                                    "title": "Update Button Component spacing",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-04-18T11:20:28.260Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776501647925,
                                    "title": "STA ",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-04-18T08:58:54.690Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776502741576,
                                    "title": "Z",
                                    "done": true,
                                    "owner": "reportee",
                                    "completedAt": "2026-04-18T08:59:05.287Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1779735980352,
                                    "title": "Test upcoming feature release",
                                    "done": false,
                                    "owner": "reportee",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776102093973,
                                    "title": "test",
                                    "done": true,
                                    "completedAt": "2026-04-13T17:41:39.360Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776103072852,
                                    "title": "test",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-04-18T15:25:16.189Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776103078556,
                                    "title": "ttt",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-04-13T18:11:00.576Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776103851090,
                                    "title": "ttt",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-04-13T18:10:59.615Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776103854845,
                                    "title": "ttt",
                                    "done": true,
                                    "owner": "reportee",
                                    "completedAt": "2026-04-13T18:11:02.022Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776103893662,
                                    "title": "ff",
                                    "done": false,
                                    "owner": "reportee",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776510415707,
                                    "title": "Y is this not working, can you make it work and this should be big enough to review lengthy message",
                                    "done": true,
                                    "owner": "manager",
                                    "completedAt": "2026-05-19T16:39:10.522Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1776526032678,
                                    "title": "jjj",
                                    "done": true,
                                    "owner": "reportee",
                                    "completedAt": "2026-04-18T15:27:20.787Z",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            }
                    ]
            },
            {
                    "id": 2,
                    "name": "Test User2",
                    "role": "Senior Software Engineer",
                    "email": "test.user2@company.com",
                    "status": "Online",
                    "checkInFreq": "bi-weekly",
                    "isManager": false,
                    "department": "Engineering",
                    "seniority": "Senior",
                    "careerTrack": "Individual Contributor",
                    "performance": "High Performer",
                    "notes": [
                            {
                                    "id": 1776102391576,
                                    "date": "2026-04-13T17:46:31.576Z",
                                    "type": "Career Growth",
                                    "content": "### Long-term Career Goals\n\n### Skills to Develop\n\n### Mentorship Needs\n\n### Next Steps\n"
                            },
                            {
                                    "id": 1776102385853,
                                    "date": "2026-04-13T17:46:25.853Z",
                                    "type": "Weekly Check-in",
                                    "content": "### How are you feeling this week?\n\n### What went well since we last spoke?\n\n### Any blockers or challenges?\n\n### Action Items\n- "
                            },
                            {
                                    "id": 1780119184748,
                                    "date": "2026-05-30T05:33:04.749Z",
                                    "type": "Weekly Check-in",
                                    "content": "Had a really productive week overall. Sarah has been making strong progress on the React 19 migration — she mentioned the dashboard module is nearly complete and she's now tackling the settings page components. I'd estimate the Migrate Dashboard to React 19 goal is around 95% now. She demonstrated solid expertise in React hooks, TypeScript generics, and system design patterns throughout the migration.\n\nOne concern: she flagged that she's blocked on the design team for the new accessibility modal — they haven't delivered the updated Figma specs yet. This is a cross-team dependency that could delay the accessibility audit follow-up work. She seemed a bit frustrated about this, saying she's been waiting for over a week with no response.\n\nOn a positive note, she took the initiative to mentor two junior devs on component architecture this week — great leadership and communication skills on display. She also helped debug a critical production issue in the payment flow, showing strong debugging and incident response capabilities.\n\nWe discussed her career growth and she expressed interest in moving toward a tech lead role. Let's revisit this in our next 1:1 on June 10th. I also want to follow up on the design team blocker by next Tuesday — I'll ping the design lead directly.\n\nAction items: Sarah will write up a migration runbook by end of next week, and I need to schedule a skip-level with her director before June 15th to discuss the tech lead path.",
                                    "aiSummary": {
                                            "tldr": "Sarah made strong progress on the React 19 migration (95% complete for dashboard) and showed excellent leadership by mentoring juniors and debugging a critical production issue. However, she's blocked by the design team for new accessibility modal specs, causing frustration and potential delays. She's also expressed interest in a tech lead role.",
                                            "signals": [
                                                    "Positive momentum",
                                                    "Cross-team dependency",
                                                    "Blocked",
                                                    "Employee frustration",
                                                    "Leadership demonstrated",
                                                    "Mentorship",
                                                    "Incident response",
                                                    "Career growth interest"
                                            ],
                                            "skills": [
                                                    "React",
                                                    "TypeScript",
                                                    "System Design",
                                                    "React Hooks",
                                                    "Component Architecture",
                                                    "Leadership",
                                                    "Communication",
                                                    "Debugging",
                                                    "Incident Response"
                                            ],
                                            "sentiment": "Positive",
                                            "goalMentions": [],
                                            "followUps": [
                                                    {
                                                            "task": "Revisit career growth discussion for tech lead role with Sarah",
                                                            "timeframe": "June 10th"
                                                    },
                                                    {
                                                            "task": "Follow up on design team blocker for accessibility modal",
                                                            "timeframe": "next Tuesday"
                                                    },
                                                    {
                                                            "task": "Schedule skip-level with Sarah's director to discuss tech lead path",
                                                            "timeframe": "before June 15th"
                                                    }
                                            ]
                                    }
                            },
                            {
                                    "id": 1780068981110,
                                    "date": "2026-05-29T15:36:21.110Z",
                                    "type": "Weekly Check-in",
                                    "content": "Amazing work in previous sprint"
                            },
                            {
                                    "id": 1780061006466,
                                    "date": "2026-05-29T13:23:26.466Z",
                                    "type": "Weekly Check-in",
                                    "content": "1.Great job on your work"
                            },
                            {
                                    "id": 1780060916539,
                                    "date": "2026-05-29T13:21:56.539Z",
                                    "type": "[DEMO] AI Stress Test",
                                    "content": "They mentioned they are 80% done on the Migration goal! Great job leading the sprint planning this week. However, they are feeling a bit burnt out from the recent crunch, and they are currently blocked waiting on design mockups for the new feature. We didn't get a chance to talk about their promotion path, let's revisit that in 2 weeks."
                            },
                            {
                                    "id": 1778082887572,
                                    "date": "2026-05-06T15:54:47.572Z",
                                    "type": "Weekly Check-in",
                                    "content": "### How are you feeling this week?\n\n### What went well since we last spoke?\n\n### Any blockers or challenges?\n\n### Action Items\n\n\n\n\n\n\n\n\n\ndnfld\n\n- "
                            }
                    ],
                    "goals": [
                            {
                                    "id": 1776103904201,
                                    "title": "ff",
                                    "progress": 100,
                                    "total": 100
                            },
                            {
                                    "id": 1776505886843,
                                    "title": "tt",
                                    "progress": 0,
                                    "total": 100
                            },
                            {
                                    "id": 1776505894572,
                                    "title": "uu",
                                    "progress": 0,
                                    "total": 100
                            },
                            {
                                    "id": 1776505901355,
                                    "title": "iopsdjfoiehfoieoifvsonsonc nboisnvios nos foseihf o osnoies onsoi ",
                                    "progress": 0,
                                    "total": 100
                            },
                            {
                                    "id": 1776505910793,
                                    "title": "fefef",
                                    "progress": 0,
                                    "total": 100
                            },
                            {
                                    "id": 1776525992082,
                                    "title": "hhh",
                                    "progress": 100,
                                    "total": 100,
                                    "completedAt": "2026-04-18T15:26:35.049Z"
                            },
                            {
                                    "id": 1778081443996,
                                    "title": "test",
                                    "progress": 100,
                                    "total": 100,
                                    "completedAt": "2026-05-06T15:30:48.687Z"
                            },
                            {
                                    "id": 1778086640421,
                                    "title": "Test Goal",
                                    "description": "Goal is a goal",
                                    "progress": 32,
                                    "total": 100,
                                    "status": "at_risk",
                                    "dueDate": "2026-06-01"
                            },
                            {
                                    "id": 1778086654985,
                                    "title": "test2",
                                    "description": "child goal",
                                    "progress": 0,
                                    "total": 100,
                                    "parentId": 1778086640421
                            },
                            {
                                    "id": 1778086729834,
                                    "title": "ggg",
                                    "description": "ggg",
                                    "progress": 64,
                                    "total": 100,
                                    "parentId": 1778086640421
                            },
                            {
                                    "id": 1778088864357,
                                    "title": "test",
                                    "progress": 0,
                                    "total": 100,
                                    "parentId": 1776525992082,
                                    "status": "on_track"
                            },
                            {
                                    "id": 1778088872185,
                                    "title": "test2",
                                    "progress": 0,
                                    "total": 100,
                                    "parentId": 1776525992082,
                                    "status": "on_track"
                            },
                            {
                                    "id": 1778347963415,
                                    "title": "Enhance Delegation Skills",
                                    "description": "This goal supports both the manager's development and team empowerment by successfully transitioning two recurring tasks to direct reports, measured by their independent execution for a full cycle by quarter-end.",
                                    "progress": 50,
                                    "total": 100,
                                    "status": "on_track"
                            },
                            {
                                    "id": 1778347989722,
                                    "title": "Close Team Skill Gaps",
                                    "description": "By end of Q2, increase team's proficiency in data analysis by 20% through targeted training and project assignments, to improve data-driven decision making.",
                                    "progress": 0,
                                    "total": 100,
                                    "status": "on_track"
                            },
                            {
                                    "id": 1778351326424,
                                    "title": "test",
                                    "progress": 0,
                                    "total": 100,
                                    "parentId": 1778347963415,
                                    "status": "on_track"
                            }
                    ],
                    "tasks": [
                            {
                                    "id": 1780060939162,
                                    "title": "Review latest pull requests discussed",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-05-30T06:44:51.438Z"
                            },
                            {
                                    "id": 1780060939646,
                                    "title": "[Follow-up] Schedule follow-up sync (Next week)",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-05-30T06:44:53.074Z"
                            },
                            {
                                    "id": 1780068990764,
                                    "title": "[Kudos] Shoutout for: Amazing work in previous sprint",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-05-30T06:44:54.280Z"
                            },
                            {
                                    "id": 1780119292257,
                                    "title": "Write up a migration runbook",
                                    "done": true,
                                    "owner": "reportee",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-05-30T06:44:55.354Z"
                            },
                            {
                                    "id": 1780119292596,
                                    "title": "Schedule a skip-level with director to discuss tech lead path",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-06-28T05:22:05.621Z"
                            },
                            {
                                    "id": 1780119292893,
                                    "title": "Ping the design lead directly regarding the accessibility modal blocker",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-06-28T05:22:07.022Z"
                            },
                            {
                                    "id": 1780119293210,
                                    "title": "[Follow-up] Revisit career growth and tech lead role discussion (June 10th (next 1:1))",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119293517,
                                    "title": "[Follow-up] Follow up on design team blocker (next Tuesday)",
                                    "done": true,
                                    "owner": "manager",
                                    "status": "resolved",
                                    "priority": "P2",
                                    "timeframe": "No Due Date",
                                    "completedAt": "2026-06-28T05:22:21.239Z"
                            },
                            {
                                    "id": 1780119293795,
                                    "title": "[Watch] Frustrated about being blocked by the design team on the new accessibility modal, waiting over a week for Figma specs.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119294119,
                                    "title": "[Blocker] Resolve: Blocked on the design team for the new accessibility modal; they haven't delivered the updated Figma specs yet.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119294543,
                                    "title": "[Kudos] Shoutout for: Demonstrated solid expertise in React hooks, TypeScript generics, and system design patterns throughout the React 19 migration.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119294907,
                                    "title": "[Kudos] Shoutout for: Took the initiative to mentor two junior devs on component architecture, showing great leadership and communication skills.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P0",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119295198,
                                    "title": "[Kudos] Shoutout for: Helped debug a critical production issue in the payment flow, showing strong debugging and incident response capabilities.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            },
                            {
                                    "id": 1780119295507,
                                    "title": "[Agenda] Next 1:1 - Revisit discussion on career growth and moving toward a tech lead role.",
                                    "done": false,
                                    "owner": "manager",
                                    "status": "pending",
                                    "priority": "P2",
                                    "timeframe": "No Due Date"
                            }
                    ]
            }
    ];
  } else if (parsed.team) {
    parsed.team.forEach((member: Reportee) => {
      if (member.tasks) {
        member.tasks = member.tasks.map((task: any) => {
          if (task.status) {
            task.done = task.status === 'resolved';
          } else if (task.done !== undefined) {
            task.status = task.done ? 'resolved' : 'pending';
          } else {
            task.done = false;
            task.status = 'pending';
          }
          if (!task.priority) task.priority = 'P2';
          if (!task.timeframe) task.timeframe = 'No Due Date';
          return task;
        });
      }
    });
  }

  return parsed;
}

export function writeDb(db: Database) {
  const dbFile = getDbFile();
  try {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write DB file:", e);
  }
}

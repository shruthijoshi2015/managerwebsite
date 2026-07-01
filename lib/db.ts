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

export const DEFAULT_FREQUENCIES: FreqConfig[] = [
  { id: "weekly", label: "Weekly Check-in" },
  { id: "monthly", label: "Monthly Check-in" },
  { id: "quarterly", label: "Quarterly Check-in" },
  { id: "performance", label: "Performance Review" }
];

export const DEFAULT_TEMPLATES: TemplateConfig[] = [
  {
    id: "t_weekly",
    type: "frequency",
    freqId: "weekly",
    name: "Weekly Check-in",
    content: "### Highlights & Wins\n- \n\n### Current Focus & Priorities\n- \n\n### Roadblocks & Support Needed\n- \n\n### Action Items\n- [ ] \n"
  },
  {
    id: "t_monthly",
    type: "frequency",
    freqId: "monthly",
    name: "Monthly Check-in",
    content: "### Monthly Highlights & Accomplishments\n- \n\n### Goal Progress Review\n- \n\n### Growth & Development Discussion\n- \n\n### Next Month Objectives\n- [ ] \n"
  },
  {
    id: "t_quarterly",
    type: "frequency",
    freqId: "quarterly",
    name: "Quarterly Check-in",
    content: "### Quarterly Review & Key Achievements\n- \n\n### OKRs & Strategic Alignment\n- \n\n### Career Aspirations & Feedback\n- \n\n### Objectives for Next Quarter\n- [ ] \n"
  },
  {
    id: "t_perf",
    type: "frequency",
    freqId: "performance",
    name: "Performance Check-in",
    content: "### Performance Evaluation & Strengths\n- \n\n### Core Competencies Review\n- \n\n### Areas for Growth & Coaching\n- \n\n### Action Plan & Next Steps\n- [ ] \n"
  }
];

export function readDb(): Database {
  const dbFile = getDbFile();
  if (!fs.existsSync(dbFile)) {
    return { 
      config: { 
        checkInFrequencies: DEFAULT_FREQUENCIES, 
        templates: DEFAULT_TEMPLATES, 
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
      team: []
    };
  }
  const data = fs.readFileSync(dbFile, 'utf-8');
  const parsed = JSON.parse(data);
  if (!parsed.config) {
    parsed.config = { 
      checkInFrequencies: DEFAULT_FREQUENCIES, 
      templates: DEFAULT_TEMPLATES,
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
  if (!parsed.config.checkInFrequencies || parsed.config.checkInFrequencies.length === 0) {
    parsed.config.checkInFrequencies = DEFAULT_FREQUENCIES;
  }
  if (!parsed.config.templates || parsed.config.templates.length === 0) {
    parsed.config.templates = DEFAULT_TEMPLATES;
  }
  if (!parsed.team) {
    parsed.team = [];
  }
  parsed.team.forEach((member: Reportee) => {
    if (member.isManager) {
      if (member.goals) {
        member.goals = member.goals.filter(g => g.title !== "Deliver Strategic Roadmap");
      }
      if (member.tasks) {
        member.tasks = member.tasks.filter(t => t.title !== "Conduct Weekly Syncs");
      }
    }
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

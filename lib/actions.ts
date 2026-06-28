"use server";
import { readDb, writeDb, Reportee, Note, Task, Goal } from './db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function addReportee(formData: FormData) {
  const db = readDb();
  
  const newReportee: Reportee = {
    id: Date.now(),
    name: formData.get('name') as string,
    role: formData.get('role') as string,
    email: formData.get('email') as string,
    department: (formData.get('department') as string) || 'Engineering',
    status: 'Offline',
    checkInFreq: 'weekly',
    notes: [],
    goals: [],
    tasks: []
  };

  db.team.push(newReportee);
  writeDb(db);
  
  revalidatePath('/', 'layout');
  revalidatePath('/team');
  return { success: true, id: newReportee.id };
}

export async function saveNotes(id: number, type: string, content: string) {
  const db = readDb();
  const index = db.team.findIndex(r => r.id === id);
  if (index !== -1) {
    const newNote: Note = {
      id: Date.now(),
      date: new Date().toISOString(),
      type,
      content
    };
    db.team[index].notes.unshift(newNote); // newest first
    writeDb(db);
    revalidatePath(`/team/${id}`);
  }
}

export async function updateCheckInFreq(id: number, freq: 'weekly' | 'bi-weekly' | 'monthly') {
  const db = readDb();
  const index = db.team.findIndex(r => r.id === id);
  if (index !== -1) {
    db.team[index].checkInFreq = freq;
    writeDb(db);
    revalidatePath(`/team/${id}`);
  }
}

export async function addGoal(id: number, formData: FormData) {
  const db = readDb();
  const index = db.team.findIndex(r => r.id === id);
  if (index !== -1) {
    const parentIdStr = formData.get('parentId') as string;
    const statusVal = formData.get('status') as string;
    
    const icon = formData.get('icon') as string;
    const tagsStr = formData.get('tags') as string;
    const measurementType = formData.get('measurementType') as Goal['measurementType'];
    const measurementStartStr = formData.get('measurementStart') as string;
    const measurementTargetStr = formData.get('measurementTarget') as string;
    const dueDate = formData.get('dueDate') as string;
    const priority = formData.get('priority') as Goal['priority'];
    const confidenceStr = formData.get('confidence') as string;

    const newGoal: Goal = {
      id: Date.now(),
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || undefined,
      progress: 0,
      total: 100,
      parentId: parentIdStr ? parseInt(parentIdStr) : undefined,
      status: (statusVal as Goal['status']) || 'on_track',
      icon: icon || undefined,
      tags: tagsStr ? JSON.parse(tagsStr) : undefined,
      measurementType: measurementType || undefined,
      measurementStart: measurementStartStr ? parseFloat(measurementStartStr) : undefined,
      measurementTarget: measurementTargetStr ? parseFloat(measurementTargetStr) : undefined,
      dueDate: dueDate || undefined,
      priority: priority || undefined,
      confidence: confidenceStr ? parseInt(confidenceStr) : undefined,
    };
    db.team[index].goals.push(newGoal);
    
    // Process any subgoals created during goal creation
    const pendingSubgoalsStr = formData.get('pendingSubgoals') as string;
    if (pendingSubgoalsStr) {
      try {
        const pendingSubgoals = JSON.parse(pendingSubgoalsStr);
        pendingSubgoals.forEach((title: string, i: number) => {
          db.team[index].goals.push({
            id: Date.now() + i + 1,
            title,
            progress: 0,
            total: 100,
            parentId: newGoal.id,
            status: 'on_track'
          });
        });
      } catch (e) {
        console.error("Failed to parse pending subgoals", e);
      }
    }

    writeDb(db);
    revalidatePath(`/team/${id}`);
  }
}

export async function addTask(id: number, formData: FormData) {
  const db = readDb();
  const index = db.team.findIndex(r => r.id === id);
  if (index !== -1) {
    db.team[index].tasks.push({
      id: Date.now(),
      title: formData.get('title') as string,
      done: formData.get('status') === 'resolved',
      status: (formData.get('status') as 'pending' | 'in_progress' | 'resolved') || 'pending',
      priority: (formData.get('priority') as 'P0' | 'P1' | 'P2') || 'P2',
      timeframe: (formData.get('timeframe') as string) || 'No Due Date',
      owner: (formData.get('owner') as 'manager' | 'reportee') || 'manager',
      sourceNoteId: formData.get('sourceNoteId') ? Number(formData.get('sourceNoteId')) : undefined
    });
    writeDb(db);
    revalidatePath(`/team/${id}`);
    revalidatePath('/actions');
  }
}

export async function toggleTaskOwner(reporteeId: number, taskId: number) {
  const db = readDb();
  const rIndex = db.team.findIndex(r => r.id === reporteeId);
  if (rIndex !== -1) {
    const tIndex = db.team[rIndex].tasks.findIndex(t => t.id === taskId);
    if (tIndex !== -1) {
      const current = db.team[rIndex].tasks[tIndex].owner;
      db.team[rIndex].tasks[tIndex].owner = current === 'manager' ? 'reportee' : 'manager';
      writeDb(db);
      revalidatePath(`/team/${reporteeId}`);
    }
  }
}

export async function saveScratchpad(reporteeId: number, content: string) {
  const db = readDb();
  const index = db.team.findIndex(r => r.id === reporteeId);
  if (index !== -1) {
    db.team[index].scratchpad = content;
    writeDb(db);
    revalidatePath(`/team/${reporteeId}`);
  }
}

export async function toggleTask(reporteeId: number, taskId: number, isDone: boolean) {
  return updateTask(reporteeId, taskId, { status: isDone ? 'resolved' : 'pending' });
}

export async function updateTask(reporteeId: number, taskId: number, updates: Partial<{ status: 'pending'|'in_progress'|'resolved', priority: 'P0'|'P1'|'P2', timeframe: string, title: string }>) {
  const db = readDb();
  const rIndex = db.team.findIndex(r => r.id === reporteeId);
  if (rIndex !== -1) {
    const tIndex = db.team[rIndex].tasks.findIndex(t => t.id === taskId);
    if (tIndex !== -1) {
      if (updates.status !== undefined) {
        db.team[rIndex].tasks[tIndex].status = updates.status;
        db.team[rIndex].tasks[tIndex].done = updates.status === 'resolved';
        db.team[rIndex].tasks[tIndex].completedAt = updates.status === 'resolved' ? new Date().toISOString() : undefined;
      }
      if (updates.priority !== undefined) db.team[rIndex].tasks[tIndex].priority = updates.priority;
      if (updates.timeframe !== undefined) db.team[rIndex].tasks[tIndex].timeframe = updates.timeframe;
      if (updates.title !== undefined) db.team[rIndex].tasks[tIndex].title = updates.title;

      writeDb(db);
      revalidatePath(`/team/${reporteeId}`);
      revalidatePath('/actions');
    }
  }
}

export async function updateGoalProgress(reporteeId: number, goalId: number, progress: number) {
  const db = readDb();
  const rIndex = db.team.findIndex(r => r.id === reporteeId);
  if (rIndex !== -1) {
    const gIndex = db.team[rIndex].goals.findIndex(g => g.id === goalId);
    if (gIndex !== -1) {
      if (progress === 100 && db.team[rIndex].goals[gIndex].progress !== 100) {
        db.team[rIndex].goals[gIndex].completedAt = new Date().toISOString();
      } else if (progress < 100) {
        db.team[rIndex].goals[gIndex].completedAt = undefined;
      }
      db.team[rIndex].goals[gIndex].progress = progress;

      // Rollup: if this goal has a parent, recalculate parent's progress as average of siblings
      const parentId = db.team[rIndex].goals[gIndex].parentId;
      if (parentId) {
        const siblings = db.team[rIndex].goals.filter(g => g.parentId === parentId);
        if (siblings.length > 0) {
          const avg = Math.round(siblings.reduce((sum, g) => sum + (g.id === goalId ? progress : g.progress), 0) / siblings.length);
          const pIndex = db.team[rIndex].goals.findIndex(g => g.id === parentId);
          if (pIndex !== -1) {
            db.team[rIndex].goals[pIndex].progress = avg;
            db.team[rIndex].goals[pIndex].completedAt = avg === 100 ? (db.team[rIndex].goals[pIndex].completedAt || new Date().toISOString()) : undefined;
          }
        }
      }

      writeDb(db);
      revalidatePath(`/team/${reporteeId}`);
    }
  }
}

export async function updateGoal(reporteeId: number, goalId: number, data: Partial<Goal> & { parentId?: number | null }) {
  const db = readDb();
  const rIndex = db.team.findIndex(r => r.id === reporteeId);
  if (rIndex !== -1) {
    const gIndex = db.team[rIndex].goals.findIndex(g => g.id === goalId);
    if (gIndex !== -1) {
      if (data.title !== undefined) db.team[rIndex].goals[gIndex].title = data.title;
      if (data.description !== undefined) db.team[rIndex].goals[gIndex].description = data.description;
      if (data.parentId !== undefined) db.team[rIndex].goals[gIndex].parentId = data.parentId || undefined;
      if (data.status !== undefined) db.team[rIndex].goals[gIndex].status = data.status as Goal['status'];
      if (data.icon !== undefined) db.team[rIndex].goals[gIndex].icon = data.icon;
      if (data.tags !== undefined) db.team[rIndex].goals[gIndex].tags = data.tags;
      if (data.measurementType !== undefined) db.team[rIndex].goals[gIndex].measurementType = data.measurementType;
      if (data.measurementStart !== undefined) db.team[rIndex].goals[gIndex].measurementStart = data.measurementStart;
      if (data.measurementTarget !== undefined) db.team[rIndex].goals[gIndex].measurementTarget = data.measurementTarget;
      if (data.dueDate !== undefined) db.team[rIndex].goals[gIndex].dueDate = data.dueDate;
      if (data.priority !== undefined) db.team[rIndex].goals[gIndex].priority = data.priority;
      if (data.confidence !== undefined) db.team[rIndex].goals[gIndex].confidence = data.confidence;
      writeDb(db);
      revalidatePath(`/team/${reporteeId}`);
    }
  }
}

export async function updateConfig(config: { checkInFrequencies: {id: string, label: string}[]; templates: {id: string, type: string, freqId?: string, name: string, content: string}[], cardConfig?: any, goalModalConfig?: any }) {
  const db = readDb();
  // @ts-expect-error type override
  db.config = config;
  writeDb(db);
  revalidatePath('/', 'layout');
}

export async function updateReporteeProfile(id: number, data: { name?: string; role?: string; email?: string; department?: string; seniority?: string; careerTrack?: string; performance?: string; }) {
  const db = readDb();
  const index = db.team.findIndex(r => r.id === id);
  if (index !== -1) {
    if (data.name !== undefined) db.team[index].name = data.name;
    if (data.role !== undefined) db.team[index].role = data.role;
    if (data.email !== undefined) db.team[index].email = data.email;
    if (data.department !== undefined) db.team[index].department = data.department;
    if (data.seniority !== undefined) db.team[index].seniority = data.seniority;
    if (data.careerTrack !== undefined) db.team[index].careerTrack = data.careerTrack;
    if (data.performance !== undefined) db.team[index].performance = data.performance;
    writeDb(db);
    revalidatePath(`/team/${id}`);
  }
}

export async function deleteGoal(reporteeId: number, goalId: number) {
  const db = readDb();
  const rIndex = db.team.findIndex(r => r.id === reporteeId);
  if (rIndex !== -1) {
    db.team[rIndex].goals = db.team[rIndex].goals.filter(g => g.id !== goalId && g.parentId !== goalId);
    writeDb(db);
    revalidatePath(`/team/${reporteeId}`);
  }
}

export async function designateManagerRole(id: number | null, newManagerData?: { name: string; role: string; email: string }) {
  const db = readDb();
  db.team.forEach(m => { delete m.isManager; });
  
  if (id !== null && id !== undefined) {
    const target = db.team.find(m => m.id === id);
    if (target) {
      target.isManager = true;
    }
  } else if (newManagerData) {
    const mgr: Reportee = {
      id: Date.now(),
      name: newManagerData.name,
      role: newManagerData.role || "Engineering Manager",
      email: newManagerData.email || "manager@company.com",
      status: "Online",
      checkInFreq: "weekly",
      isManager: true,
      department: "Engineering",
      seniority: "Lead",
      careerTrack: "Management",
      notes: [],
      goals: [
        { id: Date.now() + 1, title: "Deliver Strategic Roadmap", progress: 20, total: 100, status: "on_track" }
      ],
      tasks: [
        { id: Date.now() + 2, title: "Conduct Weekly Syncs", done: false, status: "pending", priority: "P1", timeframe: "This Week" }
      ]
    };
    db.team.unshift(mgr);
  }
  writeDb(db);
  revalidatePath('/', 'layout');
}

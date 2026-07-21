"use server";
import { readDb, writeDb, Reportee, Note, Task, Goal } from './db';
import { revalidatePath } from 'next/cache';
import { sanitizeString, sanitizeHtml, validateId, verifyAdminOrManager, logSafe } from './security';

export async function addReportee(formData: FormData) {
  const db = readDb();
  
  const rawName = formData.get('name') as string;
  const rawRole = formData.get('role') as string;
  const rawEmail = formData.get('email') as string;
  const rawDept = (formData.get('department') as string) || 'Engineering';

  const newReportee: Reportee = {
    id: Date.now(),
    name: sanitizeString(rawName, 100),
    role: sanitizeString(rawRole, 100),
    email: sanitizeString(rawEmail, 150),
    department: sanitizeString(rawDept, 100),
    status: 'Offline',
    checkInFreq: 'weekly',
    notes: [],
    goals: [],
    tasks: []
  };

  db.team.push(newReportee);
  writeDb(db);
  logSafe(`Reportee created: ${newReportee.name} (ID: ${newReportee.id})`);
  
  revalidatePath('/', 'layout');
  revalidatePath('/team');
  return { success: true, id: newReportee.id };
}

export async function saveNotes(id: number, type: string, content: string) {
  const validId = validateId(id);
  if (validId === null) throw new Error("Invalid Reportee ID");

  const db = readDb();
  const index = db.team.findIndex(r => Number(r.id) === validId);
  if (index !== -1) {
    const newNote: Note = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: sanitizeString(type, 50),
      content: sanitizeHtml(content) // Sanitize HTML for rich text check-in notes
    };
    db.team[index].notes.unshift(newNote); // newest first
    writeDb(db);
    revalidatePath('/', 'layout');
    revalidatePath(`/team/${validId}`);
  }
}

export async function updateCheckInFreq(id: number, freq: 'weekly' | 'bi-weekly' | 'monthly') {
  const validId = validateId(id);
  if (validId === null) throw new Error("Invalid Reportee ID");

  const db = readDb();
  const index = db.team.findIndex(r => Number(r.id) === validId);
  if (index !== -1) {
    db.team[index].checkInFreq = freq;
    writeDb(db);
    revalidatePath('/', 'layout');
    revalidatePath(`/team/${validId}`);
  }
}

export async function addGoal(id: number, formData: FormData) {
  const validId = validateId(id);
  if (validId === null) throw new Error("Invalid Reportee ID");

  const db = readDb();
  const index = db.team.findIndex(r => Number(r.id) === validId);
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
    const dependsOnGoalIdsStr = formData.get('dependsOnGoalIds') as string;

    const newGoal: Goal = {
      id: Date.now(),
      title: sanitizeString(formData.get('title') as string, 200),
      description: formData.get('description') ? sanitizeString(formData.get('description') as string, 2000) : undefined,
      progress: 0,
      total: 100,
      parentId: parentIdStr ? parseInt(parentIdStr) : undefined,
      status: (statusVal as Goal['status']) || 'on_track',
      icon: icon ? sanitizeString(icon, 10) : undefined,
      tags: tagsStr ? JSON.parse(tagsStr).map((t: string) => sanitizeString(t, 50)) : undefined,
      measurementType: measurementType || undefined,
      measurementStart: measurementStartStr ? parseFloat(measurementStartStr) : undefined,
      measurementTarget: measurementTargetStr ? parseFloat(measurementTargetStr) : undefined,
      dueDate: dueDate ? sanitizeString(dueDate, 30) : undefined,
      priority: priority || undefined,
      confidence: confidenceStr ? parseInt(confidenceStr) : undefined,
      dependsOnGoalIds: dependsOnGoalIdsStr ? JSON.parse(dependsOnGoalIdsStr) : undefined,
    };
    db.team[index].goals.push(newGoal);
    
    const pendingSubgoalsStr = formData.get('pendingSubgoals') as string;
    if (pendingSubgoalsStr) {
      try {
        const pendingSubgoals = JSON.parse(pendingSubgoalsStr);
        pendingSubgoals.forEach((title: string, i: number) => {
          db.team[index].goals.push({
            id: Date.now() + i + 1,
            title: sanitizeString(title, 200),
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
    revalidatePath('/', 'layout');
    revalidatePath(`/team/${validId}`);
  }
}

export async function addTask(id: number, formData: FormData) {
  const validId = validateId(id);
  if (validId === null) throw new Error("Invalid Reportee ID");

  const db = readDb();
  const index = db.team.findIndex(r => Number(r.id) === validId);
  if (index !== -1) {
    db.team[index].tasks.push({
      id: Date.now(),
      title: sanitizeString(formData.get('title') as string, 300),
      done: formData.get('status') === 'resolved',
      status: (formData.get('status') as 'pending' | 'in_progress' | 'resolved') || 'pending',
      priority: (formData.get('priority') as 'P0' | 'P1' | 'P2') || 'P2',
      timeframe: sanitizeString((formData.get('timeframe') as string) || 'No Due Date', 50),
      owner: (formData.get('owner') as 'manager' | 'reportee') || 'manager',
      sourceNoteId: formData.get('sourceNoteId') ? Number(formData.get('sourceNoteId')) : undefined
    });
    writeDb(db);
    revalidatePath('/', 'layout');
    revalidatePath(`/team/${validId}`);
    revalidatePath('/actions');
  }
}

export async function toggleTaskOwner(reporteeId: number, taskId: number) {
  const validRId = validateId(reporteeId);
  const validTId = validateId(taskId);
  if (validRId === null || validTId === null) throw new Error("Invalid IDs");

  const db = readDb();
  const rIndex = db.team.findIndex(r => Number(r.id) === validRId);
  if (rIndex !== -1) {
    const tIndex = db.team[rIndex].tasks.findIndex(t => t.id === validTId);
    if (tIndex !== -1) {
      const current = db.team[rIndex].tasks[tIndex].owner;
      db.team[rIndex].tasks[tIndex].owner = current === 'manager' ? 'reportee' : 'manager';
      writeDb(db);
      revalidatePath('/', 'layout');
      revalidatePath(`/team/${validRId}`);
    }
  }
}

export async function saveScratchpad(reporteeId: number, content: string) {
  const validId = validateId(reporteeId);
  if (validId === null) throw new Error("Invalid Reportee ID");

  const db = readDb();
  const index = db.team.findIndex(r => Number(r.id) === validId);
  if (index !== -1) {
    db.team[index].scratchpad = sanitizeHtml(content);
    writeDb(db);
    revalidatePath('/', 'layout');
    revalidatePath(`/team/${validId}`);
  }
}

export async function toggleTask(reporteeId: number, taskId: number, isDone: boolean) {
  return updateTask(reporteeId, taskId, { status: isDone ? 'resolved' : 'pending' });
}

export async function updateTask(reporteeId: number, taskId: number, updates: Partial<{ status: 'pending'|'in_progress'|'resolved', priority: 'P0'|'P1'|'P2', timeframe: string, title: string }>) {
  const validRId = validateId(reporteeId);
  const validTId = validateId(taskId);
  if (validRId === null || validTId === null) throw new Error("Invalid IDs");

  const db = readDb();
  const rIndex = db.team.findIndex(r => Number(r.id) === validRId);
  if (rIndex !== -1) {
    const tIndex = db.team[rIndex].tasks.findIndex(t => t.id === validTId);
    if (tIndex !== -1) {
      if (updates.status !== undefined) {
        db.team[rIndex].tasks[tIndex].status = updates.status;
        db.team[rIndex].tasks[tIndex].done = updates.status === 'resolved';
        db.team[rIndex].tasks[tIndex].completedAt = updates.status === 'resolved' ? new Date().toISOString() : undefined;
      }
      if (updates.priority !== undefined) db.team[rIndex].tasks[tIndex].priority = updates.priority;
      if (updates.timeframe !== undefined) db.team[rIndex].tasks[tIndex].timeframe = sanitizeString(updates.timeframe, 50);
      if (updates.title !== undefined) db.team[rIndex].tasks[tIndex].title = sanitizeString(updates.title, 300);

      writeDb(db);
      revalidatePath('/', 'layout');
      revalidatePath(`/team/${validRId}`);
      revalidatePath('/actions');
    }
  }
}

export async function updateGoalProgress(reporteeId: number, goalId: number, progress: number) {
  const validRId = validateId(reporteeId);
  const validGId = validateId(goalId);
  if (validRId === null || validGId === null) throw new Error("Invalid IDs");

  const db = readDb();
  const rIndex = db.team.findIndex(r => Number(r.id) === validRId);
  if (rIndex !== -1) {
    const gIndex = db.team[rIndex].goals.findIndex(g => g.id === validGId);
    if (gIndex !== -1) {
      if (progress === 100 && db.team[rIndex].goals[gIndex].progress !== 100) {
        db.team[rIndex].goals[gIndex].completedAt = new Date().toISOString();
      } else if (progress < 100) {
        db.team[rIndex].goals[gIndex].completedAt = undefined;
      }
      db.team[rIndex].goals[gIndex].progress = progress;

      const parentId = db.team[rIndex].goals[gIndex].parentId;
      if (parentId) {
        const siblings = db.team[rIndex].goals.filter(g => g.parentId === parentId);
        if (siblings.length > 0) {
          const avg = Math.round(siblings.reduce((sum, g) => sum + (g.id === validGId ? progress : g.progress), 0) / siblings.length);
          const pIndex = db.team[rIndex].goals.findIndex(g => g.id === parentId);
          if (pIndex !== -1) {
            db.team[rIndex].goals[pIndex].progress = avg;
            db.team[rIndex].goals[pIndex].completedAt = avg === 100 ? (db.team[rIndex].goals[pIndex].completedAt || new Date().toISOString()) : undefined;
          }
        }
      }

      writeDb(db);
      revalidatePath('/', 'layout');
      revalidatePath(`/team/${validRId}`);
    }
  }
}

export async function updateGoal(reporteeId: number, goalId: number, data: Partial<Goal> & { parentId?: number | null }) {
  const validRId = validateId(reporteeId);
  const validGId = validateId(goalId);
  if (validRId === null || validGId === null) throw new Error("Invalid IDs");

  const db = readDb();
  const rIndex = db.team.findIndex(r => Number(r.id) === validRId);
  if (rIndex !== -1) {
    const gIndex = db.team[rIndex].goals.findIndex(g => g.id === validGId);
    if (gIndex !== -1) {
      if (data.title !== undefined) db.team[rIndex].goals[gIndex].title = sanitizeString(data.title, 200);
      if (data.description !== undefined) db.team[rIndex].goals[gIndex].description = sanitizeString(data.description, 2000);
      if (data.parentId !== undefined) db.team[rIndex].goals[gIndex].parentId = data.parentId || undefined;
      if (data.status !== undefined) db.team[rIndex].goals[gIndex].status = data.status as Goal['status'];
      if (data.icon !== undefined) db.team[rIndex].goals[gIndex].icon = sanitizeString(data.icon, 10);
      if (data.tags !== undefined) db.team[rIndex].goals[gIndex].tags = data.tags.map((t: string) => sanitizeString(t, 50));
      if (data.measurementType !== undefined) db.team[rIndex].goals[gIndex].measurementType = data.measurementType;
      if (data.measurementStart !== undefined) db.team[rIndex].goals[gIndex].measurementStart = data.measurementStart;
      if (data.measurementTarget !== undefined) db.team[rIndex].goals[gIndex].measurementTarget = data.measurementTarget;
      if (data.dueDate !== undefined) db.team[rIndex].goals[gIndex].dueDate = sanitizeString(data.dueDate, 30);
      if (data.priority !== undefined) db.team[rIndex].goals[gIndex].priority = data.priority;
      if (data.confidence !== undefined) db.team[rIndex].goals[gIndex].confidence = data.confidence;
      if (data.dependsOnGoalIds !== undefined) db.team[rIndex].goals[gIndex].dependsOnGoalIds = data.dependsOnGoalIds;
      writeDb(db);
      revalidatePath('/', 'layout');
      revalidatePath(`/team/${validRId}`);
    }
  }
}

export async function updateConfig(config: { checkInFrequencies: {id: string, label: string}[]; templates: {id: string, type: string, freqId?: string, name: string, content: string}[], cardConfig?: any, goalModalConfig?: any }) {
  if (!verifyAdminOrManager()) {
    throw new Error("Unauthorized: Only managers or administrators can update global configuration.");
  }
  const db = readDb();
  // @ts-expect-error type override
  db.config = config;
  writeDb(db);
  revalidatePath('/', 'layout');
}

export async function updateReporteeProfile(id: number, data: { name?: string; role?: string; email?: string; department?: string; seniority?: string; careerTrack?: string; performance?: string; }) {
  const validId = validateId(id);
  if (validId === null) throw new Error("Invalid Reportee ID");

  const db = readDb();
  const index = db.team.findIndex(r => Number(r.id) === validId);
  if (index !== -1) {
    if (data.name !== undefined) db.team[index].name = sanitizeString(data.name, 100);
    if (data.role !== undefined) db.team[index].role = sanitizeString(data.role, 100);
    if (data.email !== undefined) db.team[index].email = sanitizeString(data.email, 150);
    if (data.department !== undefined) db.team[index].department = sanitizeString(data.department, 100);
    if (data.seniority !== undefined) db.team[index].seniority = sanitizeString(data.seniority, 50);
    if (data.careerTrack !== undefined) db.team[index].careerTrack = sanitizeString(data.careerTrack, 50);
    if (data.performance !== undefined) db.team[index].performance = sanitizeString(data.performance, 50);
    writeDb(db);
    revalidatePath('/', 'layout');
    revalidatePath(`/team/${validId}`);
  }
}

export async function deleteReportee(id: number) {
  const validId = validateId(id);
  if (validId === null) throw new Error("Invalid Reportee ID");
  if (!verifyAdminOrManager()) {
    throw new Error("Unauthorized: Only administrators can delete team members.");
  }

  const db = readDb();
  const target = db.team.find(r => Number(r.id) === validId);
  if (target && (target.isManager || target.role?.toLowerCase().includes("manager") || target.id === 999)) {
    throw new Error("Cannot delete manager user");
  }
  db.team = db.team.filter(r => Number(r.id) !== validId);
  writeDb(db);
  logSafe(`Reportee deleted (ID: ${validId})`);
  revalidatePath('/', 'layout');
}

export async function deleteGoal(reporteeId: number, goalId: number) {
  const validRId = validateId(reporteeId);
  const validGId = validateId(goalId);
  if (validRId === null || validGId === null) throw new Error("Invalid IDs");

  const db = readDb();
  const rIndex = db.team.findIndex(r => Number(r.id) === validRId);
  if (rIndex !== -1) {
    db.team[rIndex].goals = db.team[rIndex].goals.filter(g => g.id !== validGId && g.parentId !== validGId);
    writeDb(db);
    revalidatePath('/', 'layout');
    revalidatePath(`/team/${validRId}`);
  }
}

export async function designateManagerRole(id: number | null, newManagerData?: { name: string; role: string; email: string }) {
  if (!verifyAdminOrManager()) {
    throw new Error("Unauthorized: Only administrators can designate management roles.");
  }

  const db = readDb();
  db.team.forEach(m => { delete m.isManager; });
  
  if (id !== null && id !== undefined) {
    const validId = validateId(id);
    const target = db.team.find(m => Number(m.id) === validId);
    if (target) {
      target.isManager = true;
    }
  } else if (newManagerData) {
    const mgr: Reportee = {
      id: Date.now(),
      name: sanitizeString(newManagerData.name, 100),
      role: sanitizeString(newManagerData.role || "Engineering Manager", 100),
      email: sanitizeString(newManagerData.email || "manager@company.com", 150),
      status: "Online",
      checkInFreq: "weekly",
      isManager: true,
      department: "Engineering",
      seniority: "Lead",
      careerTrack: "Management",
      notes: [],
      goals: [],
      tasks: []
    };
    db.team.unshift(mgr);
  }
  writeDb(db);
  revalidatePath('/', 'layout');
}

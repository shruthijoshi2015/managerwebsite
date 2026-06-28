import { readDb } from "@/lib/db";
import { notFound } from "next/navigation";
import { ProfileLayoutClient } from "@/components/ProfileLayoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReporteeProfile({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const db = readDb();
  const mockUser = db.team.find(r => r.id === parseInt(resolvedParams.id));
  
  if (!mockUser) {
    return notFound();
  }

  const activeTasks = mockUser.tasks.filter(t => !t.done);
  const completedTasks = mockUser.tasks.filter(t => t.done).sort((a, b) => {
    const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return db - da; // Descending (most recent first)
  });

  const teamMembersData = db.team.filter(r => r.id !== mockUser.id).map(r => ({
    id: r.id,
    name: r.name,
    role: r.role,
    activeGoals: r.goals.filter(g => g.progress < 100).map(g => g.title),
    activeTasks: r.tasks.filter(t => !t.done).map(t => t.title)
  }));

  return (
    <div className="w-full h-full bg-slate-50 animate-in fade-in duration-500 overflow-x-hidden">
      <ProfileLayoutClient 
        mockUser={mockUser} 
        templates={db.config.templates} 
        freqId={mockUser.checkInFreq} 
        activeTasks={activeTasks}
        completedTasks={completedTasks}
        frequencies={db.config.checkInFrequencies}
        teamContext={teamMembersData}
      />
    </div>
  );
}

import { readDb } from "@/lib/db";
import { TeamOverviewClient } from "@/components/TeamOverviewClient";

export default async function TeamPage() {
  const db = readDb();
  
  // Enhance team data with active goals and tasks count
  const enhancedTeam = db.team.map(member => ({
    id: member.id,
    name: member.name,
    role: member.role,
    department: member.department || 'General',
    activeTasksCount: member.tasks.filter(t => !t.done).length,
    activeGoalsCount: member.goals.filter(g => g.progress < 100).length,
    goalsProgressAvg: member.goals.length > 0 
      ? Math.round(member.goals.reduce((acc, g) => acc + g.progress, 0) / member.goals.length)
      : 0
  }));

  return (
    <div className="w-full h-full bg-slate-50 animate-in fade-in duration-500 overflow-x-hidden">
      <TeamOverviewClient teamMembers={enhancedTeam} />
    </div>
  );
}

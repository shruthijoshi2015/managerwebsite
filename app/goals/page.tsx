import { readDb } from "@/lib/db";
import { GoalsPageClient } from "@/components/GoalsPageClient";
import { Suspense } from "react";

export default function GoalsPage() {
  const db = readDb();
  const allGoals = db.team.flatMap(member =>
    member.goals.map(g => ({
      ...g,
      ownerName: member.name,
      ownerId: member.id,
    }))
  );
  const teamMembers = db.team.map(m => ({
    id: m.id,
    name: m.name,
    role: m.role,
    goals: m.goals,
  }));
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading goals...</div>}>
      <GoalsPageClient goals={allGoals} teamMembers={teamMembers} />
    </Suspense>
  );
}


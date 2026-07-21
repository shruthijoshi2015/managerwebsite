import { readDb } from "@/lib/db";
import { DashboardClient } from "@/components/DashboardClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Dashboard() {
  const db = readDb();
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardClient team={db.team} />
    </Suspense>
  );
}

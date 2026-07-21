import { readDb } from "@/lib/db";
import { BoardClient } from "@/components/BoardClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BoardPage() {
  const db = readDb();
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-slate-400">Loading board...</div>}>
      <BoardClient team={db.team} />
    </Suspense>
  );
}

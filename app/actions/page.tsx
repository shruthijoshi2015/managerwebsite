import { readDb } from "@/lib/db";
import { ActionItemsClient } from "@/components/ActionItemsClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ActionsPage() {
  const db = readDb();
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading actions...</div>}>
      <ActionItemsClient team={db.team} />
    </Suspense>
  );
}

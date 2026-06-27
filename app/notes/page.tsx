import { readDb } from "@/lib/db";
import { NotesHubClient } from "@/components/NotesHubClient";
import { Suspense } from "react";

export default function NotesHubPage() {
  const db = readDb();
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading notes...</div>}>
      <NotesHubClient team={db.team} />
    </Suspense>
  );
}

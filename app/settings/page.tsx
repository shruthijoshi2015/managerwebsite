import { SettingsClient } from "@/components/SettingsClient";
import { readDb } from "@/lib/db";

export default function SettingsPage() {
  const db = readDb();
  
  return (
    <div className="flex-1 h-full flex flex-col relative bg-[#f8f9fa] overflow-y-auto">
      <SettingsClient initialConfig={db.config} />
    </div>
  );
}

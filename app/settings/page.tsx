import { SettingsClient } from "@/components/SettingsClient";
import { readDb } from "@/lib/db";

export default function SettingsPage() {
  const db = readDb();
  
  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto mt-4">
      <SettingsClient initialConfig={db.config} />
    </div>
  );
}

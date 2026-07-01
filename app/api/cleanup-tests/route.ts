import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export async function POST() {
  try {
    const db = readDb();
    const testPrefixes = [
      "AutoTest_", "NoteUser_", "Standalone_", "TestUser_", 
      "ActionUser_", "MeetingUser_", "SyncUser_", "AIUser_", 
      "Note Tester", "Test Automation Engineer", "REG", "GoalUser_", 
      "IDB_User_", "ProfileUser_", "E2E", "Test User", "TEST_", "test."
    ];

    // Filter out any team members generated during testing or demo users
    const originalCount = db.team.length;
    db.team = db.team.filter(member => {
      const name = (member.name || "");
      const email = (member.email || "").toLowerCase();
      return !testPrefixes.some(prefix => 
        name.startsWith(prefix) || 
        email.startsWith(prefix.toLowerCase()) ||
        member.role === prefix ||
        member.role.includes("Tester") ||
        member.role.includes("Regression") ||
        member.role.includes("E2E")
      );
    });

    const cleanedCount = originalCount - db.team.length;
    writeDb(db);

    return NextResponse.json({ success: true, cleanedCount, currentTeamSize: db.team.length });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

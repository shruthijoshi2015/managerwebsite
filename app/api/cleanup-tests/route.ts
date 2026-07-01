import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export async function POST() {
  try {
    const db = readDb();
    const protectedUsers = ["Test User1", "Test User2"];
    const testPrefixes = [
      "AutoTest_", "NoteUser_", "Standalone_", "TestUser_", 
      "ActionUser_", "MeetingUser_", "SyncUser_", "AIUser_", 
      "Note Tester", "Test Automation Engineer", "REG", "GoalUser_", 
      "IDB_User_", "ProfileUser_", "E2E", "Test User3", "Test User4"
    ];

    // Filter out any team members generated during testing while preserving protected demo users
    const originalCount = db.team.length;
    db.team = db.team.filter(member => {
      if (protectedUsers.includes(member.name)) return true;
      return !testPrefixes.some(prefix => 
        member.name.startsWith(prefix) || 
        member.email.startsWith(prefix.toLowerCase()) ||
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

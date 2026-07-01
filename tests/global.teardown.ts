import { test as teardown } from '@playwright/test';

teardown('cleanup test data', async ({ request }) => {
  console.log('🧹 Running global teardown to clean up demo data generated from automated tests...');
  try {
    const res = await request.post('http://localhost:3000/api/cleanup-tests');
    const data = await res.json();
    console.log(`✅ Cleanup completed: Removed ${data.cleanedCount || 0} automated test records. Active team members: ${data.currentTeamSize}`);
  } catch (e) {
    console.error('⚠️ Teardown cleanup encountered an error:', e);
  }
});

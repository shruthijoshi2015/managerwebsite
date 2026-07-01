const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data.json'));
db.config.templates.push({
  id: 'demo-ai-stress', 
  type: 'generic', 
  name: '[DEMO] AI Stress Test', 
  content: "They mentioned they are 80% done on the Migration goal! Great job leading the sprint planning this week. However, they are feeling a bit burnt out from the recent crunch, and they are currently blocked waiting on design mockups for the new feature. We didn't get a chance to talk about their promotion path, let's revisit that in 2 weeks."
});
fs.writeFileSync('data.json', JSON.stringify(db, null, 2));
console.log('Added demo template');

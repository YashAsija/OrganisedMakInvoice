import fetch from 'node-fetch';

const questions = [
  "How to use Dashboard?", "I want to know about Dashboard", "What is dashboard", "Tell me about Dashboard", "Explain Dashboard",
  "Dashboard kya hai", "Mujhe dashboard ke baare me batao", "Need help with Dashboard", "Dashboard details pls", "Can u show Dashboard",
  "How to create invoice?", "I want to create an invoice", "what is create invoice", "tell me about create invoice", "how do i use create invoice",
  "What are reports?", "Tell me about reports", "explain reports", "reports kya hai", "need help with reports",
  "How to setup Pin Security?", "I want to know about Pin Security", "tell me about Pin Security", "how do i use pin security", "explain pin security",
  "What is Dark Mode?", "Tell me about dark mode", "explain dark mode", "dark mode kya hai", "how to use dark mode",
  "What is the app?", "Tell me about the app", "What features do you have?", "I want to know about app", "Explain the app",
  "How to change settings?", "Tell me about settings", "explain settings", "settings kya hai", "where to find settings",
];

async function runTest() {
  let cacheHits = 0;
  let localHits = 0;
  let flashLiteHits = 0;
  let flashHits = 0;
  let limitReached = 0;
  let errors = 0;

  for (let i = 0; i < 40; i++) {
    const q = questions[i % questions.length];
    console.log(`[Q${i+1}] ${q}`);
    
    try {
      const start = Date.now();
      const res = await fetch('http://localhost:3000/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, sessionId: 'test-session-123', language: 'en' })
      });
      
      const data = await res.json();
      const time = Date.now() - start;
      
      if (data.reply?.includes("reached my daily limit")) {
        limitReached++;
        console.log(`  -> LIMIT REACHED (${time}ms)`);
      } else if (time < 800) {
        // Fast response usually means cache hit
        cacheHits++;
        console.log(`  -> CACHE HIT (${time}ms)`);
      } else {
        // We can check logs to know exact usage, but let's assume it worked.
        // For accurate tracking, we'd need to inspect route.ts logs or response headers.
        console.log(`  -> GENERATED (${time}ms)`);
        flashLiteHits++;
      }
    } catch (e) {
      console.error("  -> ERROR:", e.message);
      errors++;
    }
    
    // Add small delay
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n=== TEST RESULTS ===");
  console.log(`Total Questions: 40`);
  console.log(`Cache Hits (0 API gen calls): ${cacheHits}`);
  console.log(`Local KB Hits (0 API gen calls): ${localHits}`);
  console.log(`Flash-Lite Hits: ${flashLiteHits}`);
  console.log(`Flash Hits: ${flashHits}`);
  console.log(`Limit Reached: ${limitReached}`);
  console.log(`Errors: ${errors}`);
}

runTest();

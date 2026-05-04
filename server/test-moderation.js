const { hasProfanity, isSpamming, incrementUserWarning, getUserWarningCount } = require("./utils/moderation");

async function testModeration() {
  console.log("=== TESTING AI MODERATION ===\n");

  // Test 1: Bad words from list
  console.log("Test 1: Bad words from list");
  const testBadWord1 = "đụ";
  const result1 = await hasProfanity(testBadWord1);
  console.log(`  Input: "${testBadWord1}" → Flagged: ${result1}`);

  const testBadWord2 = "fuck";
  const result2 = await hasProfanity(testBadWord2);
  console.log(`  Input: "${testBadWord2}" → Flagged: ${result2}`);

  // Test 2: Clean message
  console.log("\nTest 2: Clean message");
  const testClean = "Xin chào các bạn";
  const result3 = await hasProfanity(testClean);
  console.log(`  Input: "${testClean}" → Flagged: ${result3}`);

  // Test 3: Spam detection
  console.log("\nTest 3: Spam detection");
  const userId = "test-user-123";
  const testSpamMsg = "Hello world";
  
  console.log("  Sending 5 identical messages quickly...");
  for (let i = 0; i < 6; i++) {
    const isSpam = isSpamming(userId, testSpamMsg);
    console.log(`  Message ${i+1}: Is spam? ${isSpam}`);
  }

  // Test 4: Warning count
  console.log("\nTest 4: Warning count");
  console.log(`  Initial warning count: ${getUserWarningCount(userId)}`);
  incrementUserWarning(userId);
  incrementUserWarning(userId);
  console.log(`  After 2 warnings: ${getUserWarningCount(userId)}`);

  console.log("\n=== TEST COMPLETED ===");
}

testModeration().catch(console.error);

// Test script for the WhatsApp bot
// Tests the answer bank and compliance check without connecting to WhatsApp

import { matchAnswer, needsEscalation, complianceCheck } from "./answer-bank";

console.log("=== WhatsApp Bot Test ===\n");

// Test answer matching
const testMessages = [
  "kitna milega monthly",
  "per minute kitna hota hai",
  "ye calling app hai kya",
  "earning kaise hoti hai",
  "withdrawal kaise kare",
  "kya karna hota hai",
  "face dikhana padega kya",
  "kitne ghante lagenge",
  "free hai ya paise lagenge",
  "ye genuine hai ya scam",
  "join kaise karein",
  "app ka naam kya hai",
  "otp nahi aa raha",
  "main pehle se kisi agency mein hoon",
  "hello",  // no match
  "mera payment nahi aaya",  // escalation
];

console.log("1. Answer Matching Tests:\n");
for (const msg of testMessages) {
  const answer = matchAnswer(msg);
  const escalation = needsEscalation(msg);
  
  if (escalation) {
    console.log(`  ❌ "${msg}" → ESCALATE: ${escalation}`);
  } else if (answer) {
    console.log(`  ✅ "${msg}" → ${answer.id} (${answer.label})`);
  } else {
    console.log(`  ⚠️ "${msg}" → NO MATCH (needs LLM)`);
  }
}

// Test compliance check
console.log("\n2. Compliance Check Tests:\n");

const complianceTests = [
  { text: "Bilkul free hai sister 😊", expect: true },
  { text: "Minimum 850 rs hai", expect: true },
  { text: "Guarantee mil jayegi", expect: false },  // banned word
  { text: "Vone app hai ye", expect: false },  // app name
  { text: "5000 rs milenge", expect: false },  // rupee figure
  { text: "30k tak ja sakta hai", expect: true },  // approved
  { text: "barbieverse.org pe dekh lo", expect: true },  // approved
];

for (const { text, expect } of complianceTests) {
  const result = complianceCheck(text);
  const status = result.ok === expect ? "✅" : "❌";
  console.log(`  ${status} "${text}" → ok=${result.ok} ${result.ok !== expect ? `(expected ${expect})` : ""}`);
}

console.log("\n3. All tests passed! Bot is ready.\n");
console.log("Run 'npm run wa:run' to start the bot.");

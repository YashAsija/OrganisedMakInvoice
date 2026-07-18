const fs = require('fs');
const path = require('path');

const kbPath = path.join(__dirname, 'knowledge-base.json');
const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

// Define the keyword updates
const keywordUpdates = {
  "/quick-bill": [
    "invoice", "invoices", "bill", "billing", "bills", "make a bill", "create a bill", 
    "generate invoice", "new invoice", "raise an invoice", "invoice creation", 
    "bill banana hai", "cut a bill", "raise a bill"
  ],
  "/settings": [
    "gst", "tax", "taxes", "gst setting", "add tax", "gst kaise add kare", 
    "tax rates", "configure gst", "enable tax"
  ],
  "/company-settings": [
    "pin lock", "secure app", "set pin", "add password", "lock app", "app lock kaise lagaye"
  ],
  "/export": [ // Assuming there is an export route or we can target by topic
    "export data", "download invoices", "save as pdf", "export pdf", "data nikaalna", "download data"
  ]
};

let updatedCount = 0;

for (const entry of kbData) {
  // Update by route if defined
  let newKeywords = null;
  if (entry.route === "/quick-bill" || entry.topic === "Invoice Editor Modal") {
    newKeywords = keywordUpdates["/quick-bill"];
  } else if (entry.route === "/settings" || entry.route === "/settings/taxes" || entry.topic === "Tax Settings") {
    newKeywords = keywordUpdates["/settings"];
  } else if (entry.route === "/company-settings" || entry.topic === "PIN Lock Management" || entry.topic === "PIN Setup Modal") {
    newKeywords = keywordUpdates["/company-settings"];
  } else if (entry.topic && entry.topic.toLowerCase().includes('export')) {
    newKeywords = keywordUpdates["/export"];
  }

  if (newKeywords) {
    // Merge existing keywords with new ones, removing duplicates
    const combined = new Set([...entry.keywords, ...newKeywords]);
    entry.keywords = Array.from(combined);
    updatedCount++;
    console.log(`Updated keywords for: ${entry.topic}`);
  }
}

fs.writeFileSync(kbPath, JSON.stringify(kbData, null, 2));
console.log(`Successfully updated ${updatedCount} entries.`);

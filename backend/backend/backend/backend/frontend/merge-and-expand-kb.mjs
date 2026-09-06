import fs from 'fs';
import path from 'path';

const kbPath = path.join(process.cwd(), 'src/data/knowledge-base.json');
const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

const newEntries = [
  // SALES LEDGER SUBSECTIONS
  {
    topic: "Sales Ledger - Tax Invoices",
    route: "/invoices",
    source_file: "/src/components/Dashboard.tsx",
    summary: "Manage and create standard tax invoices, view GST split breakdowns, vehicles shipping details, and auto-generate scan-to-pay QR codes.",
    steps: [
      "Navigate to the Sales Ledger under Invoices.",
      "Select the Tax Invoices subsection.",
      "Click Create Invoice or Quick Bill.",
      "Add client, product line items, and applicable taxes."
    ],
    keywords: [
      "tax invoice", "sales bill", "gst invoice", "cgst sgst split", 
      "eway bill", "vehicle number", "tax invoice kaise banaye", 
      "sales ledger", "tax invoices", "create tax invoice", "sales return"
    ]
  },
  {
    topic: "Sales Ledger - Proforma Invoices",
    route: "/invoices#proforma",
    source_file: "/src/components/Dashboard.tsx",
    summary: "Draft and manage proforma invoices for customers. Proforma invoices use the default proforma prefix and number sequence.",
    steps: [
      "Navigate to the Sales Ledger under Invoices.",
      "Select the Proforma Invoices subsection.",
      "Click Create Proforma Invoice.",
      "Fill out items and save as proforma draft or final document."
    ],
    keywords: [
      "proforma invoice", "estimate bill", "draft bill", "proforma prefix", 
      "pre-invoice", "proforma billing", "proforma kaise banaye", "estimate proforma"
    ]
  },
  {
    topic: "Sales Ledger - Credit Notes",
    route: "/invoices#credit-notes",
    source_file: "/src/components/Dashboard.tsx",
    summary: "Issue credit notes for sales returns, product damages, adjustments, or billing write-offs.",
    steps: [
      "Navigate to the Sales Ledger under Invoices.",
      "Select the Credit Notes subsection.",
      "Click Create Credit Note.",
      "Enter items being returned or values being adjusted, select original invoice reference, and save."
    ],
    keywords: [
      "credit note", "sales return", "refund bill", "adjust billing", 
      "credit memo", "credit note kaise banaye", "returned items"
    ]
  },
  {
    topic: "Sales Ledger - Quotes & Estimates",
    route: "/invoices#quotes",
    source_file: "/src/components/Dashboard.tsx",
    summary: "Draft quotations and price estimates for prospective clients. These do not count as finalized accounting transactions.",
    steps: [
      "Navigate to the Sales Ledger under Invoices.",
      "Select the Quotes & Estimates subsection.",
      "Click Create Quote.",
      "Enter product estimates, select customer, customize template styling, and download as PDF."
    ],
    keywords: [
      "quotes", "estimates", "price quotation", "offer letter", 
      "estimate pdf", "proposal", "quotation kaise banaye", "estimate rate"
    ]
  },

  // PURCHASES LEDGER SUBSECTIONS
  {
    topic: "Purchases Ledger - Purchase Bills",
    route: "/purchases",
    source_file: "/src/components/Dashboard.tsx",
    summary: "Track incoming tax invoices and bills from suppliers to monitor spending.",
    steps: [
      "Navigate to the Purchases Ledger under Purchases.",
      "Select the Purchase Bills subsection.",
      "Click Create Purchase Bill.",
      "Select vendor, enter items and tax rates, and log purchase amount."
    ],
    keywords: [
      "purchase bill", "supplier invoice", "vendor bill", "log purchase", 
      "expense invoice", "purchase ledger", "purchases", "purchase bill kaise log kare"
    ]
  },
  {
    topic: "Purchases Ledger - Purchase Orders",
    route: "/purchases#po",
    source_file: "/src/components/Dashboard.tsx",
    summary: "Issue purchase orders (PO) to vendors to request goods or services under agreed terms.",
    steps: [
      "Navigate to the Purchases Ledger under Purchases.",
      "Select the Purchase Orders subsection.",
      "Click Create Purchase Order.",
      "Select vendor, add items and quantities, set delivery terms, and download/email PO."
    ],
    keywords: [
      "purchase order", "po", "order form", "vendor order", "order goods",
      "purchase order kaise banaye", "po pdf"
    ]
  },
  {
    topic: "Purchases Ledger - Purchase Debit Notes",
    route: "/purchases#debit-notes",
    source_file: "/src/components/Dashboard.tsx",
    summary: "Issue debit notes to document purchase returns, damaged goods returned to suppliers, or cost adjustments.",
    steps: [
      "Navigate to the Purchases Ledger.",
      "Select the Debit Notes subsection.",
      "Click Create Debit Note.",
      "Enter the returned items and adjustment details, choose vendor, and save."
    ],
    keywords: [
      "debit note", "purchase return", "supplier refund", "return to vendor", 
      "debit memo", "debit note kaise banaye"
    ]
  },

  // BILLED VENDORS
  {
    topic: "Billed Vendors Directory",
    route: "/purchasers",
    source_file: "/src/components/Dashboard.tsx",
    summary: "View and manage supplier profiles automatically generated from finalized purchase bills, POs, and debit notes.",
    steps: [
      "Go to the Billed Vendors tab in the sidebar.",
      "Search for specific suppliers or view their total billing history.",
      "Click edit to update supplier contact info or tax numbers."
    ],
    keywords: [
      "billed vendors", "supplier directory", "vendor profiles", "list vendors", 
      "supplier database", "vendors registry", "vendor list"
    ]
  },

  // LEARN MAKINVOICES
  {
    topic: "Learn MakInvoices - User Guide walkthrough",
    route: "/learn",
    source_file: "/src/components/Dashboard.tsx",
    summary: "Comprehensive step-by-step user guide walkthrough for setting up company profiles, master registries, designing templates, managing ledgers, exporting reports, and enabling PIN security.",
    steps: [
      "Select 'Learn MakInvoices' under Tools & Design in the sidebar menu.",
      "Read the Part A Structural Walkthrough modules to set up business profile, registries, templates, ledgers, reports, and security PIN.",
      "Check Part B Company Policies for billing standardizations, logo sizing, bank account protocols, tax structures, and backup requirements."
    ],
    keywords: [
      "learn makinvoices", "user guide", "app manual", "walkthrough", 
      "step-by-step tutorial", "getting started", "how to use", "how to start", 
      "documentation", "how to configure", "kaise use kare", "seekho", "guide"
    ]
  },
  {
    topic: "Learn MakInvoices - Quick Utilities and Tips",
    route: "/learn#tips",
    source_file: "/src/components/Dashboard.tsx",
    summary: "Quick tips, keyboard shortcuts, and auditing protocols for invoicing efficiency.",
    steps: [
      "Select 'Learn MakInvoices' in the sidebar.",
      "Locate the Quick Utilities card in the sidebar of the page.",
      "Learn keyboard controls (e.g. Ctrl+P for printing), sidebar toggles, and tax auditing protocols."
    ],
    keywords: [
      "keyboard shortcuts", "printing shortcuts", "quick tips", "billing tips", 
      "efficiency tips", "shortcuts", "sidebar toggle", "tax auditing guidelines"
    ]
  },

  // HELP & SUPPORT FAQs
  {
    topic: "Help & Support - Frequently Asked Questions (FAQs)",
    route: "/support",
    source_file: "/src/components/SupportPage.tsx",
    summary: "Quick references, answer cards, and troubleshooting steps for commonly asked billing, tax, sync, security, templates, and catalog questions.",
    steps: [
      "Navigate to the Help & Support page from the sidebar.",
      "Type in the search bar to locate specific questions.",
      "Click on any FAQ category tabs (Billing, Technical, Account, Feature).",
      "Click on a question to expand and view the detailed answer."
    ],
    keywords: [
      "help support", "faqs", "frequently asked questions", "quick references", 
      "troubleshoot", "help center", "support desk", "billing questions", "common issues", 
      "refunds", "problems", "help me", "support card", "queries", "help and support"
    ]
  }
];

// Combine the entries, avoiding topics that exact match the new ones
const filteredData = kbData.filter(d => !newEntries.some(n => n.topic.toLowerCase() === d.topic.toLowerCase()));
const combinedKB = [...filteredData, ...newEntries];

// Autogenerate Hinglish and Hindi synonyms for each entry to improve RAG query matching
combinedKB.forEach(entry => {
  const topicLower = entry.topic.toLowerCase();
  
  if (topicLower.includes("pin") || topicLower.includes("security") || topicLower.includes("lock")) {
    entry.keywords.push(
      "pin reset kaise kare", "security password set karna hai", 
      "lock open nahi ho raha", "pin code change karna hai", "set security questions"
    );
  }
  if (topicLower.includes("invoice") || topicLower.includes("bill") || topicLower.includes("sales")) {
    entry.keywords.push(
      "bill kaise banaye", "bill banana hai", "invoice print kaise kare",
      "invoice edit karna hai", "bill update kaise kare", "invoice number reset"
    );
  }
  if (topicLower.includes("purchase") || topicLower.includes("debit") || topicLower.includes("vendor")) {
    entry.keywords.push(
      "purchase return kaise log kare", "vendor bill entry", 
      "debit note kaise banaye", "supplier records", "purchases entry kaise kare"
    );
  }
  if (topicLower.includes("learn") || topicLower.includes("walkthrough") || topicLower.includes("guide") || topicLower.includes("support") || topicLower.includes("faq")) {
    entry.keywords.push(
      "app kaise chalaye", "user guide dikhao", "help video kahan hai",
      "support se chat kaise kare", "common questions key answer"
    );
  }
});

fs.writeFileSync(kbPath, JSON.stringify(combinedKB, null, 2), 'utf8');
console.log(`Successfully merged manual entries and expanded synonyms. Total KB entries: ${combinedKB.length}`);

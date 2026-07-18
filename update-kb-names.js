const fs = require('fs');
const path = require('path');

const kbPath = path.join(__dirname, 'knowledge-base.json');
let kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

// 1. Remove Auth/Login/Signup entries
kbData = kbData.filter(entry => {
  const t = entry.topic.toLowerCase();
  return !t.includes('auth') && !t.includes('login') && !t.includes('signup');
});

// 2. Map technical topic names to user-friendly UI names
const friendlyNames = {
  'App Entry Point': 'Home',
  'Homepage': 'Home',
  'Pricing Page': 'Pricing',
  'Guide Page': 'Guide',
  'Contact Page': 'Contact',
  'Dashboard': 'Dashboard',
  'Business Profile Modal': 'Company Profile',
  'Invoice Editor Modal': 'Create Invoice',
  'PIN Setup Modal': 'Set PIN',
  'Security Settings': 'Security',
  'Biometric Verification Screen': 'Unlock App',
  'Forgot PIN Flow': 'Reset PIN',
  'Invoice Templates': 'Templates',
  'Recurring Invoices': 'Recurring Bills',
  'Draft Invoices': 'Drafts',
  'Client Management': 'Clients',
  'Reports': 'Reports',
  'Master Vendor Settings': 'Vendors',
  'Master HSN Settings': 'HSN Codes',
  'Master Transport Settings': 'Transport',
  'Catalog Material Settings': 'Materials',
  'Catalog Category Settings': 'Categories',
  'Support Page': 'Support',
  'Theme Toggle': 'Display Settings',
  'Online/Offline Status Indicator': 'Network Status',
  'PIN Lock Management': 'Manage PIN',
  'Custom Invoice Templates': 'Custom Templates',
  'Invoice Bill Template Customization': 'Customize Bill',
  'Tax Settings': 'Taxes',
  'Password Strength Indicator': 'Security',
  'Offline Data Sync': 'Sync',
  'Recurring Invoice Generation': 'Recurring Invoices',
  'Dynamic CSS Customization': 'Appearance',
  'Public Navigation': 'Menu',
  'Company Profile Settings': 'Company Profile',
  'Banking Details Configuration': 'Bank Details',
  'Billing Configuration': 'Billing Settings',
  'Tax Configuration': 'Tax Config',
  'Subscription Details': 'Subscription',
  'Logo Upload and Adjustment': 'Company Logo',
  'Signature Pad': 'Signature',
  'Confirmation Dialog': 'Confirm Action',
  'Confirm Context Provider': 'Confirm'
};

for (const entry of kbData) {
  if (friendlyNames[entry.topic]) {
    entry.topic = friendlyNames[entry.topic];
  } else {
    // Basic cleanup: remove "Modal", "Screen", "Page" if they exist
    entry.topic = entry.topic
      .replace(/ Modal$/i, '')
      .replace(/ Screen$/i, '')
      .replace(/ Page$/i, '')
      .replace(/ Flow$/i, '');
  }
}

fs.writeFileSync(kbPath, JSON.stringify(kbData, null, 2));
console.log(`Knowledge Base updated! Auth entries removed. Topics renamed for UI.`);

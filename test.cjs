const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR LOG:', msg.text());
    }
  });
  page.on('pageerror', error => console.log('PAGE EXCEPTION:', error.message));

  await page.goto('http://localhost:3001/');
  await new Promise(r => setTimeout(r, 2000));

  try {
    // Click 'Start Local Offline Sandbox' on Homepage
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const offlineBtn = btns.find(b => b.textContent && b.textContent.includes('Sandbox'));
      if (offlineBtn) offlineBtn.click();
    });
    console.log('Clicked Sandbox button');
    await new Promise(r => setTimeout(r, 2000));

    // Fill Company Tab
    await page.type('#company-name', 'Test Company');
    await page.type('#company-email', 'test@example.com');
    
    // Click 'Next: Banking Details'
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const next1 = btns.find(b => b.textContent && b.textContent.includes('Next: Banking Details'));
      if (next1) next1.click();
    });
    console.log('Clicked Next: Banking Details');
    await new Promise(r => setTimeout(r, 1000));

    // Fill Banking Tab
    await page.type('#bank-name', 'Test Bank');
    
    // Click 'Next: Billing Details'
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const next2 = btns.find(b => b.textContent && b.textContent.includes('Next: Billing Details'));
      if (next2) next2.click();
    });
    console.log('Clicked Next: Billing Details');
    await new Promise(r => setTimeout(r, 1000));

    // Click 'Save Details'
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.textContent && b.textContent.includes('Save Details'));
      if (saveBtn) saveBtn.click();
    });
    console.log('Clicked Save Details');

    await new Promise(r => setTimeout(r, 3000));
    
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('Body length after save:', bodyHTML.length);
    if (bodyHTML.length < 500) {
       console.log('Body HTML:', bodyHTML);
    }
  } catch(e) {
    console.log('Script error:', e.message);
  }
  
  await browser.close();
})();

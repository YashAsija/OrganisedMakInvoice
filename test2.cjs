const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push('CONSOLE ERROR: ' + msg.text());
    }
  });
  page.on('pageerror', error => {
    errors.push('PAGE EXCEPTION: ' + error.message);
  });

  await page.goto('http://localhost:3001/');
  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(() => {
    localStorage.clear();
  });
  
  await page.goto('http://localhost:3001/');
  await new Promise(r => setTimeout(r, 2000));

  try {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const offlineBtn = btns.find(b => b.textContent && b.textContent.includes('Sandbox'));
      if (offlineBtn) offlineBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));

    // We are now on Homepage, let's type into the company-name
    // Wait, is it rendered?
    const hasCompany = await page.$('#company-name');
    if (hasCompany) {
      await page.type('#company-name', 'My Company');
    }

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const n1 = btns.find(b => b.textContent && b.textContent.includes('Next: Banking Details'));
      if (n1) n1.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const n2 = btns.find(b => b.textContent && b.textContent.includes('Next: Billing Details'));
      if (n2) n2.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const save = btns.find(b => b.textContent && b.textContent.includes('Save Details'));
      if (save) save.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));

    const html = await page.evaluate(() => document.body.innerHTML);
    console.log('HTML Length:', html.length);
    console.log('Errors:', errors);

  } catch(e) {
    console.log('Script Error:', e);
  }
  
  await browser.close();
})();

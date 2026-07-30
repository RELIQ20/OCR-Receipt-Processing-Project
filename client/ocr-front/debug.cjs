const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    for (let i = 0; i < msg.args().length; ++i)
      console.log(`${i}: ${msg.args()[i]}`);
  });
  
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.toString());
  });

  await page.goto('http://localhost:5200');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();

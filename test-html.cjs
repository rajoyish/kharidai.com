const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/login');
  await page.fill('input[name="email"]', 'rajoyish@gmail.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await page.goto('http://localhost:8000/admin/orders');
  await page.waitForLoadState('networkidle');
  const html = await page.content();
  console.log(html);
  await browser.close();
})();

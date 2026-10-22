const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: path.join(out, 'console'), size: { width: 1280, height: 800 } } });
  const page = await ctx.newPage(); const t0 = Date.now(); const marks = [];
  const mark = (name) => { marks.push({ name, t: (Date.now() - t0) / 1000 }); console.log(name, marks.at(-1).t); };
  await page.goto('https://tide.dangpham.id.vn/admin/needtoknow/console/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  if (await page.locator('input#sign_in-input_name').count()) {
    await page.locator('input#sign_in-input_name:visible').fill(process.env.ADMIN_USER);
    await page.locator('input#sign_in-input_password:visible').fill(process.env.ADMIN_PASS);
    await page.locator('input#sign_in-input_password:visible').press('Enter');
  }
  await page.getByText('Change Requests', { exact: true }).first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.getByText('Change Requests', { exact: true }).first().click();
  await page.getByText('Grant Roles').first().waitFor({ timeout: 120000 });
  await page.waitForTimeout(800);
  await page.getByText('Grant Roles').first().evaluate((el) => { const row = el.closest('tr'); if (row) { row.style.outline = '3px solid #f59e0b'; row.style.outlineOffset = '-3px'; } });
  mark('console');
  await page.waitForTimeout(7000);
  await page.screenshot({ path: path.join(out, 'shot-console.png') });
  mark('end');
  const v = page.video(); await ctx.close();
  fs.writeFileSync(path.join(out, 'console-marks.json'), JSON.stringify({ marks, video: await v.path() }));
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });

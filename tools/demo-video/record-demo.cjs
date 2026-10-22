// Records the NeedToKnow demo on production with two real browser sessions and writes scene marks.
// Usage: node record-demo.cjs <outDir> ; env DEMO_USER DEMO_PASS ADMIN_USER ADMIN_PASS
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'https://ntk.dangpham.id.vn';
const CONSOLE = 'https://tide.dangpham.id.vn/admin/needtoknow/console/';
const out = process.argv[2];
const SIZE = { width: 1280, height: 800 };
const marks = { user: [], admin: [] };
const facts = {};

function recorder(who, page, t0) {
  const mark = (name) => { const t = (Date.now() - t0) / 1000; marks[who].push({ name, t }); console.log(who, name, t.toFixed(1)); };
  const hl = async (loc) => {
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await loc.evaluate((el) => { el.style.outline = '3px solid #f59e0b'; el.style.outlineOffset = '3px';
      setTimeout(() => { el.style.outline = ''; }, 1400); }).catch(() => {});
    await page.waitForTimeout(700);
  };
  const click = async (loc) => { await hl(loc); await loc.click(); };
  return { mark, hl, click };
}

async function tideLogin(page, user, pass) {
  const name = page.locator('input#sign_in-input_name:visible');
  await name.waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
  await name.pressSequentially(user, { delay: 45 });
  await page.locator('input#sign_in-input_password:visible').pressSequentially(pass, { delay: 25 });
  await page.waitForTimeout(400);
  await page.locator('input#sign_in-input_password:visible').press('Enter');
}

async function signIn(page, r, user, pass) {
  await r.click(page.getByRole('button', { name: /sign in with tide/i }).first());
  await page.waitForURL(/tideprotocol/, { timeout: 60000 });
  await tideLogin(page, user, pass);
  await page.waitForURL(/\/home/, { timeout: 120000 });
  await page.locator('.doc, .alert').first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const mk = () => browser.newContext({ viewport: SIZE, recordVideo: { dir: out, size: SIZE } });

  // ───────────── Demo user ─────────────
  const lctx = await mk();
  const lp = await lctx.newPage();
  lp.on('dialog', (d) => d.accept());
  const L = recorder('user', lp, Date.now());
  await lp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await lp.waitForTimeout(1500);
  L.mark('landing');
  await lp.waitForTimeout(4500);
  L.mark('signin');
  await signIn(lp, L, process.env.DEMO_USER, process.env.DEMO_PASS);
  L.mark('home');
  await lp.locator('.guide-step').first().waitFor({ timeout: 60000 });
  // Wait for the vault to finish decrypting titles before deciding whether it needs a reset.
  await lp.waitForFunction(() => !document.querySelector('aside .spinner, aside .ring-working'), null, { timeout: 180000 });
  await lp.waitForTimeout(1500);
  const restart = lp.getByRole('button', { name: /restart demo/i });
  if (await lp.locator('.doc').count() && await restart.isEnabled().catch(() => false)) {
    await restart.click();
    await lp.getByRole('button', { name: /load demo documents/i }).waitFor({ state: 'visible', timeout: 60000 });
    await lp.waitForFunction(() => !document.querySelector('.doc'), null, { timeout: 60000 });
    await lp.waitForTimeout(1500);
  }
  L.mark('guide');
  await lp.waitForTimeout(3500);
  const load = lp.getByRole('button', { name: /load demo documents/i });
  await L.click(load);
  L.mark('encrypt');
  await lp.getByText(/Stored 7 document/).waitFor({ timeout: 120000 });
  await lp.waitForTimeout(800);
  L.mark('encrypted');
  const sees = lp.getByLabel(/what the server sees/i);
  await L.hl(sees); await sees.check();
  await lp.waitForTimeout(300);
  L.mark('ciphertext');
  await lp.waitForTimeout(3200);
  await sees.uncheck();
  await lp.locator('.doc').first().screenshot({ path: path.join(out, 'shot-doc.png') }).catch(() => {});

  // Ask: surgery
  await lp.locator('.guide').scrollIntoViewIfNeeded();
  await L.click(lp.getByRole('button', { name: /ask about the surgery/i }));
  L.mark('ask1');
  const rel = lp.getByRole('button', { name: /release \d+ for this question/i });
  await rel.waitFor({ timeout: 120000 });
  await lp.locator('.consent').last().scrollIntoViewIfNeeded();
  facts.consent1 = await lp.locator('.consent h3').last().innerText();
  L.mark('consent1');
  await lp.waitForTimeout(2200);
  await L.hl(lp.locator('.mask-switch').last());
  await lp.waitForTimeout(1200);
  await L.click(rel);
  L.mark('release1');
  await lp.locator('.bubble.ai').first().waitFor({ timeout: 180000 });
  await lp.locator('.bubble.ai').first().scrollIntoViewIfNeeded();
  facts.answer1 = await lp.locator('.bubble.ai').first().innerText();
  L.mark('answer1');
  await lp.waitForTimeout(6000);
  await lp.screenshot({ path: path.join(out, 'shot-answer.png') });
  const sent = lp.locator('details.sent').first();
  await L.click(sent.locator('summary'));
  facts.masked = await sent.locator('summary').innerText();
  await sent.locator('pre').nth(2).scrollIntoViewIfNeeded().catch(() => {});
  L.mark('masked');
  await lp.waitForTimeout(5000);
  await lp.screenshot({ path: path.join(out, 'shot-masked.png') });

  // Hijacked AI + injected invoice
  await lp.locator('.guide').scrollIntoViewIfNeeded();
  await lp.waitForTimeout(800);
  await L.click(lp.getByRole('button', { name: /run a hijacked ai/i }));
  L.mark('ask2');
  await rel.waitFor({ timeout: 120000 });
  const card = lp.locator('.consent').last();
  await card.scrollIntoViewIfNeeded();
  facts.consent2 = await lp.locator('.consent h3').last().innerText();
  L.mark('consent2');
  await lp.waitForTimeout(2500);
  const items = card.locator('.consent-item');
  for (let i = 0; i < await items.count(); i++) {
    const txt = await items.nth(i).innerText();
    const box = items.nth(i).locator('input');
    if (!/Clinic invoice|insurance policy/i.test(txt) && await box.isChecked()) { await L.hl(items.nth(i)); await box.uncheck(); }
  }
  await lp.waitForTimeout(800);
  await L.click(rel);
  L.mark('release2');
  await lp.locator('.bubble.ai').nth(1).waitFor({ timeout: 180000 });
  await lp.waitForTimeout(600);
  const alerts = lp.locator('.alert');
  facts.alerts2 = (await alerts.allInnerTexts()).join(' | ');
  await lp.locator('.alert-danger', { hasText: /tried to run/i }).last().evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await lp.mouse.wheel(0, -90);
  L.mark('answer2');
  await lp.waitForTimeout(5500);
  await lp.screenshot({ path: path.join(out, 'shot-hijacked.png') });
  const denyAll = lp.getByRole('button', { name: /deny all/i });
  if (await denyAll.isVisible().catch(() => false)) {
    await denyAll.scrollIntoViewIfNeeded();
    L.mark('deny');
    await L.click(denyAll);
    await lp.waitForTimeout(2500);
  }
  L.mark('denied');

  await L.click(lp.getByRole('button', { name: /disclosure receipts/i }));
  await lp.locator('table').waitFor({ timeout: 60000 });
  await lp.waitForTimeout(1500);
  L.mark('receipts');
  await lp.waitForTimeout(4000);
  L.mark('user-end');
  const userVideo = lp.video();
  await lctx.close();
  facts.userVideo = await userVideo.path();

  // ───────────── Operator (admin) ─────────────
  const actx = await mk();
  const ap = await actx.newPage();
  const A = recorder('admin', ap, Date.now());
  await ap.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await ap.waitForTimeout(2500);
  await signIn(ap, A, process.env.ADMIN_USER, process.env.ADMIN_PASS);
  await A.click(ap.getByRole('link', { name: /operator console/i }).first());
  await ap.locator('tbody tr').first().waitFor({ timeout: 60000 });
  await ap.waitForTimeout(1500);
  A.mark('store');
  await ap.waitForTimeout(3500);
  const rows = ap.locator('tbody tr');
  let target = -1;
  for (let i = 0; i < await rows.count(); i++) if (!(await rows.nth(i).locator('.pill').count())) { target = i; break; }
  if (target >= 0) {
    const row = rows.nth(target);
    await row.scrollIntoViewIfNeeded();
    A.mark('decrypt');
    await A.click(row.getByRole('button').first());
    await row.locator('.alert').waitFor({ timeout: 120000 });
    await row.scrollIntoViewIfNeeded();
    facts.refusal = await row.locator('.alert').innerText();
    A.mark('refused');
    await ap.waitForTimeout(6000);
    await ap.screenshot({ path: path.join(out, 'shot-refused.png') });
  }
  const rogue = ap.getByRole('button', { name: /run rogue agent/i });
  await rogue.scrollIntoViewIfNeeded();
  A.mark('rogue');
  await A.click(rogue);
  await ap.locator('.bubble.ai').waitFor({ timeout: 120000 });
  await ap.locator('.bubble.ai').scrollIntoViewIfNeeded();
  facts.rogue = await ap.locator('.bubble.ai').innerText();
  A.mark('rogued');
  await ap.waitForTimeout(5000);

  // Governance: the pending change request filed with the server's root credential
  try {
    await ap.goto(CONSOLE, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await ap.waitForTimeout(3000);
    if (await ap.locator('input#sign_in-input_name').count()) await tideLogin(ap, process.env.ADMIN_USER, process.env.ADMIN_PASS);
    await ap.getByText('Change Requests', { exact: true }).first().waitFor({ timeout: 90000 });
    await ap.waitForTimeout(1500);
    await A.click(ap.getByText('Change Requests', { exact: true }).first());
    await ap.waitForTimeout(4000);
    A.mark('console');
    await ap.waitForTimeout(5500);
    await ap.screenshot({ path: path.join(out, 'shot-console.png') });
  } catch (e) { console.log('console scene skipped:', e.message.slice(0, 120)); }
  A.mark('admin-end');
  const adminVideo = ap.video();
  await actx.close();
  facts.adminVideo = await adminVideo.path();

  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify({ marks, facts }, null, 2));
  await browser.close();
  console.log('done');
})().catch((e) => { console.error('FAILED', e.message); fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify({ marks, facts, error: e.message }, null, 2)); process.exit(1); });

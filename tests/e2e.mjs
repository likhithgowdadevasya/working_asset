// End-to-end check of the prototype. Usage: npm run build && node tests/e2e.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/npm-tools/node_modules/playwright'); }
const SHOTS = process.env.SHOTS || './screenshots'; mkdirSync(SHOTS, { recursive: true });
const URL = 'http://localhost:4173/';
const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 5000));
const browser = await pw.chromium.launch();
let step = 0; const ok = (m) => console.log(`✓ ${++step}. ${m}`);
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));

  await page.goto(URL + '?src=ig&utm_content=hookA&v=b'); await page.waitForSelector('h1');
  assert.equal(await page.textContent('h1'), 'Build Your First AI Project in 60 Minutes'); ok('headline renders exactly');
  assert.match(await page.textContent('[data-testid=subhead]'), /Never built anything/); assert.equal((await page.textContent('[data-testid=hero-cta]')).trim(), 'Start my first AI project'); ok('variant B copy via ?v=b');
  await page.screenshot({ path: `${SHOTS}/01-landing-desktop.png`, fullPage: true });

  await page.click('form button[type=submit]');
  assert.ok((await page.textContent('#e-name')).length > 5 && (await page.textContent('#e-email')).length > 5); ok('empty submit shows validation errors');
  await page.fill('#f-name', 'Asha Kumar'); await page.fill('#f-email', 'asha@');
  await page.click('form button[type=submit]'); assert.match(await page.textContent('#e-email'), /incomplete/); ok('invalid email rejected');
  await page.fill('#f-email', 'asha@college.edu'); await page.click('form button[type=submit]');
  await page.waitForSelector('#confirmation'); const conf = await page.textContent('#confirmation');
  assert.match(conf, /only in this browser/); ok('success state shown, with honest demo wording');
  const arm = await page.evaluate(() => JSON.parse(localStorage.getItem('nxtw.regs.v1'))[0]);
  const code = arm.code; assert.match(code, /^[A-Z0-9]{6}$/);
  assert.equal(conf.includes('Squad of 3'), arm.shareArm === 't'); ok(`share arm "${arm.shareArm}" matches confirmation UI`);
  await page.screenshot({ path: `${SHOTS}/02-confirmation.png` });

  await page.goto(URL + '?src=ig&utm_content=hookA'); await page.waitForSelector('h1');
  await page.fill('#f-name', 'Asha Again'); await page.fill('#f-email', 'ASHA@college.edu'); await page.click('form button[type=submit]');
  assert.match(await page.textContent('form .err.big'), /already registered/); ok('duplicate email blocked');

  const p2 = await ctx.newPage(); await p2.goto(URL + `?src=referral&ref=${code}&arm=t`); await p2.waitForSelector('h1');
  assert.match(await p2.textContent('[data-testid=ref-chip]'), new RegExp(code)); assert.equal(await p2.inputValue('#f-ref'), code); ok('referral link opens; code prefilled');
  await p2.fill('#f-name', 'Ravi S'); await p2.fill('#f-email', 'ravi@college.edu'); await p2.click('form button[type=submit]'); await p2.waitForSelector('#confirmation'); ok('referred registration completes');
  const data = await p2.evaluate(() => ({ ev: JSON.parse(localStorage.getItem('nxtw.events.v1')), regs: JSON.parse(localStorage.getItem('nxtw.regs.v1')) }));
  const cnt = (t) => data.ev.filter((e) => e.type === t).length;
  assert.equal(cnt('page_view'), 3); assert.equal(cnt('referral_opened'), 1); assert.equal(cnt('registration_completed'), 2); assert.ok(cnt('form_started') >= 2);
  assert.equal(data.regs[1].ref, code); assert.equal(data.regs[1].source, 'referral'); ok(`events logged once each (page_view=3, referral_opened=1, regs=2, form_started=${cnt('form_started')})`);

  await p2.goto(URL + '#/dashboard'); await p2.waitForSelector('[data-testid=mode-banner]');
  assert.match(await p2.textContent('[data-testid=mode-banner]'), /SIMULATED/); assert.match(await p2.textContent('[data-testid=progress-label]'), /384 \/ 500/); ok('dashboard defaults to clearly labelled SIMULATED data (384/500)');
  await p2.screenshot({ path: `${SHOTS}/03-dashboard-simulated.png`, fullPage: true });
  await p2.click('text=My local test data');
  assert.match(await p2.textContent('[data-testid=mode-banner]'), /LOCAL TEST DATA/); assert.match(await p2.textContent('[data-testid=progress-label]'), /^2 \/ 500/);
  const body = await p2.textContent('main'); assert.ok(body.includes('hookA') && !body.includes('asha@college.edu') && !body.includes('Asha Kumar')); ok('local mode shows 2 registrations, hookA row, and no PII');
  await p2.screenshot({ path: `${SHOTS}/04-dashboard-local.png`, fullPage: true });
  p2.once('dialog', (d) => d.accept()); await p2.click('text=Reset local data');
  assert.match(await p2.textContent('[data-testid=progress-label]'), /^0 \/ 500/); assert.match(await p2.textContent('main'), /No registrations yet/); ok('empty state + reset work');

  const m = await (await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true })).newPage();
  for (const [name, path] of [['landing', ''], ['dashboard', '#/dashboard']]) {
    await m.goto(URL + path); await m.reload(); await m.waitForSelector(path ? '.kpis' : 'h1');
    const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert.ok(over <= 1, `${name} overflows by ${over}px`);
    await m.screenshot({ path: `${SHOTS}/05-mobile-${name}.png`, fullPage: true });
  } ok('mobile (390px) has no horizontal overflow on landing or dashboard');
  assert.deepEqual(errs, [], 'console/page errors: ' + errs.join(' | ')); ok('no console errors');
  console.log('\nE2E PASSED');
} catch (e) { console.error('E2E FAILED:', e.message); process.exitCode = 1; }
finally { await browser.close(); srv.kill(); }

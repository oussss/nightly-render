// Records a salon's real booking page being used, like a phone screen recording.
// Usage: node record.mjs <slug> <outDir>. The booking request is caught (nothing is saved).
import fs from 'node:fs';
import { chromium, setupRoutes } from './common.mjs';
const slug = process.argv[2];
const out = process.argv[3] || `/tmp/rec/${slug}`;
const site = process.env.SITE_HOST;
if (!slug || !site) { console.log('FAILED: usage SITE_HOST=… node record.mjs <slug> [outDir]'); process.exit(1); }
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(`${out}/frames`, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR' });
let caught = false;
await setupRoutes(ctx, (m) => { console.log(m); if (m.startsWith('CAUGHT')) caught = true; });
const p = await ctx.newPage();
await p.goto(`https://${site}/${slug}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.locator('.bk-service').first().waitFor({ timeout: 20000 });
await p.waitForTimeout(2500); // photos loaded

// Screencast frames (only sent when the screen changes) with wall-clock timestamps.
const cdp = await ctx.newCDPSession(p);
const frames = []; let n = 0;
cdp.on('Page.screencastFrame', async (f) => {
  const file = `f${String(n++).padStart(5, '0')}.jpg`;
  fs.writeFileSync(`${out}/frames/${file}`, Buffer.from(f.data, 'base64'));
  frames.push({ file, t: f.metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1170, maxHeight: 2532, everyNthFrame: 1 });
// Filmed at half speed (CSS animations slowed with CDP, our own waits doubled),
// then sped back up in tomp4.py: twice the frames for every movement → smooth 60 fps.
const SLOW = 2;
await cdp.send('Animation.enable');
await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / SLOW });
const t0 = Date.now() / 1000;
const now = () => (Date.now() / 1000 - t0) / SLOW;
const events = []; // taps and chapter marks, in seconds from the start
const mark = (name) => events.push({ type: 'mark', name, t: now() });
const wait = (ms) => p.waitForTimeout(ms * SLOW);
// A small heartbeat so the screencast sends frames even on still screens.
await p.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;z-index:99999;pointer-events:none'; document.body.appendChild(d); let k = 0; setInterval(() => { d.style.background = (k++ % 2) ? '#fff' : '#fefefe'; }, 33); });

async function tap(loc, label) {
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  events.push({ type: 'tap', label, t: now(), x: x / 390, y: y / 844 });
  await wait(380); // the finger arrives before the tap lands
  await loc.click({ timeout: 8000 });
}
async function smoothScroll(dy, ms) {
  // One clock (performance.now) for start and steps: with animations slowed for filming,
  // rAF's own timestamp runs on another clock, which made the scroll overshoot and snap
  // back to the top before the first tap (27 Oct 2026).
  await p.evaluate(async ([dy, ms]) => {
    const start = scrollY, t0 = performance.now();
    await new Promise((res) => {
      const step = () => {
        const k = Math.min(1, Math.max(0, (performance.now() - t0) / ms));
        const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        scrollTo(0, start + dy * e);
        k < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }, [dy, ms * SLOW]);
}

// PACE (env, default 1): longer pauses between steps and slower typing, for a calmer video.
const PACE = Number(process.env.PACE || 1);
const pause = (ms) => wait(ms * PACE);

mark('page'); await pause(1200);
await smoothScroll(330, 700 * PACE); await pause(700);
mark('service');
await tap(p.locator('.bk-service').first(), 'service'); await pause(1300);
if (await p.locator('.bkf-row').first().isVisible().catch(() => false)) { // "add another service?" (basket)
  await tap(p.locator('.bkf-cta'), 'continue'); mark('time'); await pause(1300);
} else mark('time');
// Free times load after a day is tapped ("Recherche des disponibilités…"). Wait until
// they're there (up to 20 s) before deciding the day is full: on a slow connection the
// recorder gave up while they were still loading (6 salons on 1 Nov 2026).
const slotsLoaded = () => p.waitForFunction(() => {
  const area = document.querySelector('.bkf-slots-area');
  if (!area) return true;
  const txt = area.textContent || '';
  return !/Recherche des disponibilit|جاري البحث عن المواعيد/.test(txt) && !area.querySelector('.bkf-slot-groups.is-loading');
}, null, { timeout: 20000 }).catch(() => {});
// The first day with a free slot, starting tomorrow (up to a week ahead).
const days = p.locator('.bkf-day');
for (let i = 1; i < Math.min(8, await days.count()); i++) {
  await tap(days.nth(i), 'day'); await slotsLoaded(); await pause(700);
  // a full day passes quickly, like a client browsing; a day with slots gets a proper look
  if (await p.locator('.bkf-slot').first().isVisible().catch(() => false)) { await pause(600); break; }
}
// Salons that only take bookings for today (max_advance_booking_days = 1, e.g. ekri-dz):
// nothing from tomorrow on, so fall back to today.
if (!(await p.locator('.bkf-slot').first().isVisible().catch(() => false)) && await days.count() > 0) {
  await tap(days.nth(0), 'day'); await slotsLoaded(); await pause(900);
}
const slot = p.locator('.bkf-slot').first();
if (!(await slot.isVisible().catch(() => false))) {
  console.log('FAILED: no free slot in the booking window (fully booked, closed, or bookings limited to past hours)');
  await b.close();
  process.exit(2);
}
await tap(slot, 'slot'); await pause(900);
await tap(p.locator('.bkf-cta'), 'continue'); mark('details'); await pause(1300);
const name = p.locator('input[autocomplete="name"]').first();
// Arabic pages get an Arabic client name.
const rtlPage = await p.evaluate(() => !!document.querySelector('[dir="rtl"]'));
await tap(name, 'name'); await p.keyboard.type(rtlPage ? 'سارة' : 'Sarah', { delay: 110 * SLOW * PACE }); await pause(500);
const phone = p.locator('input.react-international-phone-input');
await tap(phone, 'phone'); await p.keyboard.type('555123456', { delay: 90 * SLOW * PACE }); await pause(700);
// Salons that ask for the client's Instagram: like a client, type just the username (the
// field adds "instagram.com/" itself on the first letter).
const insta = p.locator('input.instagram-input');
if (await insta.isVisible().catch(() => false)) {
  await tap(insta, 'instagram'); await p.keyboard.type('sarah.nails', { delay: 45 * SLOW * PACE }); await pause(600);
}
// Services that need a reference photo: attach a sample nail photo (the upload is caught).
const confirmBtn = p.locator('.bkf-cta');
if (await confirmBtn.isDisabled().catch(() => false) && await p.locator('.bkf-photo-btn').first().isVisible().catch(() => false)) {
  const [chooser] = await Promise.all([p.waitForEvent('filechooser', { timeout: 15000 }), tap(p.locator('.bkf-photo-btn').first(), 'photo')]);
  await chooser.setFiles(new URL('../public/chat/nails.jpg', import.meta.url).pathname);
  await pause(1200);
}
await p.evaluate(() => document.activeElement?.blur()); await pause(400);
await tap(confirmBtn, 'confirm'); mark('confirm'); await pause(3200 + (PACE - 1) * 2000); // a longer look at « Demande envoyée » when calmer
mark('end');
if (!(await p.locator('.bkf-success').isVisible().catch(() => false))) {
  console.log('FAILED: the booking did not reach « Demande envoyée » — no video for this salon');
  await p.screenshot({ path: `${out}/failed.png` });
  await b.close();
  process.exit(2);
}
await cdp.send('Page.stopScreencast');
await wait(300);
fs.writeFileSync(`${out}/frames.json`, JSON.stringify({ t0, slow: SLOW, frames }, null, 1));
fs.writeFileSync(`${out}/events.json`, JSON.stringify(events, null, 1));
await p.screenshot({ path: `${out}/last.png` });
console.log(caught ? 'OK: request caught, nothing saved' : 'WARNING: submit not seen');
console.log(frames.length, 'frames,', now().toFixed(1), 's');
await b.close();

// Nightly: the "comment réserver" story video for every ready salon that has none yet, or
// whose page changed since its video (GitHub Actions, .github/workflows/nightly.yml).
//
// A salon is ready with services, a team and opening hours. Its video is redone when the
// fingerprint of its page (name, photos, language, Instagram, booking options, services,
// team) differs from the one stored with the video, or when TEMPLATE_VERSION changes.
// Per salon: details + photos → record its real booking page (record.mjs: the booking and
// any photo upload are caught, nothing is saved) → Remotion 720p 30 fps → ffmpeg → upload
// to the "stories" bucket + salon_story_videos.
//
// Modes: --plan (list tonight's salons and split them for parallel jobs), --ids=a,b (make
// these), --only=<id> (make one), --dry-run (count only). Logs show short ids, never names.
// Env (GitHub secrets, masked in logs): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_HOST,
// BRAND_NAME. Optional: MAX_SALONS (default 60), SHARDS (default 10).
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const TEMPLATE_VERSION = 'v7'; // bump to remake every video after a template change
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const MAX = Number(process.env.MAX_SALONS || 60);
const SHARDS = Number(process.env.SHARDS || 10);
const arg = (name) => (process.argv.find(a => a.startsWith(`--${name}=`)) || '').slice(name.length + 3) || null;
const DRY = process.argv.includes('--dry-run'), PLAN = process.argv.includes('--plan');
const ONLY = arg('only'), IDS = arg('ids')?.split(',').filter(Boolean) ?? null;
// The demo salon is flagged as a test account but keeps its video.
const DEMO_SALON = 'e0021b94-f97a-4b6c-a0c1-a5fe016f6fcd';
const tag = (s) => s.id.slice(0, 8);
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const db = createClient(url, key, { auth: { persistSession: false } });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

function run(cmd, args, { cwd = ROOT, env = {}, timeoutMs = 600000 } = {}) {
  return new Promise((resolve) => {
    const ch = spawn(cmd, args, { cwd, env: { ...process.env, ...env } });
    let out = '';
    ch.stdout.on('data', d => { out += d; });
    ch.stderr.on('data', d => { out += d; });
    const timer = setTimeout(() => { ch.kill('SIGKILL'); out += '\nTIMEOUT'; }, timeoutMs);
    ch.on('close', code => { clearTimeout(timer); resolve({ code, out }); });
  });
}

// PostgREST returns at most 1000 rows per request. Pages need a stable order, or rows can
// repeat or go missing between pages (services has 2,000+ rows).
async function all(table, columns, orderBy = 'salon_id') {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).order(orderBy).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const group = (rows) => rows.reduce((m, r) => (m.get(r.salon_id)?.push(r) ?? m.set(r.salon_id, [r]), m), new Map());

export function fingerprint(s, services, staff) {
  const page = {
    v: TEMPLATE_VERSION, name: (s.business_name || '').trim(), slug: s.slug, lang: s.page_language || 'fr',
    avatar: s.avatar_url || null, cover: s.cover_image_url || null, gallery: s.gallery_images || null,
    ig: s.instagram_username || null, wilaya: s.wilaya || null,
    igField: !!s.instagram_booking_enabled, photo: !!s.require_reference_photo,
    extra: !!s.extra_services_enabled, max: s.max_services_per_booking ?? null,
    services: (services || []).map(v => [v.id, v.name, v.price_da, v.duration_minutes, !!v.requires_reference_photo, v.category]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    staff: (staff || []).map(t => t.id).sort(),
  };
  return crypto.createHash('sha1').update(JSON.stringify(page)).digest('hex');
}

export async function readySalons() {
  const [salons, services, staff, hours, flags, videos] = await Promise.all([
    all('salons', 'id, slug, business_name, page_language, avatar_url, cover_image_url, gallery_images, instagram_username, wilaya, instagram_booking_enabled, require_reference_photo, extra_services_enabled, max_services_per_booking, is_banned, created_at', 'id'),
    all('services', 'id, salon_id, name, price_da, duration_minutes, requires_reference_photo, category, is_active', 'id'),
    all('staff', 'id, salon_id', 'id'),
    all('working_hours', 'salon_id', 'id'),
    all('ops_salon_flags', 'salon_id, is_test'),
    all('salon_story_videos', 'salon_id, video_path, thumb_path, fingerprint'),
  ]);
  // only active services count: a salon whose services are all switched off has an empty page (lunelle-nails, 27 Oct)
  const bySvc = group(services.filter(v => v.is_active !== false)), byStaff = group(staff), withHours = new Set(hours.map(h => h.salon_id));
  const isTest = new Map(flags.map(f => [f.salon_id, !!f.is_test]));
  const video = new Map(videos.map(v => [v.salon_id, v]));
  return salons
    .filter(s => !s.is_banned && s.slug && (s.business_name || '').trim() !== 'Camille Nails')
    .filter(s => !isTest.get(s.id) || s.id === DEMO_SALON)
    .filter(s => bySvc.has(s.id) && byStaff.has(s.id) && withHours.has(s.id))
    .map(s => ({ ...s, fp: fingerprint(s, bySvc.get(s.id), byStaff.get(s.id)), video: video.get(s.id) || null }));
}

// Same as prep.sh: details + photos for the template, in public/story/<slug>/.
async function prep(s) {
  const dir = path.join(ROOT, 'public/story', s.id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const get = async (u, name) => {
    if (!u) return null;
    try {
      const r = await fetch(u);
      if (!r.ok) return null;
      fs.writeFileSync(path.join(dir, name), Buffer.from(await r.arrayBuffer()));
      return name;
    } catch { return null; }
  };
  const gallery = (s.gallery_images || []).map(g => (typeof g === 'string' ? g : g?.url)).filter(Boolean).slice(0, 6);
  const photos = [];
  for (let i = 0; i < gallery.length; i++) { const n = await get(gallery[i], `g${i}.jpg`); if (n) photos.push(n); }
  const ig = (s.instagram_username || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/+$/, '') || s.slug.replace(/-/g, '');
  const salon = {
    name: (s.business_name || '').trim(), slug: s.slug, site: process.env.SITE_HOST, brand: process.env.BRAND_NAME,
    lang: s.page_language || 'fr', ig,
    city: (s.wilaya || '').replace(/^\d+\s*-\s*/, ''),
    avatar: await get(s.avatar_url, 'avatar.jpg'), cover: await get(s.cover_image_url, 'cover.jpg'), photos,
  };
  fs.writeFileSync(path.join(dir, 'salon.json'), JSON.stringify(salon, null, 1));
  return dir;
}

async function upload(s, mp4, thumb) {
  const v = Date.now();
  const vp = `own/${s.id}/story-${v}.mp4`, tp = `own/${s.id}/thumb-${v}.jpg`;
  for (const [p, file, type] of [[vp, mp4, 'video/mp4'], [tp, thumb, 'image/jpeg']]) {
    const { error } = await db.storage.from('stories').upload(p, fs.readFileSync(file), { contentType: type, upsert: true, cacheControl: '31536000' });
    if (error) throw new Error(error.message);
  }
  const { error } = await db.from('salon_story_videos').upsert({ salon_id: s.id, video_path: vp, thumb_path: tp, fingerprint: s.fp, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  if (s.video) await db.storage.from('stories').remove([s.video.video_path, s.video.thumb_path].filter(Boolean));
}

async function main() {
  const ready = await readySalons();
  let todo = ready.filter(s => !s.video || s.video.fingerprint !== s.fp);
  // salons without any video first (newest first), then changed pages
  todo.sort((a, b) => (!!a.video - !!b.video) || String(b.created_at).localeCompare(String(a.created_at)));
  log(`${ready.length} ready salons, ${todo.filter(s => !s.video).length} without a video, ${todo.filter(s => s.video).length} changed`);
  todo = todo.slice(0, MAX);
  if (ONLY) todo = ready.filter(s => s.id === ONLY || s.id.startsWith(ONLY)); // id (or its first 8 characters, as in the logs)
  if (IDS) todo = ready.filter(s => IDS.includes(s.id)); // the plan job already chose them
  if (DRY) { todo.forEach(s => log(' -', tag(s), s.video ? '(changed)' : '(new)')); return; }
  if (PLAN) {
    // round-robin, so new salons (first in the list) are spread over every job
    const n = Math.min(SHARDS, todo.length), shards = Array.from({ length: n }, () => []);
    todo.forEach((s, i) => shards[i % n].push(s.id));
    const out = `matrix=${JSON.stringify(shards.map(ids => ({ ids: ids.join(',') })))}\ncount=${todo.length}\n`;
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, out);
    log(`tonight: ${todo.length} videos in ${n} parallel jobs`);
    return;
  }
  if (!process.env.SITE_HOST || !process.env.BRAND_NAME) throw new Error('SITE_HOST and BRAND_NAME are required');

  const recorded = [];
  for (const s of todo) {
    const rec = `/tmp/rec/${s.id}`, dir = path.join(ROOT, 'public/story', s.id);
    try { await prep(s); } catch (e) { log('FAIL prep', tag(s), e.message); continue; }
    fs.rmSync(rec, { recursive: true, force: true });
    const r = await run('node', ['scripts/record.mjs', s.slug, rec], { env: { PACE: '1.35' }, timeoutMs: 420000 });
    if (r.code !== 0 || !/OK: request caught/.test(r.out)) { log('FAIL record', tag(s), (r.out.match(/FAILED.*|TIMEOUT|Error.*$/m)?.[0] ?? '').slice(0, 160)); continue; }
    const t = await run('python3', ['scripts/tomp4.py', rec, path.join(dir, 'screen.mp4')]);
    fs.copyFileSync(`${rec}/events.json`, path.join(dir, 'events.json'));
    fs.rmSync(`${rec}/frames`, { recursive: true, force: true });
    if (t.code !== 0) { log('FAIL tomp4', tag(s)); continue; }
    log('recorded', tag(s));
    recorded.push(s);
  }
  if (!recorded.length) { log('nothing recorded'); return; }

  const b = await run('npx', ['remotion', 'bundle', '--out-dir', path.join(ROOT, 'build'), '--log=error'], { timeoutMs: 600000 });
  if (b.code !== 0) { log('FAIL bundle', b.out.slice(-400)); process.exit(1); }

  let done = 0;
  for (const s of recorded) {
    const raw = `/tmp/${s.id}-raw.mp4`, mp4 = `/tmp/${s.id}.mp4`, thumb = `/tmp/${s.id}.jpg`;
    const r = await run('npx', ['remotion', 'render', path.join(ROOT, 'build'), 'SalonStory', raw, `--props=${JSON.stringify({ dir: `story/${s.id}`, events: [], fps: 30 })}`, '--scale=0.75' /* 810×1440, whole pixels (Linux refuses 1280.06) */, '--log=error'], { timeoutMs: 1200000 });
    if (r.code !== 0) { log('FAIL render', tag(s), '\n' + r.out.replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter(l => /error|Error|failed|Failed|Cannot|not found/i.test(l)).slice(0, 8).join('\n')); continue; }
    const e1 = await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', mp4]);
    const e2 = await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.3', '-i', raw, '-frames:v', '1', '-vf', 'scale=300:-1', '-q:v', '4', thumb]);
    if (e1.code !== 0 || e2.code !== 0) { log('FAIL encode', tag(s)); continue; }
    try { await upload(s, mp4, thumb); } catch (e) { log('FAIL upload', tag(s), e.message); continue; }
    done++;
    log('DONE', tag(s), `${(fs.statSync(mp4).size / 1048576).toFixed(1)} MB`);
  }
  log(`finished: ${done}/${todo.length} videos uploaded`);
}

// Run only when started directly (the backfill script imports the helpers above).
if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) await main();

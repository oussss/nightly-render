import { chromium } from 'playwright';
export { chromium };
// Fake Turnstile: hands out a dummy token right away.
const FAKE_TS = `window.turnstile={render:function(el,o){setTimeout(function(){o.callback&&o.callback('video-demo-token')},50);return 'w1'},reset:function(){},remove:function(){}};`;
export async function setupRoutes(ctx, log = () => {}) {
  await ctx.route('**/*', async (route) => {
    const u = route.request().url();
    if (u.includes('challenges.cloudflare.com')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_TS });
    // Reference photos are uploaded to storage before the booking is sent: answer it here,
    // nothing is stored.
    if (u.includes('/storage/v1/object/') && !u.includes('/object/public/') && ['POST', 'PUT'].includes(route.request().method())) { log('CAUGHT photo upload (nothing stored)'); return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"Key":"business-media/video-demo.jpg","Id":"video-demo"}' }); }
    if (u.includes('/functions/v1/submit-booking')) { log('CAUGHT submit-booking (nothing saved)'); return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }); }
    if (/track_salon_page|log_ui_event|googletagmanager|google-analytics|sentry\.io|ingest\.|facebook\.net|facebook\.com\/tr|onesignal/.test(u)) return route.fulfill({ status: 204, body: '' });
    // Any other write to the database is refused, to be safe.
    const m = route.request().method();
    if (u.includes('supabase.co/rest/') && !['GET', 'HEAD', 'OPTIONS'].includes(m) && !u.includes('/rpc/get_')) { log('BLOCKED ' + m + ' ' + u.split('?')[0]); return route.fulfill({ status: 204, body: '' }); }
    return route.continue();
  });
}

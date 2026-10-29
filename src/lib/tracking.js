// Local-first tracking. Everything is stored in THIS browser only (localStorage).
// Production note: replace `write*` / `track` with POSTs to an API (see README).
import { normalizeRef } from './validate.js';

const K = { events: 'nxtw.events.v1', regs: 'nxtw.regs.v1', vid: 'nxtw.vid.v1',
  variant: 'nxtw.variant.v1', touch: 'nxtw.touch.v1' };
const mem = {};
const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : (mem[k] ?? d); } catch { return mem[k] ?? d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { mem[k] = v; } };

const ALIASES = { wa: 'whatsapp', tg: 'telegram', ig: 'instagram', li: 'linkedin' };
export const SOURCES = ['whatsapp', 'telegram', 'instagram', 'club', 'referral', 'share', 'linkedin', 'direct', 'other'];
const SAFE = /^[a-zA-Z0-9_-]{1,24}$/;

const rand = (n) => { const a = new Uint32Array(1); (globalThis.crypto || {}).getRandomValues?.(a); return (a[0] || Math.floor(Math.random() * 4294967295)) % n; };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// Pure: parse a query string into a clean attribution object.
export function parseAttribution(search) {
  const p = new URLSearchParams(search || '');
  let src = (p.get('src') || p.get('utm_source') || '').toLowerCase().trim();
  src = ALIASES[src] || src;
  const ref = normalizeRef(p.get('ref'));
  const hookRaw = p.get('utm_content') || p.get('hook') || '';
  const hook = SAFE.test(hookRaw) ? hookRaw : '';
  const v = (p.get('v') || '').toLowerCase();
  const arm = ['c', 't'].includes((p.get('arm') || '').toLowerCase()) ? p.get('arm').toLowerCase() : '';
  let source = SOURCES.includes(src) ? src : (src ? 'other' : '');
  if (ref && !source) source = 'referral';
  const has = Boolean(source || ref || hook);
  return { source: source || 'direct', ref, hook, variantParam: ['a', 'b'].includes(v) ? v : '', arm, has };
}

export function getAttribution() {
  const cur = parseAttribution(typeof location !== 'undefined' ? location.search : '');
  if (cur.has) write(K.touch, cur);
  return read(K.touch, null) || cur;
}

export function getVariant() {
  const cur = parseAttribution(typeof location !== 'undefined' ? location.search : '');
  if (cur.variantParam) { write(K.variant, cur.variantParam); return cur.variantParam; }
  let v = read(K.variant, null);
  if (!v) { v = rand(2) === 0 ? 'a' : 'b'; write(K.variant, v); }
  return v;
}

const visitorId = () => { let v = read(K.vid, null); if (!v) { v = uid(); write(K.vid, v); } return v; };

const fired = new Set(); // once-per-page-load guard (also protects against React StrictMode double effects)
export function track(type, extra = {}, onceKey) {
  if (onceKey) { if (fired.has(onceKey)) return null; fired.add(onceKey); }
  const a = getAttribution();
  const ev = { id: uid(), ts: Date.now(), type, vid: visitorId(), source: a.source, ref: a.ref,
    hook: a.hook, arm: a.arm, variant: getVariant(), ...extra };
  const all = read(K.events, []); all.push(ev);
  write(K.events, all.slice(-5000));
  return ev;
}

export const getEvents = () => read(K.events, []);
export const getRegistrations = () => read(K.regs, []);
export const clearLocalData = () => { [K.events, K.regs, K.touch, K.variant].forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } delete mem[k]; }); fired.clear(); };

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[rand(CODE_CHARS.length)]).join('');

// Creates a registration. `refInput` is the optional code typed/prefilled by the user.
export function registerStudent({ name, email, refInput }) {
  const regs = getRegistrations();
  const mail = email.trim().toLowerCase();
  if (regs.some((r) => r.email === mail)) return { error: 'This email is already registered in this browser.' };
  const a = getAttribution();
  const ref = normalizeRef(refInput) || a.ref;
  let code = makeCode(); while (regs.some((r) => r.code === code)) code = makeCode();
  const rec = { id: uid(), ts: Date.now(), name: name.trim(), email: mail, code, ref,
    source: ref && a.source === 'direct' ? 'referral' : a.source, hook: a.hook, linkArm: a.arm,
    variant: getVariant(), shareArm: rand(2) === 0 ? 'c' : 't' };
  write(K.regs, [...regs, rec]);
  track('registration_completed', { shareArm: rec.shareArm, ref, source: rec.source });
  return { record: rec };
}

export const squadCount = (code) => getRegistrations().filter((r) => r.ref === code).length;

export function shareLink(rec) {
  const base = (typeof location !== 'undefined' ? location.origin + location.pathname : 'https://example.com/');
  return rec.shareArm === 't' ? `${base}?src=referral&ref=${rec.code}&arm=t` : `${base}?src=share&arm=c`;
}

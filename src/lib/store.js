// Local demo store. Everything lives in this browser's localStorage. NOTHING is sent to any server.
// To go to production, replace logEvent() and registerPerson() with calls to your backend (see README).
import { cleanToken } from './validate.js';

const K = { events: 'pp_events', regs: 'pp_regs', variant: 'pp_variant', attr: 'pp_attr' };
const MAX_EVENTS = 5000;
const mem = {}; // fallback when storage is blocked (private mode etc.)

function read(key, fallback) {
  try {
    const v = window.localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return key in mem ? mem[key] : fallback;
  }
}
function write(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { mem[key] = value; }
}
function flag(name) {
  try { return window.sessionStorage.getItem('pp_f_' + name) === '1'; } catch (e) { return !!mem['f_' + name]; }
}
function setFlag(name) {
  try { window.sessionStorage.setItem('pp_f_' + name, '1'); } catch (e) { mem['f_' + name] = true; }
}

export function getAttribution() {
  const p = new URLSearchParams(window.location.search);
  const src = cleanToken(p.get('src') || p.get('utm_source'));
  const ref = cleanToken(p.get('ref'));
  if (src || ref) {
    const a = { src: src || 'direct', ref };
    write(K.attr, a);
    return a;
  }
  return read(K.attr, { src: 'direct', ref: '' });
}

export function getVariant() {
  const p = new URLSearchParams(window.location.search);
  const forced = (p.get('v') || '').toUpperCase();
  if (forced === 'A' || forced === 'B') { write(K.variant, forced); return forced; }
  const saved = read(K.variant, null);
  if (saved === 'A' || saved === 'B') return saved;
  const v = Math.random() < 0.5 ? 'A' : 'B';
  write(K.variant, v);
  return v;
}

export const getEvents = () => read(K.events, []);
export const getRegs = () => read(K.regs, []);

export function logEvent(type, extra = {}) {
  const a = getAttribution();
  const ev = { type, ts: Date.now(), src: a.src, ref: a.ref, variant: getVariant(), ...extra };
  const list = getEvents();
  list.push(ev);
  write(K.events, list.slice(-MAX_EVENTS));
  return ev;
}

// Once per browser session, so a React re-render or refresh does not inflate visits.
export function trackVisit() {
  if (flag('visit')) return;
  setFlag('visit');
  logEvent('visit');
  if (getAttribution().ref && !flag('refopen')) {
    setFlag('refopen');
    logEvent('referral_opened');
  }
}

export function trackFormStarted() {
  if (flag('started')) return;
  setFlag('started');
  logEvent('form_started');
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makeCode(name, existing) {
  const initials = (name.match(/[A-Za-z]+/g) || ['x']).slice(0, 3).map((w) => w[0].toUpperCase()).join('').padEnd(2, 'X');
  for (let i = 0; i < 20; i += 1) {
    let tail = '';
    for (let j = 0; j < 3; j += 1) tail += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    const code = `${initials}-${tail}`;
    if (!existing.some((r) => r.code === code)) return code;
  }
  return `${initials}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

// Returns { status: 'ok' | 'duplicate', reg }
export function registerPerson({ name, email, refEntered }) {
  const regs = getRegs();
  const mail = email.trim().toLowerCase();
  const dup = regs.find((r) => r.email === mail);
  if (dup) return { status: 'duplicate', reg: dup };
  const a = getAttribution();
  const reg = {
    id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    email: mail,
    ts: Date.now(),
    code: makeCode(name, regs),
    ref: cleanToken(refEntered) || a.ref,
    src: a.src,
    variant: getVariant(),
    shareVariant: Math.random() < 0.5 ? 'squad' : 'plain', // Experiment E3 assignment
  };
  regs.push(reg);
  write(K.regs, regs);
  logEvent('registered', { ref: reg.ref, shareVariant: reg.shareVariant });
  return { status: 'ok', reg };
}

export function currentReg() {
  const regs = getRegs();
  return regs.length ? regs[regs.length - 1] : null;
}

// Friends who registered in THIS browser using my code (demo only; production counts server-side).
export function squadCount(code) {
  const k = String(code || '').toLowerCase();
  if (!k) return 0;
  return getRegs().filter((r) => r.ref && r.ref.toLowerCase() === k).length;
}

export function resetLocalData() {
  [K.events, K.regs, K.variant, K.attr].forEach((k) => {
    try { window.localStorage.removeItem(k); } catch (e) { delete mem[k]; }
  });
  ['visit', 'started', 'refopen'].forEach((f) => {
    try { window.sessionStorage.removeItem('pp_f_' + f); } catch (e) { delete mem['f_' + f]; }
  });
}

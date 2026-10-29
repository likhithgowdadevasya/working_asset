import campaign from '../campaign.json';

const day = (ts) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const blank = () => ({ visits: 0, starts: 0, regs: 0 });

// Aggregates ONLY counts. No names/emails ever leave this function.
export function aggregateLocal(events, regs, now = Date.now()) {
  const t = { visits: 0, starts: 0, regs: 0, referralOpens: 0, shares: 0 };
  const bySource = {}, variants = { a: blank(), b: blank() }, hooks = {};
  const arms = { c: { registrants: 0, referred: 0 }, t: { registrants: 0, referred: 0 } };
  const days = [];
  for (let i = 6; i >= 0; i--) days.push({ key: day(now - i * 864e5), label: day(now - i * 864e5), visits: 0, regs: 0 });
  const dmap = Object.fromEntries(days.map((d) => [d.key, d]));
  const src = (s) => (bySource[s] ||= { source: s, visits: 0, regs: 0 });
  for (const e of events) {
    const d = dmap[day(e.ts)];
    if (e.type === 'page_view') { t.visits++; src(e.source).visits++; variants[e.variant || 'a'].visits++; if (e.hook) (hooks[e.hook] ||= blank()).visits++; if (d) d.visits++; }
    if (e.type === 'form_started') { t.starts++; variants[e.variant || 'a'].starts++; }
    if (e.type === 'registration_completed') { t.regs++; src(e.source).regs++; variants[e.variant || 'a'].regs++; if (e.hook) (hooks[e.hook] ||= blank()).regs++; if (d) d.regs++; }
    if (e.type === 'referral_opened') t.referralOpens++;
    if (e.type === 'share_clicked') t.shares++;
  }
  for (const r of regs) { if (arms[r.shareArm]) arms[r.shareArm].registrants++; if (arms[r.linkArm]) arms[r.linkArm].referred++; }
  return finish({ totals: t, bySource: Object.values(bySource), variants, hooks, arms, days });
}

function finish(a) {
  a.bySource = a.bySource.map((s) => ({ ...s, conv: s.visits ? s.regs / s.visits : 0 })).sort((x, y) => y.regs - x.regs);
  a.referralRegs = a.bySource.filter((s) => ['referral', 'share'].includes(s.source)).reduce((n, s) => n + s.regs, 0);
  return a;
}

// ---- SIMULATED sample data (deterministic, hard-coded, NOT real results) ----
const SIM_REGS = {
  whatsapp: { conv: 0.30, d: [22, 31, 28, 26, 24, 27, 30] },
  instagram: { conv: 0.22, d: [6, 9, 14, 15, 13, 12, 11] },
  club: { conv: 0.28, d: [0, 4, 6, 8, 7, 9, 10] },
  referral: { conv: 0.32, d: [0, 2, 5, 9, 12, 14, 16] },
  share: { conv: 0.20, d: [0, 1, 2, 2, 3, 3, 3] },
};
export function simulated() {
  const days = Array.from({ length: 7 }, (_, i) => ({ key: `Day ${i + 1}`, label: `Day ${i + 1}`, visits: 0, regs: 0 }));
  const bySource = Object.entries(SIM_REGS).map(([source, { conv, d }]) => {
    let visits = 0, regs = 0;
    d.forEach((r, i) => { const v = Math.round(r / conv); visits += v; regs += r; days[i].visits += v; days[i].regs += r; });
    return { source, visits, regs };
  });
  const V = days.reduce((n, d) => n + d.visits, 0), R = days.reduce((n, d) => n + d.regs, 0);
  const aV = Math.ceil(V / 2);
  const variants = { a: { visits: aV, starts: 212, regs: 180 }, b: { visits: V - aV, starts: R - 180 + 28, regs: R - 180 } };
  const ig = bySource.find((s) => s.source === 'instagram');
  const hooks = { hookA: { visits: Math.ceil(ig.visits / 2), starts: 0, regs: 44 }, hookB: { visits: Math.floor(ig.visits / 2), starts: 0, regs: ig.regs - 44 } };
  const arms = { c: { registrants: R / 2, referred: 14 }, t: { registrants: R / 2, referred: 58 } };
  return finish({ totals: { visits: V, starts: variants.a.starts + variants.b.starts, regs: R, referralOpens: 241, shares: 96 },
    bySource, variants, hooks, arms, days });
}
export const TARGET = campaign.funnel.target;

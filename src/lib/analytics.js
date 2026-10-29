// Pure analytics over an events array. Works for both local events and simulated sample events.
// Event shape: { type, ts, src, ref, variant, shareVariant?, channel?, day? }

export const CHANNELS = ['Peer groups', 'Short video', 'Paid boost', 'Communities', 'Referral', 'Direct / other'];

export function channelOf(ev) {
  const s = ev.src || 'direct';
  if (s.startsWith('share_') || ev.ref) return 'Referral';
  if (s.startsWith('wa') || s === 'tg') return 'Peer groups';
  if (s === 'reel' || s === 'short' || s === 'shorts') return 'Short video';
  if (s === 'boost') return 'Paid boost';
  if (['reddit', 'discord', 'linkedin', 'community'].includes(s)) return 'Communities';
  return 'Direct / other';
}

const DAY = 86400000;
const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const pct = (a, b) => (b > 0 ? a / b : 0);

export function aggregate(events, target = 500, minDays = 7) {
  const of = (t) => events.filter((e) => e.type === t);
  const visits = of('visit');
  const started = of('form_started');
  const registered = of('registered');
  const refOpened = of('referral_opened');
  const shares = of('share_clicked');

  // Day index: use explicit e.day (sample), otherwise days since the first event.
  const first = events.length ? Math.min(...events.map((e) => e.ts)) : Date.now();
  const base = startOfDay(first);
  const dayOf = (e) => (typeof e.day === 'number' ? e.day : Math.floor((startOfDay(e.ts) - base) / DAY));
  const maxDay = events.length ? Math.max(...events.map(dayOf)) : -1;
  const nDays = Math.max(minDays, maxDay + 1);

  const daily = Array.from({ length: nDays }, (_, i) => ({ day: i + 1, visits: 0, registered: 0, referral: 0, direct: 0 }));
  visits.forEach((e) => { daily[dayOf(e)].visits += 1; });
  registered.forEach((e) => {
    const d = daily[dayOf(e)];
    d.registered += 1;
    if (channelOf(e) === 'Referral') d.referral += 1;
  });
  daily.forEach((d) => { d.direct = d.registered - d.referral; });

  const byChannel = CHANNELS.map((name) => {
    const v = visits.filter((e) => channelOf(e) === name).length;
    const r = registered.filter((e) => channelOf(e) === name).length;
    return { name, visits: v, registered: r, conv: pct(r, v) };
  }).filter((c) => c.visits > 0 || c.registered > 0);

  const variantRow = (key) => {
    const v = visits.filter((e) => e.variant === key).length;
    const s = started.filter((e) => e.variant === key).length;
    const r = registered.filter((e) => e.variant === key).length;
    return { key, visits: v, started: s, registered: r, conv: pct(r, v) };
  };

  const msgTest = ['wa_outcome', 'wa_career', 'wa_lowbar'].map((src) => {
    const v = visits.filter((e) => e.src === src).length;
    const r = registered.filter((e) => e.src === src).length;
    return { src, visits: v, registered: r, conv: pct(r, v) };
  });

  const squadRow = (variant) => {
    const registrants = registered.filter((e) => e.shareVariant === variant).length;
    const shareClicks = shares.filter((e) => e.shareVariant === variant).length;
    const referred = registered.filter((e) => e.src === `share_${variant}`).length;
    return { variant, registrants, shareClicks, referred, perRegistrant: pct(referred, registrants) };
  };

  const referralRegs = registered.filter((e) => channelOf(e) === 'Referral').length;

  return {
    totals: {
      visits: visits.length,
      started: started.length,
      registered: registered.length,
      referralOpened: refOpened.length,
      shares: shares.length,
      conv: pct(registered.length, visits.length),
      referralRegs,
      referralShare: pct(referralRegs, registered.length),
      progress: pct(registered.length, target),
    },
    daily,
    byChannel,
    variants: [variantRow('A'), variantRow('B')],
    msgTest,
    squad: [squadRow('squad'), squadRow('plain')],
    hasData: events.length > 0,
  };
}

export function eventsToCsv(events) {
  // Anonymised on purpose: no names or emails are ever part of events.
  const head = ['type', 'timestamp_iso', 'src', 'ref', 'variant', 'share_variant'];
  const rows = events.map((e) => [e.type, new Date(e.ts).toISOString(), e.src || '', e.ref || '', e.variant || '', e.shareVariant || '']);
  return [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

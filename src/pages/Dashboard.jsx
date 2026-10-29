import { useMemo, useState } from 'react';
import campaign from '../campaign.json';
import Brand from '../components/Brand.jsx';
import { aggregateLocal, simulated, TARGET } from '../lib/aggregate.js';
import { clearLocalData, getEvents, getRegistrations } from '../lib/tracking.js';

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');
const LABEL = { whatsapp: 'WhatsApp', telegram: 'Telegram', instagram: 'Instagram', club: 'Club outreach', referral: 'Squad referral', share: 'Generic share', linkedin: 'LinkedIn', direct: 'Direct', other: 'Other' };

function Kpi({ label, value, sub }) {
  return <div className="kpi"><span className="kpi-l">{label}</span><strong>{value}</strong>{sub && <span className="kpi-s">{sub}</span>}</div>;
}

function DailyChart({ days }) {
  const [tip, setTip] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.regs));
  const W = 560, H = 190, pl = 30, pb = 26, bw = (W - pl) / days.length;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  return (
    <div className="chart" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily registrations bar chart">
        {ticks.map((t) => { const y = H - pb - (t / max) * (H - pb - 22); return <g key={t}><line x1={pl} x2={W} y1={y} y2={y} className="grid" /><text x={pl - 6} y={y + 4} textAnchor="end" className="axis">{t}</text></g>; })}
        {days.map((d, i) => {
          const h = (d.regs / max) * (H - pb - 22); const x = pl + i * bw + bw * 0.2;
          return <g key={d.key} onMouseEnter={() => setTip({ d, x: x + bw * 0.3, y: H - pb - h })} onMouseLeave={() => setTip(null)}>
            <rect x={pl + i * bw} y={0} width={bw} height={H - pb} fill="transparent" />
            <rect x={x} y={H - pb - h} width={bw * 0.6} height={Math.max(h, 0)} rx="4" className="bar-fill" />
            {d.regs > 0 && <text x={x + bw * 0.3} y={H - pb - h - 5} textAnchor="middle" className="val">{d.regs}</text>}
            <text x={x + bw * 0.3} y={H - 8} textAnchor="middle" className="axis">{d.label}</text>
          </g>;
        })}
      </svg>
      {tip && <div className="tip" style={{ left: `${(tip.x / W) * 100}%`, top: 0 }}>{tip.d.label}: {tip.d.regs} registrations · {tip.d.visits} visits</div>}
    </div>
  );
}

function SourceBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.regs));
  if (!rows.length) return <p className="empty">No registrations yet.</p>;
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className="hrow" key={r.source}>
          <span className="hl">{LABEL[r.source] || r.source}</span>
          <div className="htrack"><div className={`hfill ${['referral', 'share'].includes(r.source) ? 'alt' : ''}`} style={{ width: `${(r.regs / max) * 100}%` }} /></div>
          <span className="hv">{r.regs} <small>({pct(r.regs, r.visits)} of {r.visits} visits)</small></span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [mode, setMode] = useState('sim');
  const [tick, setTick] = useState(0);
  const sim = mode === 'sim';
  const a = useMemo(() => (sim ? simulated() : aggregateLocal(getEvents(), getRegistrations())), [sim, tick]); // eslint-disable-line
  const t = a.totals;
  const progress = Math.min(100, (t.regs / TARGET) * 100);
  const refShare = t.regs ? a.referralRegs / t.regs : 0;
  const ctrl = a.arms.c, trt = a.arms.t;
  const per = (x) => (x.registrants ? (x.referred / x.registrants).toFixed(2) : '—');

  return (
    <>
      <header className="top"><Brand /><nav><a href="#/">← Landing page</a></nav></header>
      <main className="dash">
        <h1 className="h1s">Campaign dashboard</h1>
        <div className="seg" role="tablist" aria-label="Data source">
          <button role="tab" aria-selected={sim} className={sim ? 'on' : ''} onClick={() => setMode('sim')}>Simulated sample (7 days)</button>
          <button role="tab" aria-selected={!sim} className={!sim ? 'on' : ''} onClick={() => { setMode('local'); setTick(tick + 1); }}>My local test data</button>
        </div>
        <div className={`banner ${sim ? 'simb' : 'locb'}`} role="note" data-testid="mode-banner">
          {sim ? <><strong>SIMULATED DATA.</strong> These figures are hard-coded sample numbers to show how the dashboard reads. They are not real campaign performance.</>
            : <><strong>LOCAL TEST DATA.</strong> Counts recorded in this browser only while you test the prototype. Not real campaign performance.</>}
          {!sim && <button className="btn small ghost" onClick={() => { if (confirm('Clear all local test events and registrations?')) { clearLocalData(); setTick(tick + 1); } }}>Reset local data</button>}
        </div>
        <p className="muted small">Aggregates only. No names or emails are shown. A production dashboard must sit behind authentication.</p>

        <section className="kpis" aria-label="Key numbers">
          <Kpi label="Registrations" value={t.regs} sub={sim ? 'simulated' : 'local'} />
          <Kpi label="Landing visits" value={t.visits} />
          <Kpi label="Visit → registration" value={pct(t.regs, t.visits)} sub="conversion rate" />
          <Kpi label="Form completion" value={pct(t.regs, t.starts)} sub={`${t.starts} started`} />
          <Kpi label="Referral contribution" value={pct(a.referralRegs, t.regs)} sub={`${a.referralRegs} registrations`} />
        </section>

        <section className="card" aria-label="Target progress">
          <div className="between"><h2>Progress to {TARGET}-registration target</h2><strong data-testid="progress-label">{t.regs} / {TARGET} · {progress.toFixed(0)}%</strong></div>
          <div className="bar big"><span style={{ width: `${progress}%` }} /></div>
          <p className="muted small">The 500 target is a goal, not a forecast. See the growth plan for the base and downside cases.</p>
        </section>

        <div className="two">
          <section className="card"><h2>Daily registrations</h2><DailyChart days={a.days} />
            <details><summary>View as table</summary><table><thead><tr><th>Day</th><th>Visits</th><th>Registrations</th></tr></thead><tbody>{a.days.map((d) => <tr key={d.key}><td>{d.label}</td><td>{d.visits}</td><td>{d.regs}</td></tr>)}</tbody></table></details>
          </section>
          <section className="card"><h2>Registrations by source</h2><SourceBars rows={a.bySource} />
            <p className="muted small">Referral sources (Squad referral, Generic share) use the second colour.</p></section>
        </div>

        <section className="card"><h2>Experiment readouts</h2>
          <h3>Exp. 2 — landing page variant</h3>
          <table><thead><tr><th>Variant</th><th>Visits</th><th>Form starts</th><th>Registrations</th><th>Visit → reg</th></tr></thead><tbody>
            {['a', 'b'].map((k) => <tr key={k}><td>{k.toUpperCase()} · {campaign.headlineVariants[k].label}</td><td>{a.variants[k].visits}</td><td>{a.variants[k].starts}</td><td>{a.variants[k].regs}</td><td>{pct(a.variants[k].regs, a.variants[k].visits)}</td></tr>)}
          </tbody></table>
          <h3>Exp. 1 — message hook (by utm_content)</h3>
          {Object.keys(a.hooks).length ? <table><thead><tr><th>Hook</th><th>Visits</th><th>Registrations</th><th>Visit → reg</th></tr></thead><tbody>
            {Object.entries(a.hooks).map(([k, h]) => <tr key={k}><td>{k}</td><td>{h.visits}</td><td>{h.regs}</td><td>{pct(h.regs, h.visits)}</td></tr>)}</tbody></table>
            : <p className="empty">No visits with utm_content yet. Try <code>?src=ig&amp;utm_content=hookA</code>.</p>}
          <h3>Exp. 3 — share experience</h3>
          <table><thead><tr><th>Arm</th><th>Registrants</th><th>Referred sign-ups</th><th>Referred per registrant</th></tr></thead><tbody>
            <tr><td>Control · generic share</td><td>{ctrl.registrants}</td><td>{ctrl.referred}</td><td>{per(ctrl)}</td></tr>
            <tr><td>Treatment · personal Squad link</td><td>{trt.registrants}</td><td>{trt.referred}</td><td>{per(trt)}</td></tr></tbody></table>
          <p className="muted small">Events recorded: page_view, referral_opened, form_started, registration_completed, share_clicked. Referral link opens: {t.referralOpens} · share clicks: {t.shares}.</p>
        </section>
      </main>
    </>
  );
}

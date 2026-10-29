import { useEffect, useMemo } from 'react';
import campaign from '../campaign.json';
import Brand from '../components/Brand.jsx';
import RegisterForm from '../components/RegisterForm.jsx';
import ShareBox from '../components/ShareBox.jsx';
import { getAttribution, getVariant, track } from '../lib/tracking.js';

const W = campaign.workshop;
const FAQ = [
  ['Is it really free?', 'Yes — the workshop is positioned as a free online workshop.'],
  ['When is it, and who is presenting?', `${W.date} · ${W.time} · ${W.presenter}. These are placeholders until NxtWave confirms them.`],
  ['Do I need AI or ML experience?', '[Prerequisites — to be confirmed by NxtWave.] The campaign is written for students building their first AI project.'],
  ['Will I get a certificate?', '[To be confirmed by NxtWave.] This page does not promise one.'],
  ['What happens to my details?', 'In this prototype your name and email are saved only in your own browser. A production version would store them on a secure server.'],
];
const AUDIENCE = [
  ['Final-year engineering students', 'Any branch. Placement season is when a real project matters most.'],
  ['Beginners with AI', 'You have watched AI videos but have not built anything yet.'],
  ['Builders who want a stronger resume', 'Replace "tutorial clone" with a project you can explain and demo.'],
];

export default function Landing() {
  const att = useMemo(() => getAttribution(), []);
  const v = useMemo(() => getVariant(), []);
  const copy = campaign.headlineVariants[v];

  useEffect(() => {
    track('page_view', {}, 'page_view');
    if (att.ref) track('referral_opened', {}, 'referral_opened');
  }, [att.ref]);

  const base = location.origin + location.pathname;
  return (
    <>
      <div className="proto-bar" role="note">Prototype build for the NxtWave Growth Intern challenge · not an official NxtWave page · date, presenter and URL are placeholders · registrations are stored only in this browser</div>
      <header className="top">
        <Brand />
        <nav aria-label="Primary">
          <a href="#how">What you'll build</a><a href="#faq">FAQ</a><a href="#/dashboard">Dashboard</a>
          <a className="btn small primary" href="#register">Register</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{W.price} online workshop · {W.host}</p>
            <h1>{W.title}</h1>
            <p className="lead" data-testid="subhead">{copy.subhead}</p>
            <div className="btnrow">
              <a className="btn primary big" href="#register" data-testid="hero-cta">{copy.cta}</a>
              <a className="btn ghost big" href="#how">See what you'll build</a>
            </div>
            {att.ref && <p className="chip" data-testid="ref-chip">You were invited with code {att.ref}</p>}
          </div>
          <aside className="card details" aria-label="Workshop details">
            <h2>Workshop details</h2>
            <dl>
              <dt>Format</dt><dd>{W.format} · 60 minutes of building</dd>
              <dt>Date</dt><dd className="ph">{W.date}</dd>
              <dt>Time</dt><dd className="ph">{W.time}</dd>
              <dt>Presenter</dt><dd className="ph">{W.presenter}</dd>
              <dt>Cost</dt><dd>{W.price}</dd>
            </dl>
            <p className="muted small">Items in brackets are placeholders, not confirmed details.</p>
          </aside>
        </section>

        <section id="how" className="section">
          <h2>What you can expect to leave with</h2>
          <p className="muted">{campaign.outcomesNote}</p>
          <ol className="outcomes">
            {campaign.outcomesProposed.map((o, i) => <li key={i}><span className="num">{i + 1}</span><p>{o}</p></li>)}
          </ol>
        </section>

        <section className="section">
          <h2>Who it's for</h2>
          <div className="grid3">
            {AUDIENCE.map(([t, d]) => <div className="card" key={t}><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </section>

        <section id="register" className="section reg">
          <div>
            <h2>Reserve your free seat</h2>
            <p className="lead small">{campaign.campaign.coreMessage}</p>
            <ul className="ticks"><li>Free</li><li>Takes about 20 seconds</li><li>Just a name and an email</li></ul>
          </div>
          <div className="card"><RegisterForm cta={copy.cta} /></div>
        </section>

        <section className="section">
          <h2>Bring a friend</h2>
          <div className="card"><ShareBox link={`${base}?src=share&arm=c`} title="Share this workshop" note="Final-years learn from friends. Forward it to one classmate who has not built an AI project yet." /></div>
        </section>

        <section id="faq" className="section">
          <h2>Questions</h2>
          {FAQ.map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
        </section>
      </main>
      <footer className="foot"><Brand /><span>Prototype · Demo data lives in your browser · <a href="#/dashboard">Campaign dashboard</a></span></footer>
    </>
  );
}

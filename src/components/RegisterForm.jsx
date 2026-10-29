import { useState } from 'react';
import { validateRegistration } from '../lib/validate.js';
import { getAttribution, registerStudent, track, shareLink, squadCount } from '../lib/tracking.js';
import ShareBox from './ShareBox.jsx';

export default function RegisterForm({ cta }) {
  const att = getAttribution();
  const [f, setF] = useState({ name: '', email: '', ref: att.ref || '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [done, setDone] = useState(null);
  const [formError, setFormError] = useState('');

  const start = () => track('form_started', {}, 'form_started');
  const change = (k) => (e) => {
    const next = { ...f, [k]: e.target.value };
    setF(next); start();
    if (touched[k]) setErrors(validateRegistration(next));
  };
  const blur = (k) => () => { setTouched({ ...touched, [k]: true }); setErrors(validateRegistration(f)); };

  const submit = (e) => {
    e.preventDefault();
    const v = validateRegistration(f);
    setErrors(v); setTouched({ name: true, email: true, ref: true });
    if (Object.keys(v).length) { document.querySelector('[aria-invalid="true"]')?.focus(); return; }
    const res = registerStudent({ name: f.name, email: f.email, refInput: f.ref });
    if (res.error) { setFormError(res.error); return; }
    setFormError(''); setDone(res.record);
  };

  if (done) {
    const link = shareLink(done);
    const n = squadCount(done.code);
    return (
      <div className="confirm" role="status" aria-live="polite" id="confirmation">
        <div className="tick" aria-hidden="true">✓</div>
        <h3>You're registered, {done.name.split(' ')[0]}.</h3>
        <p>Demo confirmation: a real deployment would email joining details to <strong>{done.email}</strong>. In this prototype your entry is stored <strong>only in this browser</strong>; nothing is sent to a server.</p>
        {done.shareArm === 't' ? (
          <>
            <ShareBox link={link} title="Build your Squad of 3" note="Friends who register with your link count toward your Squad. Top 5 referrers by verified, unique sign-ups receive a ₹100 reward (campaign rule)." />
            <div className="squad" aria-label="Squad progress"><div className="bar"><span style={{ width: `${Math.min(100, (n / 3) * 100)}%` }} /></div><strong>{n} of 3 friends joined</strong> <span className="muted">· your code {done.code}</span></div>
          </>
        ) : (
          <ShareBox link={link} title="Know someone who should join?" note="Forward this link to a friend." />
        )}
        <p className="proto">Prototype note · share experience shown: {done.shareArm === 't' ? 'personal Squad link (treatment)' : 'generic share (control)'}</p>
      </div>
    );
  }

  const field = (k, label, props = {}, hint) => (
    <div className="field">
      <label htmlFor={`f-${k}`}>{label}</label>
      <input id={`f-${k}`} name={k} value={f[k]} onChange={change(k)} onBlur={blur(k)}
        aria-invalid={Boolean(touched[k] && errors[k])} aria-describedby={`e-${k}`} {...props} />
      {hint && !errors[k] && <span className="hint">{hint}</span>}
      <span id={`e-${k}`} className="err" role="alert">{touched[k] ? errors[k] : ''}</span>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="form" aria-label="Workshop registration">
      {field('name', 'Full name', { autoComplete: 'name', placeholder: 'e.g. Asha Kumar' })}
      {field('email', 'Email address', { type: 'email', autoComplete: 'email', inputMode: 'email', placeholder: 'you@college.edu' })}
      {field('ref', 'Referral code (optional)', { placeholder: 'e.g. K7M2QX', autoCapitalize: 'characters' }, att.ref ? 'Filled in from the link you opened.' : 'Got a code from a friend? Add it here.')}
      {formError && <p className="err big" role="alert">{formError}</p>}
      <button className="btn primary block" type="submit">{cta}</button>
      <p className="fine">We ask only for your name and email. Prototype: data stays in this browser (localStorage) and is never shown publicly.</p>
    </form>
  );
}

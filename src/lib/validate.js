const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const REF_RE = /^[A-Z0-9]{4,10}$/;

export function normalizeRef(v) {
  const r = String(v || '').trim().toUpperCase();
  return REF_RE.test(r) ? r : '';
}

// Returns an object of field -> message. Empty object means valid.
export function validateRegistration({ name, email, ref }) {
  const e = {};
  const n = String(name || '').trim();
  if (n.length < 2) e.name = 'Please enter your full name (at least 2 characters).';
  else if (n.length > 80) e.name = 'Name is too long (max 80 characters).';
  const m = String(email || '').trim();
  if (!m) e.email = 'Please enter your email address.';
  else if (!EMAIL.test(m)) e.email = 'That email address looks incomplete. Example: name@college.edu';
  const r = String(ref || '').trim();
  if (r && !REF_RE.test(r.toUpperCase())) e.ref = 'Referral codes are 4–10 letters or numbers.';
  return e;
}

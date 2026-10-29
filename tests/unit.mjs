import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeFunnel } from '../src/lib/funnel.js';
import { validateRegistration, normalizeRef } from '../src/lib/validate.js';
import { parseAttribution, registerStudent, getRegistrations, clearLocalData, shareLink, squadCount } from '../src/lib/tracking.js';
const c = JSON.parse(readFileSync(new URL('../src/campaign.json', import.meta.url)));

// Funnel arithmetic (matches the growth plan)
const base = computeFunnel(c.funnel.base), down = computeFunnel(c.funnel.downside);
assert.equal(base.directRegs, 363); assert.equal(base.refRegs, 145); assert.equal(base.totalRegs, 508);
assert.equal(base.totalVisits, 1743); assert.equal(base.attendees, 178);
assert.equal(down.directRegs, 84); assert.equal(down.refRegs, 13); assert.equal(down.totalRegs, 97); assert.equal(down.attendees, 24);
assert.equal(c.budget.lines.reduce((n, l) => n + l.amount, 0), c.budget.total);
assert.ok(c.budget.total <= 2000);
assert.equal(c.funnel.base.paidBudget / c.funnel.base.paidCpm * 1000 + c.funnel.base.organicIgReach, c.funnel.base.channels[1].reach);
assert.equal(c.funnel.downside.paidBudget / c.funnel.downside.paidCpm * 1000 + c.funnel.downside.organicIgReach, c.funnel.downside.channels[1].reach);

// Validation
assert.ok(validateRegistration({ name: 'A', email: 'x' }).name);
assert.ok(validateRegistration({ name: 'Asha K', email: 'asha@' }).email);
assert.deepEqual(validateRegistration({ name: 'Asha K', email: 'asha@college.edu', ref: '' }), {});
assert.ok(validateRegistration({ name: 'Asha K', email: 'a@b.co', ref: '!!' }).ref);
assert.equal(normalizeRef(' ab12cd '), 'AB12CD'); assert.equal(normalizeRef('<script>'), '');

// Attribution parsing
assert.equal(parseAttribution('?src=wa').source, 'whatsapp');
assert.equal(parseAttribution('?utm_source=ig&utm_content=hookA').hook, 'hookA');
assert.equal(parseAttribution('?ref=ab12cd').source, 'referral');
assert.equal(parseAttribution('').source, 'direct');
assert.equal(parseAttribution('?src=evil<b>').source, 'other');
assert.equal(parseAttribution('?utm_content=<x>').hook, '');

// Registration + duplicate + squad count
clearLocalData();
const r1 = registerStudent({ name: 'Asha K', email: 'Asha@College.edu', refInput: '' });
assert.ok(r1.record.code.length === 6);
assert.ok(registerStudent({ name: 'Asha K', email: 'asha@college.edu' }).error);
const r2 = registerStudent({ name: 'Ravi', email: 'ravi@college.edu', refInput: r1.record.code });
assert.equal(squadCount(r1.record.code), 1); assert.equal(r2.record.source, 'referral');
assert.equal(getRegistrations().length, 2);
assert.ok(shareLink({ shareArm: 't', code: 'ABC123' }).includes('ref=ABC123'));
assert.ok(!shareLink({ shareArm: 'c', code: 'ABC123' }).includes('ref='));
console.log('unit tests passed');

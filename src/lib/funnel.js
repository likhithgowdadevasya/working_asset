// Pure funnel model. Every input is an ASSUMPTION defined in campaign.json.
export function computeFunnel(s) {
  const rows = s.channels.map((c) => {
    const visits = Math.round(c.reach * c.ctr);
    const regs = Math.round(visits * c.conv);
    return { ...c, visits, regs };
  });
  const directVisits = rows.reduce((a, r) => a + r.visits, 0);
  const directRegs = rows.reduce((a, r) => a + r.regs, 0);
  const refRegs = Math.round(directRegs * s.referral.sharerRate * s.referral.regsPerSharer);
  const refVisits = Math.round(refRegs / s.referral.conv);
  const totalRegs = directRegs + refRegs;
  const totalVisits = directVisits + refVisits;
  const attendees = Math.round(totalRegs * s.showUp);
  return { rows, directVisits, directRegs, refRegs, refVisits, totalRegs, totalVisits,
    attendees, overallConv: totalRegs / totalVisits };
}

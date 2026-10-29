import { useState } from 'react';
import campaign from '../campaign.json';
import { track } from '../lib/tracking.js';

export default function ShareBox({ link, title, note }) {
  const [copied, setCopied] = useState(false);
  const text = `${campaign.campaign.coreMessage} "${campaign.workshop.title}" — free online workshop by NxtWave.`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); }
    catch { const t = document.getElementById('share-link'); t?.select(); document.execCommand?.('copy'); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    track('share_clicked', { channel: 'copy' });
  };
  return (
    <div className="share">
      <h3>{title}</h3>
      {note && <p className="muted">{note}</p>}
      <div className="linkrow">
        <input id="share-link" readOnly value={link} aria-label="Share link" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn ghost" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
      </div>
      <div className="btnrow">
        <a className="btn wa" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => track('share_clicked', { channel: 'whatsapp' })}>Share on WhatsApp</a>
        <a className="btn ghost" href={tg} target="_blank" rel="noopener noreferrer" onClick={() => track('share_clicked', { channel: 'telegram' })}>Telegram</a>
      </div>
    </div>
  );
}

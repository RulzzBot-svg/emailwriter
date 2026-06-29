import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { TONES, buildEmailPrompt, generateEmail } from '../lib/email';

const MAX_INPUT_LENGTH = 10_000;

const EXAMPLE_NOTES = 'hey sarah - report is late sorry. need 2 more days. almost done just fixing charts';

export default function Demo({ onUsageRefresh }) {
  const [notes, setNotes] = useState(EXAMPLE_NOTES);
  const [tone, setTone] = useState('professional');
  const [shortSimple, setShortSimple] = useState(false);
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const onGenerate = async () => {
    const draft = notes.trim().slice(0, MAX_INPUT_LENGTH);
    if (!draft) {
      setStatus('Add some rough notes first.');
      return;
    }

    setLoading(true);
    setStatus('');
    setResult('');

    try {
      const prompt = buildEmailPrompt({ draftNotes: draft, tone, shortSimple });
      const text = await generateEmail({ prompt });
      setResult(text);
      setStatus('Draft ready.');
      await onUsageRefresh?.();
    } catch (error) {
      setStatus(error?.message || 'Something went wrong.');
      if (error?.code === 'USAGE_LIMIT') {
        await onUsageRefresh?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    if (!result.trim()) {
      return;
    }
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="demo-shell">
      <div className="demo-controls">
        <div className="demo-control-row">
          <label htmlFor="demo-tone">Tone</label>
          <select id="demo-tone" value={tone} onChange={(event) => setTone(event.target.value)}>
            {TONES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            className={`toggle-chip ${shortSimple ? 'active' : ''}`}
            onClick={() => setShortSimple((prev) => !prev)}
          >
            Short + simple
          </button>
        </div>
      </div>

      <div className="demo-panels">
        <div className="demo-panel">
          <div className="demo-panel-head">
            <span>Messy notes</span>
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Type rough thoughts here..."
            rows={10}
          />
        </div>

        <div className="demo-panel demo-panel-output">
          <div className="demo-panel-head">
            <span>Polished email</span>
            {result && (
              <button type="button" className="icon-btn" onClick={onCopy} aria-label="Copy result">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
          </div>
          <textarea
            readOnly
            value={result}
            placeholder={loading ? 'Generating...' : 'Your polished draft appears here.'}
            rows={10}
          />
        </div>
      </div>

      <div className="demo-actions">
        <button type="button" className="btn btn-primary" onClick={onGenerate} disabled={loading}>
          <Sparkles size={16} />
          {loading ? 'Polishing...' : 'Try ProDraft'}
        </button>
        {status && <p className="demo-status">{status}</p>}
      </div>
    </div>
  );
}

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';

const sections = [
  {
    title: 'What ProDraft does',
    body: (
      <p>
        ProDraft helps you rewrite email drafts into clearer, more professional text. The browser
        extension only reads compose-box text when you open ProDraft and click Generate. ProDraft
        never sends email on your behalf.
      </p>
    ),
  },
  {
    title: 'Information we collect',
    body: (
      <>
        <p>When you use ProDraft, we may process:</p>
        <ul>
          <li>Email draft text you choose to polish</li>
          <li>Tone and length preferences you select</li>
          <li>An anonymous client ID stored in your browser for usage limits and billing</li>
          <li>Basic usage counts (how many polishes you have used this month)</li>
          <li>If you upgrade to Pro: billing details handled by Stripe (we do not store card numbers)</li>
          <li>If you submit the suggestion form: your name, email, and message</li>
        </ul>
      </>
    ),
  },
  {
    title: 'How we use your information',
    body: (
      <ul>
        <li>Generate polished email drafts through our API</li>
        <li>Enforce free and Pro plan usage limits</li>
        <li>Process subscriptions when billing is enabled</li>
        <li>Respond to feedback you send through the website</li>
        <li>Prevent abuse and keep the service reliable</li>
      </ul>
    ),
  },
  {
    title: 'Third-party services',
    body: (
      <>
        <p>Draft text is sent to our backend, which uses Google Gemini to generate polished text. Google&apos;s terms and privacy policy apply to that processing.</p>
        <p>We may also use:</p>
        <ul>
          <li>Vercel — website and API hosting</li>
          <li>Upstash Redis — usage limit storage (when configured)</li>
          <li>Stripe — subscription billing (when configured)</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Data retention',
    body: (
      <p>
        We do not store your email drafts long-term. Draft text is processed to generate a result
        and is not kept as a permanent inbox archive. Usage counts and anonymous client IDs may be
        retained to enforce monthly limits and manage billing.
      </p>
    ),
  },
  {
    title: 'What we do not do',
    body: (
      <ul>
        <li>Read your inbox or email list automatically</li>
        <li>Send email for you</li>
        <li>Sell your personal data</li>
        <li>Access compose text unless you open ProDraft and click Generate</li>
      </ul>
    ),
  },
  {
    title: 'Your choices',
    body: (
      <ul>
        <li>You choose what draft text to send for polishing</li>
        <li>You can uninstall the extension at any time</li>
        <li>You can clear extension storage from your browser settings</li>
        <li>You review every generated draft before sending</li>
      </ul>
    ),
  },
  {
    title: 'Children',
    body: <p>ProDraft is not directed at children under 13, and we do not knowingly collect their information.</p>,
  },
  {
    title: 'Changes',
    body: (
      <p>
        We may update this policy from time to time. The &quot;Last updated&quot; date at the top
        of this page will change when we do.
      </p>
    ),
  },
  {
    title: 'Contact',
    body: (
      <p>
        Questions about privacy? Use the suggestion form on the{' '}
        <a href="/#suggestions">ProDraft website</a> or the developer contact email listed on the
        Chrome Web Store listing.
      </p>
    ),
  },
];

export default function Privacy() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="site-shell">
      <nav className="top-nav">
        <a className="brand" href="/">ProDraft</a>

        <div className="nav-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      <main className="legal-page">
        <article className="panel legal-card">
          <p className="kicker">Legal</p>
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: July 2026</p>

          {sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>
              {section.body}
            </section>
          ))}
        </article>
      </main>

      <footer className="site-footer">
        <p>
          <a href="/">← Back to ProDraft</a>
        </p>
      </footer>
    </div>
  );
}

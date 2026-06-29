import { useEffect, useState } from 'react';
import { Mail, Zap, Shield, Menu, X, Sun, Moon } from 'lucide-react';
import Demo from './components/Demo.jsx';
import Pricing from './components/Pricing.jsx';
import UsageBar from './components/UsageBar.jsx';
import { useTheme } from './hooks/useTheme.js';
import { fetchUsage, openBillingPortal, startCheckout } from './lib/billing.js';

const INSTALL_URL = import.meta.env.VITE_CHROME_STORE_URL || 'https://chromewebstore.google.com/';

const installSteps = [
  {
    title: 'Open the extension listing',
    description: 'Click Install to open the Chrome Web Store page for ProDraft.',
  },
  {
    title: 'Add to your browser',
    description: 'Choose Add to Chrome and confirm the permissions prompt.',
  },
  {
    title: 'Pin and start writing',
    description: 'Pin ProDraft, open Gmail or Outlook, and click Polish while composing.',
  },
];

const benefits = [
  {
    icon: Zap,
    title: 'Write faster',
    detail: 'Turn rough notes into polished email in seconds without losing your intent.',
  },
  {
    icon: Mail,
    title: 'Sound consistent',
    detail: 'Choose tone on demand so follow-ups, updates, and requests stay on-brand.',
  },
  {
    icon: Shield,
    title: 'You stay in control',
    detail: 'ProDraft only generates draft text. You review and send every message yourself.',
  },
];

const beforeAfter = {
  before: 'hey sarah - report is late sorry. need 2 more days. almost done just fixing charts',
  after: `Hi Sarah,

I wanted to let you know the report will be delayed by two days. I'm finalizing the charts and expect to send the completed version shortly.

Thank you for your patience.

Best regards`,
};

const faqs = [
  {
    question: 'Does ProDraft send emails for me?',
    answer: 'No. It only generates draft text. You always review and send manually.',
  },
  {
    question: 'Where does it work?',
    answer: 'Gmail, Outlook on the web, and Yahoo Mail via the browser extension. You can also try it on this page.',
  },
  {
    question: 'Can I control writing style?',
    answer: 'Yes. Pick a tone and toggle short + simple to match the situation.',
  },
  {
    question: 'Is my API key exposed?',
    answer: 'No. The extension calls the ProDraft backend, and your Gemini key stays on the server.',
  },
];

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [usage, setUsage] = useState(null);
  const [usageMessage, setUsageMessage] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', suggestion: '' });
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'Could not send suggestion.');
      }

      setSubmitMessage('Thanks — your suggestion was received.');
      setFormData({ name: '', email: '', suggestion: '' });
    } catch (error) {
      setSubmitMessage(error?.message || 'Could not send suggestion.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeNav = () => setNavOpen(false);

  const refreshUsage = async () => {
    try {
      const next = await fetchUsage();
      setUsage(next);
    } catch (error) {
      setUsageMessage(error?.message || 'Could not load usage.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetchUsage()
      .then((next) => {
        if (!cancelled) {
          setUsage(next);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setUsageMessage(error?.message || 'Could not load usage.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onUpgrade = async () => {
    setBillingLoading(true);
    setUsageMessage('');
    try {
      const url = await startCheckout();
      window.location.href = url;
    } catch (error) {
      setUsageMessage(error?.message || 'Checkout is unavailable right now.');
      setBillingLoading(false);
    }
  };

  const onManageBilling = async () => {
    setBillingLoading(true);
    setUsageMessage('');
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch (error) {
      setUsageMessage(error?.message || 'Billing portal is unavailable.');
      setBillingLoading(false);
    }
  };

  return (
    <div className="site-shell">
      <nav className="top-nav">
        <a className="brand" href="#top" onClick={closeNav}>ProDraft</a>

        <button
          type="button"
          className="nav-toggle"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setNavOpen((prev) => !prev)}
        >
          {navOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={`nav-links ${navOpen ? 'open' : ''}`}>
          <a href="#demo" onClick={closeNav}>Try it</a>
          <a href="#pricing" onClick={closeNav}>Pricing</a>
          <a href="#install-steps" onClick={closeNav}>Install</a>
          <a href="#benefits" onClick={closeNav}>Why it helps</a>
          <a href="#faq" onClick={closeNav}>FAQ</a>
          <a href="#suggestions" onClick={closeNav}>Suggestions</a>
        </div>

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

          <a className="btn btn-primary nav-install" href={INSTALL_URL} target="_blank" rel="noreferrer">
            Install
          </a>
        </div>
      </nav>

      <header id="top" className="hero">
        <div className="hero-grid">
          <div className="hero-copy-block">
            <p className="kicker">Browser extension + live demo</p>
            <h1>Turn messy notes into send-ready email.</h1>
            <p className="hero-copy">
              ProDraft reads your rough thoughts and rewrites them into clear, professional email —
              without changing what you meant to say.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#demo">Try it now</a>
              <a className="btn" href={INSTALL_URL} target="_blank" rel="noreferrer">Install extension</a>
            </div>
          </div>

          <div className="before-after panel">
            <p className="before-after-label">Before → After</p>
            <div className="before-after-grid">
              <div>
                <span className="chip chip-muted">Messy</span>
                <p>{beforeAfter.before}</p>
              </div>
              <div>
                <span className="chip chip-accent">Polished</span>
                <pre>{beforeAfter.after}</pre>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <UsageBar
          usage={usage}
          message={usageMessage}
          loading={billingLoading}
          onUpgrade={onUpgrade}
          onManage={onManageBilling}
        />

        <section id="demo" className="section">
          <h2>Try ProDraft</h2>
          <p className="section-lead">Same engine as the extension — no install required.</p>
          <Demo onUsageRefresh={refreshUsage} />
        </section>

        <Pricing usage={usage} onRefreshUsage={refreshUsage} />

        <section id="install-steps" className="section">
          <h2>How to install</h2>
          <div className="grid steps-grid">
            {installSteps.map((step, index) => (
              <article key={step.title} className="panel reveal">
                <p className="step-index">Step {index + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="benefits" className="section">
          <h2>Why this is useful</h2>
          <div className="grid benefit-grid">
            {benefits.map(({ icon: Icon, title, detail }) => (
              <article key={title} className="panel reveal benefit-card">
                <Icon size={22} className="benefit-icon" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="section faq">
          <h2>FAQ</h2>
          <div className="faq-list">
            {faqs.map((item) => (
              <details key={item.question} className="faq-item reveal">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="suggestions" className="section suggestions">
          <h2>Suggestions</h2>
          <p className="section-lead">Share one thing that would make ProDraft better for your workflow.</p>
          <form className="suggestion-form panel" onSubmit={onSubmit}>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={onFieldChange}
              placeholder="Your name"
            />

            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={onFieldChange}
              placeholder="you@company.com"
            />

            <label htmlFor="suggestion">Suggestion</label>
            <textarea
              id="suggestion"
              name="suggestion"
              rows="4"
              value={formData.suggestion}
              onChange={onFieldChange}
              placeholder="I want ProDraft to..."
              required
            />

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send suggestion'}
            </button>
            {submitMessage && <p className="form-status">{submitMessage}</p>}
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <p>ProDraft generates drafts only — it never sends email on your behalf.</p>
        <p className="footer-muted">Works with Gmail, Outlook on the web, and Yahoo Mail.</p>
        <p className="footer-muted">
          <a href="/privacy.html">Privacy policy</a>
        </p>
      </footer>
    </div>
  );
}

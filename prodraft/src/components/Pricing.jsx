import { useState } from 'react';
import { Check } from 'lucide-react';
import { openBillingPortal, startCheckout } from '../lib/billing';

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    detail: 'Try ProDraft in Gmail, Outlook, and on the web.',
    features: ['20 polishes / month', 'All core tones', 'Inline compose assistant'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$7',
    suffix: '/ month',
    detail: 'For people who polish email every week.',
    features: ['500 polishes / month', 'All tones + short mode', 'Extension + website access', 'Cancel anytime'],
    highlighted: true,
  },
];

export default function Pricing({ usage, onRefreshUsage }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isPro = usage?.planId === 'pro';
  const billingEnabled = usage?.billingEnabled;

  const onUpgrade = async () => {
    setLoading(true);
    setMessage('');
    try {
      const url = await startCheckout(email.trim());
      window.location.href = url;
    } catch (error) {
      setMessage(error?.message || 'Could not start checkout.');
      setLoading(false);
    }
  };

  const onManage = async () => {
    setLoading(true);
    setMessage('');
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch (error) {
      setMessage(error?.message || 'Could not open billing portal.');
      setLoading(false);
    }
  };

  return (
    <section id="pricing" className="section">
      <h2>Pricing</h2>
      <p className="section-lead">
        Start free, upgrade when ProDraft becomes part of your routine.
      </p>

      <div className="pricing-grid">
        {tiers.map((tier) => (
          <article key={tier.id} className={`panel pricing-card ${tier.highlighted ? 'pricing-card-pro' : ''}`}>
            <p className="pricing-label">{tier.name}</p>
            <p className="pricing-price">
              {tier.price}
              {tier.suffix && <span>{tier.suffix}</span>}
            </p>
            <p className="pricing-detail">{tier.detail}</p>
            <ul className="pricing-features">
              {tier.features.map((feature) => (
                <li key={feature}>
                  <Check size={16} aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {tier.id === 'pro' && (
              <div className="pricing-cta">
                {isPro ? (
                  <button type="button" className="btn" onClick={onManage} disabled={loading}>
                    Manage subscription
                  </button>
                ) : (
                  <>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Email for receipt (optional)"
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={onUpgrade}
                      disabled={loading || !billingEnabled}
                    >
                      {billingEnabled ? 'Upgrade to Pro' : 'Configure Stripe to enable checkout'}
                    </button>
                  </>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {usage && (
        <p className="pricing-footnote">
          Current plan: <strong>{usage.planName}</strong> — {usage.used}/{usage.limit} polishes used this month.
          {' '}
          <button type="button" className="link-button" onClick={onRefreshUsage}>Refresh</button>
        </p>
      )}
      {message && <p className="form-status">{message}</p>}
    </section>
  );
}

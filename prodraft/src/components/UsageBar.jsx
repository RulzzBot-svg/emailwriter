export default function UsageBar({
  usage,
  message,
  loading,
  onUpgrade,
  onManage,
}) {
  if (!usage) {
    return null;
  }

  const isPro = usage.planId === 'pro';

  return (
    <div className="usage-bar panel">
      <div className="usage-copy">
        <strong>{usage.planName} plan</strong>
        <span>{usage.used}/{usage.limit} polishes used this month</span>
      </div>
      <div className="usage-actions">
        {isPro ? (
          <button type="button" className="btn" onClick={onManage} disabled={loading}>
            Manage billing
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onUpgrade} disabled={loading || !usage.billingEnabled}>
            {usage.billingEnabled ? 'Upgrade to Pro' : 'Pro coming soon'}
          </button>
        )}
      </div>
      {message && <p className="usage-message">{message}</p>}
    </div>
  );
}

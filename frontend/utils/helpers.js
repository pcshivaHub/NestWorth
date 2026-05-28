export const formatCurrency = (amount, currency = '₹') => {
  const num = Math.round(parseFloat(amount) || 0);
  return `${currency}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getInitials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export const getMemberName = (m, user) =>
  m.display_name ||
  (String(m.user_id) === String(user?.id)
    ? (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'You')
    : 'Member');

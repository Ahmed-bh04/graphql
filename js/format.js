export function formatXp(amount) {
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)} MB`;
  if (amount >= 1e3) return `${Math.round(amount / 1e3)} kB`;
  return `${Math.round(amount)} B`;
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

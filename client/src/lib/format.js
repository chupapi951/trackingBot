export function formatMoney(amount, currency = '₽') {
  const n = Number(amount) || 0;
  return `${n.toLocaleString('ru-RU')} ${currency}`;
}

export function formatPrice(price, deliveryPrice, deliveryPriceType, weight, currency = '₽') {
  const p = Number(price) || 0;
  const d = Number(deliveryPrice) || 0;
  const c = currency || '₽';
  const parts = [`${p.toLocaleString('ru-RU')} ${c}`];
  if (d > 0) {
    if (deliveryPriceType === 'perKg') {
      const w = Number(weight) || 0;
      const total = w > 0 ? d * w : d;
      parts.push(`+ ${d.toLocaleString('ru-RU')} ${c}/кг`);
      if (w > 0) parts[parts.length - 1] += ` (×${w} = ${total.toLocaleString('ru-RU')} ${c})`;
    } else {
      parts.push(`+ ${d.toLocaleString('ru-RU')} ${c}`);
    }
  }
  return parts.join(' ');
}

export function formatPriceWithSeparatedCurrencies(price, priceCurrency, deliveryPrice, deliveryPriceType, weight, deliveryCurrency) {
  const p = Number(price) || 0;
  const d = Number(deliveryPrice) || 0;
  const pc = priceCurrency || '₽';
  const dc = deliveryCurrency || '₽';
  const parts = [`${p.toLocaleString('ru-RU')} ${pc}`];
  if (d > 0) {
    if (deliveryPriceType === 'perKg') {
      const w = Number(weight) || 0;
      const total = w > 0 ? d * w : d;
      parts.push(`+ ${d.toLocaleString('ru-RU')} ${dc}/кг`);
      if (w > 0) parts[parts.length - 1] += ` (×${w} = ${total.toLocaleString('ru-RU')} ${dc})`;
    } else {
      parts.push(`+ ${d.toLocaleString('ru-RU')} ${dc}`);
    }
  }
  return parts.join(' ');
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function toDateInput(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

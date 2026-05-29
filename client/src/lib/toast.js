let toastTimeout = null;

export function showToast(message) {
  // Remove existing toast if any
  const existing = document.getElementById('app-toast');
  if (existing) existing.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const el = document.createElement('div');
  el.id = 'app-toast';
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);

  toastTimeout = setTimeout(() => {
    el.remove();
    toastTimeout = null;
  }, 1600);
}

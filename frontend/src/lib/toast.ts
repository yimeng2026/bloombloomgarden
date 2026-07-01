// Simple toast utility for migrated pages (replaces useToast hook)
let toastContainer: HTMLDivElement | null = null;

function ensureContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

export function showToast(opts: { type?: 'info' | 'success' | 'error'; title: string; message?: string }) {
  const container = ensureContainer();
  const el = document.createElement('div');
  const colors = {
    info: 'bg-blue-500/90',
    success: 'bg-green-500/90',
    error: 'bg-red-500/90',
  };
  el.className = `${colors[opts.type || 'info']} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs transition-all duration-300 translate-x-full`;
  el.innerHTML = `<div class="font-semibold">${opts.title}</div>${opts.message ? `<div class="text-xs opacity-80 mt-1">${opts.message}</div>` : ''}`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.remove('translate-x-full'));
  setTimeout(() => {
    el.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

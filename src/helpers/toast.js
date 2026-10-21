const VARIANT_STYLES = {
	success: { bg: "#10b981", border: "#059669" },
	error: { bg: "#ef4444", border: "#dc2626" },
	warning: { bg: "#f59e0b", border: "#d97706" },
	info: { bg: "#3b82f6", border: "#2563eb" },
};

/**
 * Show a toast notification.
 *
 * @param {{
 *   title?: string,
 *   text?: string,
 *   variant?: 'success'|'error'|'warning'|'info',
 *   timeout?: number
 * }} config
 */
export function toast({ title, text, variant = "info", timeout = 3 } = {}) {
	const message = title && text ? `${title} - ${text}` : title || text || "";
	showDomToast(message, variant, timeout);
}

function showDomToast(message, variant, timeout) {
	const container = getToastContainer();
	const { bg, border } = VARIANT_STYLES[variant] || VARIANT_STYLES.info;

	const el = document.createElement("div");
	el.style.cssText = `
    background: ${bg};
    border-left: 4px solid ${border};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    font-size: 14px;
    font-weight: 500;
    max-width: 350px;
    word-wrap: break-word;
    pointer-events: auto;
    animation: toastSlideIn 0.3s ease-out;
  `;
	el.textContent = message;
	container.appendChild(el);

	ensureToastStyles();

	setTimeout(() => {
		el.style.animation = "toastSlideOut 0.3s ease-in";
		setTimeout(() => {
			el.remove();
			if (container.children.length === 0) {
				container.remove();
			}
		}, 300);
	}, timeout * 1000);
}

function getToastContainer() {
	let container = document.getElementById("toast-container");
	if (container) return container;

	container = document.createElement("div");
	container.id = "toast-container";
	container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  `;
	document.body.appendChild(container);
	return container;
}

function ensureToastStyles() {
	if (document.getElementById("toast-styles")) return;
	const style = document.createElement("style");
	style.id = "toast-styles";
	style.textContent = `
    @keyframes toastSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes toastSlideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
	document.head.appendChild(style);
}

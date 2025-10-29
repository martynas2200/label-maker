/**
 * Toast notification helper
 * Uses frappe.show_alert if available, otherwise shows a simple notification
 */

/**
 * Show a toast notification
 * @param {Object} config - Toast configuration
 * @param {string} config.title - Toast title
 * @param {string} config.text - Toast message text
 * @param {string} config.icon - Icon type: 'check', 'x', 'alert', 'info'
 * @param {number} config.timeout - Duration in seconds (default: 3)
 */
export function toast(config) {
	const { title, text, icon = "info", timeout = 3 } = config;

	// Build the message
	const message = title ? title + (text ? ` - ${text}` : "") : text;

	// If frappe is available, use its alert system
	if (window.frappe && window.frappe.show_alert) {
		const indicator =
			icon === "check"
				? "green"
				: icon === "x"
				? "red"
				: icon === "alert"
				? "orange"
				: "blue";

		window.frappe.show_alert(
			{
				message,
				indicator,
			},
			timeout
		);
		return;
	}

	showFallbackToast(message, icon, timeout);
}

function showFallbackToast(message, icon, timeout) {
	// Create toast container if it doesn't exist
	let container = document.getElementById("toast-container");
	if (!container) {
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
	}

	// Create toast element
	const toast = document.createElement("div");
	const colors = {
		check: { bg: "#10b981", border: "#059669" },
		x: { bg: "#ef4444", border: "#dc2626" },
		alert: { bg: "#f59e0b", border: "#d97706" },
		info: { bg: "#3b82f6", border: "#2563eb" },
	};
	const color = colors[icon] || colors.info;

	toast.style.cssText = `
    background: ${color.bg};
    border-left: 4px solid ${color.border};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    font-size: 14px;
    font-weight: 500;
    max-width: 350px;
    word-wrap: break-word;
    pointer-events: auto;
    animation: slideIn 0.3s ease-out;
  `;
	toast.textContent = message;

	// Add animation keyframes if not already added
	if (!document.getElementById("toast-styles")) {
		const style = document.createElement("style");
		style.id = "toast-styles";
		style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
		document.head.appendChild(style);
	}

	container.appendChild(toast);

	// Auto-remove after timeout
	setTimeout(() => {
		toast.style.animation = "slideOut 0.3s ease-in";
		setTimeout(() => {
			container.removeChild(toast);
			// Remove container if empty
			if (container.children.length === 0) {
				document.body.removeChild(container);
			}
		}, 300);
	}, timeout * 1000);
}

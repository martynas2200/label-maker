"""Runtime configuration API endpoints."""

from typing import Any

import frappe


@frappe.whitelist()
def get_realtime_config() -> dict[str, Any]:
	return {
		"site": frappe.local.site,
		"disable_async": bool(frappe.local.conf.get("disable_async", False)),
		"dev_server": bool(getattr(frappe.local, "dev_server", False)),
		"socketio_port": frappe.local.conf.get("socketio_port", 9000),
	}

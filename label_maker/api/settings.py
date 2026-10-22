"""
Settings API endpoints
"""

from typing import Any, Literal

import frappe
from frappe import _


@frappe.whitelist()
def get_settings() -> dict[str, Any]:
	"""
	Retrieves all Label Maker Settings.

	Returns cached results if available and not expired (5 minutes).
	User must be logged in to access settings.

	Returns:
		dictionary with all settings fields

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if not frappe.session.user or frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in to access settings"), frappe.PermissionError)

	try:
		# Check cache first
		cache_key = "label_maker_settings"

		# Fetch settings document
		settings = frappe.get_doc("Label Maker Settings", "Label Maker Settings")

		result = settings.as_dict()

		# Cache for 60 minutes
		frappe.cache().hset("label_maker", cache_key, result, 3600)

		return result
	except frappe.DoesNotExistError:
		# Return empty settings if document doesn't exist
		return {
			"default_label_type": None,
			"ws_address": None,
			"package_item": None,
		}
	except Exception as e:
		frappe.log_error(f"Failed to fetch Label Maker Settings: {e!s}")
		raise

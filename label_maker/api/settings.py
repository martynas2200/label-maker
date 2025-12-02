"""
Settings API endpoints for Label Maker application.

Manages Label Maker Settings configuration with proper permission handling
and caching support.
"""

from typing import Any

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
		cached = frappe.cache().hget("label_maker", cache_key)
		if cached:
			return cached

		# Fetch settings document
		settings = frappe.get_doc("Label Maker Settings", "Label Maker Settings")

		# Extract relevant fields
		result = {
			"default_label_type": settings.default_label_type,
			"ws_address": settings.ws_address,
			"tts_api_key": settings.get_password("tts_api_key") if settings.tts_api_key else None,
			# NOTE: Ideally, it would be better to fetch it inside of python environment, but how about latency?
			"package_item": settings.package_item,
			"package_item_text": settings.package_item_text,
			"deposit_item_text": settings.deposit_item_text,
			"deposit_item_price": settings.deposit_item_price,
		}

		# Cache for 60 minutes
		frappe.cache().hset("label_maker", cache_key, result, 3600)

		return result
	except frappe.DoesNotExistError:
		# Return empty settings if document doesn't exist
		return {
			"default_label_type": None,
			"ws_address": None,
			"tts_api_key": None,
			"package_item": None,
			"package_item_text": "+ Bag fee (0.01)",
			"deposit_item_text": "+ Deposit",
			"deposit_item_price": 0.10,
		}
	except Exception as e:
		frappe.log_error(f"Failed to fetch Label Maker Settings: {e!s}")
		raise


@frappe.whitelist()
def set_settings(settings: dict[str, Any]) -> dict[str, Any]:
	"""
	Updates Label Maker Settings.

	Updates only the provided fields while preserving others.
	Clears cache after update.
	User must be logged in and have write permission.

	Args:
		settings: dictionary of fields to update

	Returns:
		Updated settings dictionary

	Raises:
		frappe.PermissionError: If user lacks write permission
	"""
	if not frappe.session.user or frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in to update settings"), frappe.PermissionError)

	try:
		# Check write permission
		if not frappe.has_permission("Label Maker Settings", "write", "Label Maker Settings"):
			frappe.throw(_("You do not have permission to update settings"), frappe.PermissionError)

		# Get existing settings or create new
		try:
			doc = frappe.get_doc("Label Maker Settings", "Label Maker Settings")
		except frappe.DoesNotExistError:
			doc = frappe.new_doc("Label Maker Settings")
			doc.name = "Label Maker Settings"

		# Update only provided fields
		for key, value in settings.items():
			if hasattr(doc, key):
				setattr(doc, key, value)

		doc.save()

		# Clear cache
		frappe.cache().hdel("label_maker", "label_maker_settings")

		return get_settings()
	except frappe.PermissionError:
		raise
	except Exception as e:
		frappe.log_error(f"Failed to update Label Maker Settings: {e!s}")
		raise


@frappe.whitelist()
def get_setting(key: str) -> dict[str, Any] | None:
	"""
	Retrieves a single settings field.

	Args:
		key: Field name to retrieve

	Returns:
		Field value or None if not found

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if not frappe.session.user or frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in to access settings"), frappe.PermissionError)

	try:
		settings = get_settings()
		return settings.get(key)
	except Exception as e:
		frappe.log_error(f"Failed to fetch setting {key}: {e!s}")
		return None


@frappe.whitelist()
def set_setting(key: str, value: Any) -> dict[str, Any] | None:
	"""
	Updates a single settings field.

	Args:
		key: Field name to update
		value: New value

	Returns:
		Updated field value

	Raises:
		frappe.PermissionError: If user lacks write permission
	"""
	if not frappe.session.user or frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in to update settings"), frappe.PermissionError)

	try:
		return set_settings({key: value}).get(key)
	except Exception as e:
		frappe.log_error(f"Failed to set setting {key}: {e!s}")
		raise

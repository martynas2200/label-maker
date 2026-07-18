"""
Stock Take API endpoints for Label Maker.

Provides endpoints to save stock check records and retrieve last check info.
"""

from datetime import datetime
from typing import Any

import frappe
from frappe import _


@frappe.whitelist()
def save_stock_check(
	item_code: str,
	actual_qty: float,
	item_name: str | None = None,
	barcode: str | None = None,
	system_qty: float | None = None,
) -> dict[str, Any]:
	"""
	Saves a stock check record.

	Args:
		item_code: The item code
		actual_qty: The actual counted quantity
		item_name: Optional item name for display
		barcode: Optional barcode used for scanning
		system_qty: Optional system quantity (fetched if not provided)

	Returns:
		The created Stock Check Log document as a dict

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if "Label Maker User" not in frappe.get_roles():
		frappe.throw(
			_("You must have the role Label Maker User to perform stock checks"),
			frappe.PermissionError,
		)

	if not item_code:
		frappe.throw(_("Item code is required"))

	if actual_qty is None:
		frappe.throw(_("Actual quantity is required"))

	# Fetch system qty if not provided
	if system_qty is None:
		try:
			bin_entry = frappe.get_value(
				"Bin",
				filters={"item_code": item_code},
				fieldname="actual_qty",
			)
			system_qty = bin_entry if bin_entry is not None else 0
		except Exception:
			system_qty = 0

	# Fetch item name if not provided
	if not item_name:
		try:
			item_name = frappe.get_value("Item", item_code, "item_name")
		except Exception:
			item_name = ""

	difference = float(actual_qty) - float(system_qty)

	try:
		doc = frappe.get_doc(
			{
				"doctype": "Stock Check Log",
				"item_code": item_code,
				"item_name": item_name or "",
				"barcode": barcode or "",
				"system_qty": float(system_qty),
				"actual_qty": float(actual_qty),
				"difference": difference,
				"checked_by": frappe.session.user,
				"checked_at": datetime.now(),
			}
		)
		doc.insert(ignore_permissions=True)
		# For receipt printer bridge
		if difference != 0:
			frappe.publish_realtime(event="stock_take", room="website", message=doc)
		return doc.as_dict()
	except Exception as e:
		frappe.log_error(f"Failed to save stock check for {item_code}: {e!s}")
		frappe.throw(_("Failed to save stock check: {0}").format(str(e)))


@frappe.whitelist()
def get_last_check(item_code: str) -> dict[str, Any] | None:
	"""
	Retrieves the most recent stock check for an item.

	Args:
		item_code: Item code to look up

	Returns:
		Latest Stock Check Log dict, or None if no checks exist
	"""
	if not item_code:
		return None

	try:
		checks = frappe.get_all(
			"Stock Check Log",
			filters={"item_code": item_code},
			fields=["*"],
			order_by="checked_at desc",
			limit_page_length=1,
		)
		return checks[0] if checks else None
	except Exception as e:
		frappe.log_error(f"Failed to fetch last check for {item_code}: {e!s}")
		return None


@frappe.whitelist()
def get_last_checks(item_codes: list[str]) -> dict[str, dict[str, Any]]:
	"""
	Retrieves the most recent stock check for multiple items.

	Args:
		item_codes: List of item codes

	Returns:
		Dict mapping item_code to latest Stock Check Log dict (or None)
	"""
	if not item_codes:
		return {}

	try:
		result = {}
		for code in item_codes:
			result[code] = get_last_check(code)
		return result
	except Exception as e:
		frappe.log_error(f"Failed to fetch last checks: {e!s}")
		return {}


@frappe.whitelist()
def get_recent_checks(limit: int = 50) -> list[dict[str, Any]]:
	"""
	Retrieves recent stock checks across all items.

	Args:
		limit: Maximum number of records to return

	Returns:
		List of recent Stock Check Log dicts
	"""
	try:
		return frappe.get_all(
			"Stock Check Log",
			fields=["*"],
			order_by="checked_at desc",
			limit_page_length=limit,
		)
	except Exception as e:
		frappe.log_error(f"Failed to fetch recent checks: {e!s}")
		return []

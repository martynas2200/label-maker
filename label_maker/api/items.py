"""
Item API endpoints for Label Maker application.

Provides comprehensive item information including pricing, stock levels, and barcodes.
Permissions are based on user authentication and standard Frappe document permissions.
"""

from datetime import datetime
from typing import Any

import frappe
from frappe import _


@frappe.whitelist()
def get_item(code_or_barcode: str) -> dict[str, Any] | None:
	"""
	Retrieves an item by item code or barcode.

	Searches for items by barcode first (normalized), then by item code.
	Includes pricing and stock information in a single request.

	Args:
		code_or_barcode: Item code or barcode string

	Returns:
		dictionary with item details including price and stock, or None if not found

	Raises:
		frappe.PermissionError: If user is not logged in
	"""

	# Look up barcode first
	item_code = _find_item_code_by_barcode(code_or_barcode)
	if not item_code:
		# Fall back to using input as item code
		item_code = code_or_barcode

	return _fetch_item_details(item_code)


@frappe.whitelist()
def get_items_by_codes(item_codes: list[str]) -> list[dict[str, Any]]:
	"""
	Retrieves multiple items by their codes.

	Returns items in the same order as requested. Includes pricing and stock.

	Args:
		item_codes: list of item codes to fetch

	Returns:
		list of item dictionaries in requested order

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if not item_codes:
		return []

	try:
		items_with_details = []
		for item in item_codes:
			details = _fetch_item_details(item)
			if details:
				items_with_details.append(details)

		# Sort to match requested order
		code_order = {code: idx for idx, code in enumerate(item_codes)}
		items_with_details.sort(key=lambda x: code_order.get(x.get("item_code"), len(item_codes)))

		return items_with_details
	except Exception as e:
		frappe.log_error(f"Failed to fetch items by codes: {e!s}")
		return []


@frappe.whitelist()
def get_recently_modified_items(force_refresh: bool = False, limit: int = 50) -> list[dict[str, Any]]:
	"""
	Retrieves recently modified items.

	Returns items modified today with their pricing and stock information.
	Results are cached in user session for 5 minutes unless force_refresh is True.

	Args:
		force_refresh: If True, bypasses cache and fetches fresh data
		limit: Maximum number of items to return (default 50)

	Returns:
		list of recently modified items with details

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if "Label Maker User" not in frappe.get_roles():
		frappe.throw("You must have a role of Label Maker User to access item data", frappe.PermissionError)

	# Check session cache
	cache_key = "recent_items_cache"
	if not force_refresh:
		cached = frappe.cache.hget("label_maker", cache_key)
		if cached:
			return cached

	try:
		# Get today's date at 00:00:00
		today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

		# Fetch recently modified items
		items = frappe.get_list(
			"Item",
			filters=[["modified", ">=", today_start]],
			fields=["name", "modified"],
			order_by="modified desc",
			limit_page_length=limit,
		)

		# Fetch items with recently modified prices
		item_prices = frappe.get_list(
			"Item Price",
			filters=[["modified", ">=", today_start], ["selling", "=", 1]],
			fields=["item_code", "modified"],
			order_by="modified desc",
			limit_page_length=limit,
			ignore_permissions=True,
		)

		# Create a dictionary to track the most recent modification time for each item
		item_modifications = {}

		# Add items from Item table
		for item in items:
			item_code = item.get("name")
			mod_time = item.get("modified")
			item_modifications[item_code] = mod_time

		# Add/update items from Item Price table
		for price in item_prices:
			item_code = price.get("item_code")
			mod_time = price.get("modified")
			# Keep the most recent modification time
			if item_code not in item_modifications or mod_time > item_modifications[item_code]:
				item_modifications[item_code] = mod_time

		# Sort by modification time (most recent first)
		sorted_items = sorted(item_modifications.items(), key=lambda x: x[1], reverse=True)[:limit]

		# Fetch full details for each unique item
		items_with_details = []
		for item_code, _ in sorted_items:
			details = _fetch_item_details(item_code)
			if details:
				items_with_details.append(details)

		# Cache for 5 minutes
		frappe.cache.hset("label_maker", cache_key, items_with_details, 300)

		return items_with_details
	except Exception as e:
		frappe.log_error(f"Failed to fetch recently modified items: {e!s}")
		return []


@frappe.whitelist()
def get_item_by_barcode(barcode: str) -> dict[str, Any] | None:
	"""
	Retrieves an item specifically by barcode.

	Normalizes the barcode and searches in Item Barcode table.
	Includes pricing and stock information.

	Args:
		barcode: Barcode string to search for

	Returns:
		Item dictionary with details, or None if not found

	Raises:
		frappe.PermissionError: If user is not logged in
	"""

	item_code = _find_item_code_by_barcode(barcode)
	if item_code:
		return _fetch_item_details(item_code)

	return None


@frappe.whitelist()
def get_stock_level(item_code: str) -> float | None:
	"""
	Retrieves the stock quantity for an item.

	Args:
		item_code: Item code to get stock for

	Returns:
		Actual quantity in stock, or None if not found

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if not item_code:
		return None

	try:
		bin_entry = frappe.get_value(
			"Bin", filters={"item_code": item_code}, fieldname="actual_qty", ignore_permissions=True
		)
		return bin_entry if bin_entry is not None else None
	except Exception as e:
		frappe.log_error(f"Failed to fetch stock level for item {item_code}: {e!s}")
		return None


@frappe.whitelist()
def get_item_selling_price(item_code: str, price_list: str | None = None) -> float | None:
	"""
	Retrieves the selling price for an item valid for today.

	Args:
		item_code: Item code to get price for
		price_list: Optional specific price list to use. If not provided, fetches any selling price.

	Returns:
		Price amount, or None if not found

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if not item_code:
		return None

	try:
		# Fetch from Item Price table with date validity check
		today = frappe.utils.today()

		# Build SQL query based on whether price_list is provided
		if price_list:
			item_price = frappe.db.sql(
				"""
				SELECT price_list_rate
				FROM `tabItem Price`
				WHERE item_code = %(item_code)s
					AND price_list = %(price_list)s
					AND selling = 1
					AND (valid_from IS NULL OR valid_from <= %(today)s)
					AND (valid_upto IS NULL OR valid_upto >= %(today)s)
				ORDER BY valid_from DESC
				LIMIT 1
			""",
				{"item_code": item_code, "price_list": price_list, "today": today},
				as_dict=False,
			)
		else:
			item_price = frappe.db.sql(
				"""
				SELECT price_list_rate
				FROM `tabItem Price`
				WHERE item_code = %(item_code)s
					AND selling = 1
					AND (valid_from IS NULL OR valid_from <= %(today)s)
					AND (valid_upto IS NULL OR valid_upto >= %(today)s)
				ORDER BY valid_from DESC
				LIMIT 1
			""",
				{"item_code": item_code, "today": today},
				as_dict=False,
			)

		if item_price and len(item_price) > 0:
			return item_price[0][0]
		return None
	except Exception as e:
		frappe.log_error(f"Failed to fetch selling price for item {item_code}: {e!s}")
		return None


@frappe.whitelist()
def get_item_buying_prices(item_code: str, limit: int = 5) -> list[dict[str, Any]]:
	"""
	Retrieves the last buying prices for an item.

	Args:
		item_code: Item code to get prices for
		limit: Number of recent prices to retrieve (default 5)

	Returns:
		list of dictionaries containing price information, ordered by most recent first

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if not item_code:
		return []

	try:
		# Fetch buying prices with additional details
		buying_prices = frappe.db.sql(
			"""
			SELECT
				price_list,
				price_list_rate,
				valid_from,
				valid_upto,
				modified
			FROM `tabItem Price`
			WHERE item_code = %(item_code)s
				AND buying = 1
			ORDER BY modified DESC
			LIMIT %(limit)s
		""",
			{"item_code": item_code, "limit": limit},
			as_dict=True,
		)

		return buying_prices
	except Exception as e:
		frappe.log_error(f"Failed to fetch buying prices for item {item_code}: {e!s}")
		return []


@frappe.whitelist()
def get_item_price_lists(item_code: str) -> dict[str, Any]:
	"""
	Retrieves all price lists (both buying and selling) for an item.

	Args:
		item_code: Item code to get price lists for

	Returns:
		dictionary containing:
		- selling_prices: list of selling price entries
		- buying_prices: list of buying price entries
		- current_selling_price: Currently valid selling price (if any)
		- current_buying_price: Most recent buying price (if any)

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if not item_code:
		return {
			"selling_prices": [],
			"buying_prices": [],
			"current_selling_price": None,
			"current_buying_price": None,
		}

	try:
		today = frappe.utils.today()

		# Fetch all selling prices
		all_prices = frappe.db.sql(
			"""
			SELECT
				name,
				price_list,
				price_list_rate,
				currency,
				valid_from,
				valid_upto,
				modified,
				selling,
				buying,
				CASE
					WHEN (valid_from IS NULL OR valid_from <= %(today)s)
					AND (valid_upto IS NULL OR valid_upto >= %(today)s)
					THEN 1
					ELSE 0
				END as is_valid
			FROM `tabItem Price`
			WHERE item_code = %(item_code)s
			ORDER BY is_valid DESC, modified DESC
		""",
			{"item_code": item_code, "today": today},
			as_dict=True,
		)

		selling_prices = [p for p in all_prices if p.get("selling") == 1]
		current_selling = next(
			(p for p in all_prices if p.get("is_valid") == 1 and p.get("selling") == 1), None
		)

		current_buying = None
		buying_prices = []

		if frappe.has_permission("Item Price", "read"):
			buying_prices = [p for p in all_prices if p.get("buying") == 1]
			current_buying = next(
				(p for p in all_prices if p.get("is_valid") == 1 and p.get("buying") == 1), None
			)

		return {
			"item_code": item_code,
			"selling_prices": selling_prices,
			"buying_prices": buying_prices,
			"current_selling_price": current_selling,
			"current_buying_price": current_buying,
		}
	except Exception as e:
		frappe.log_error(f"Failed to fetch price lists for item {item_code}: {e!s}")
		return {
			"item_code": item_code,
			"selling_prices": [],
			"buying_prices": [],
			"current_selling_price": None,
			"current_buying_price": None,
		}


def _normalize_barcode(barcode: str) -> str:
	"""
	Normalizes a barcode string by trimming and removing leading zeros.
	"""
	if not barcode:
		return ""
	return barcode.strip().lstrip("0") or barcode.strip()


def _find_item_code_by_barcode(barcode: str) -> list[str] | None:
	"""
	Finds an item code by searching for a normalized barcode.

	Returns:
		Item code if found, None otherwise
	"""
	normalized_barcode = _normalize_barcode(barcode)
	if not normalized_barcode:
		return None

	try:
		result = frappe.get_value("Item Barcode", filters={"barcode": normalized_barcode}, fieldname="parent")
		if not result:
			# Perhaps the zeros are significant - try original barcode
			return frappe.get_value("Item Barcode", filters={"barcode": barcode}, fieldname="parent")
		return result
	except Exception as e:
		frappe.log_error(f"Error finding item code by barcode {normalized_barcode}: {e!s}")
		return None


def _fetch_item_details(item_code: str) -> dict[str, Any] | None:
	"""
	Fetches complete item details including barcodes, pricing, and stock in one request.

	Combines data from Item, Item Barcode, Bin, and Item Price tables.
	This is more efficient than multiple requests from the frontend.

	Args:
		item_code: Item code to fetch

	Returns:
		dictionary with complete item details, or None if not found
	"""
	if not item_code:
		return None

	try:
		# Check if item exists and user has permission to view it
		if not frappe.has_permission("Item", "read", item_code):
			return None

		item = frappe.get_doc("Item", item_code)

		# Get stock level
		stock_qty = None
		try:
			bin_entry = frappe.get_value("Bin", filters={"item_code": item_code}, fieldname="actual_qty")
			stock_qty = bin_entry if bin_entry is not None else 0
		except Exception:
			stock_qty = 0

		# Fetch item price
		try:
			standard_rate = get_item_selling_price(item_code)
		except Exception as e:
			frappe.log_error(f"Error fetching item price for {item_code}: {e!s}")
			standard_rate = "ERROR"

		# Fetch all comments
		try:
			comments = frappe.get_all(
				"Comment",
				filters={"reference_doctype": "Item", "reference_name": item_code},
				fields=["*"],
			)
		except Exception as e:
			frappe.log_error(f"Error fetching comments for item {item_code}: {e!s}")
			comments = []

		# Build response
		return {
			"item_code": item.name,
			"item_name": item.item_name,
			"item_group": item.item_group,
			"suppliers": [s.supplier for s in item.supplier_items] if hasattr(item, "supplier_items") else [],
			"stock_uom": item.stock_uom,
			"standard_rate": standard_rate,
			"safety_stock": item.safety_stock if hasattr(item, "safety_stock") else 0,
			"comments": comments,
			"reorder_levels": item.get("reorder_levels") if hasattr(item, "reorder_levels") else [],
			"barcodes": [bc.barcode for bc in item.barcodes] if hasattr(item, "barcodes") else [],
			"stock_qty": stock_qty,
			"description": item.description if hasattr(item, "description") else None,
			"deposit_package_count": item.deposit_package_count
			if hasattr(item, "deposit_package_count")
			else 0,
			"disabled": item.disabled if hasattr(item, "disabled") else False,
			"modified": item.modified,
		}
	except frappe.DoesNotExistError:
		return None
	except Exception as e:
		frappe.log_error(f"Error fetching item details for {item_code}: {e!s}")
		return None

"""
Item API endpoints
"""

import re
from datetime import datetime
from decimal import Decimal
from typing import Any, TypedDict

import frappe
from frappe import _
from frappe.utils.caching import redis_cache
from num2words import num2words

from .speech import _synthesize_google_audio


class ItemDTO(TypedDict, total=False):
	barcodes: list[str]
	comments: list[dict[str, Any]]
	deposit_package_count: float
	description: str | None
	disabled: bool
	is_packaged: bool
	is_stock_item: bool
	item_code: str
	item_group: str
	item_name: str
	last_purchase_rate: float | None
	modified: str
	reorder_levels: list[dict[str, Any]]
	safety_stock: float
	standard_rate: float | None
	stock_qty: float | None
	stock_uom: str
	suppliers: list[str]
	total_price: float
	weight: float
	audio_request_id: str


@frappe.whitelist()
def get_item(
	code_or_barcode: str,
	language: str | None = None,
	speech_type: str | None = None,
) -> ItemDTO | None:
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

	decoded_barcode = _decode_barcode(code_or_barcode)
	barcode_result = _find_item_code_and_uom_by_barcode(
		decoded_barcode["item_barcode"] if decoded_barcode else code_or_barcode
	)
	if barcode_result:
		item_code, uom = barcode_result
	else:
		# Fall back to using input as item code
		item_code = decoded_barcode["item_barcode"] if decoded_barcode else code_or_barcode
		uom = None

	item = _fetch_item_details(item_code, uom)

	if item and decoded_barcode:
		item["is_packaged"] = True
		item["weight"] = decoded_barcode["quantity"] / 1000
		if isinstance(item.get("standard_rate"), int | float):
			item["total_price"] = round(float(item["standard_rate"]) * item["weight"], 2)

	if item and speech_type in {"quantity", "price"}:
		value = (
			item.get("stock_qty")
			if speech_type == "quantity"
			else item.get("total_price")
			if item.get("is_packaged")
			else item.get("standard_rate")
		)
		if isinstance(value, int | float):
			request_id = frappe.generate_hash(length=20)
			frappe.enqueue(
				"label_maker.api.items.push_item_audio",
				queue="short",
				item_value=value,
				speech_type=speech_type,
				language=language or "en",
				request_id=request_id,
				user=frappe.session.user,
			)
			item["audio_request_id"] = request_id

	return item


def push_item_audio(
	item_value: float,
	speech_type: str,
	language: str | None,
	request_id: str,
	user: str,
) -> None:
	"""Generate item speech in a worker and deliver it to the requesting user."""
	try:
		text = num2words(
			Decimal(item_value),
			lang=language,
			to="currency" if speech_type == "price" else "cardinal",
		)
		audio = _synthesize_google_audio(text, language)
		frappe.publish_realtime(
			event="label_maker_item_audio",
			message={"request_id": request_id, "audioContent": audio["audioContent"]},
			user=user,
		)
	except Exception:
		frappe.log_error(title="Failed to generate item audio")


@redis_cache(43200)
def get_barcode_rules() -> list[dict[str, Any]]:
	"""Returns all configured barcode rules."""
	valid_rules = []

	rules = frappe.get_all("Barcode Rule", fields=["name", "rule"], order_by="modified asc")
	for rule in rules:
		try:
			# Accept both Python and .NET-style named group syntax in configured rules.
			rule["rule"] = re.sub(r"\(\?<([A-Za-z][A-Za-z0-9_]*)>", r"(?P<\1>", rule["rule"])
			re.compile(rule["rule"])
		except re.error:
			frappe.log_error(f"Invalid Barcode Rule {rule['name']}")
			continue
		valid_rules.append(rule)

	return valid_rules


def _decode_barcode(barcode: str) -> dict[str, Any] | None:
	"""Decode a barcode using the first matching configured Barcode Rule."""
	if not barcode:
		return None

	for rule in get_barcode_rules():
		match = re.match(rule["rule"], barcode.strip())
		if not match:
			continue

		groups = {key.lower(): value for key, value in match.groupdict().items() if value is not None}
		item_barcode = groups.get("code")
		quantity = groups.get("quantity")
		if not item_barcode:
			continue

		try:
			quantity_value = float(quantity) if quantity else 0
		except ValueError:
			continue

		return {
			"item_barcode": item_barcode.lstrip("0") or item_barcode,
			"quantity": quantity_value,
			"rule": rule["name"],
		}

	return None


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
	Retrieves recently modified item prices, and returns items modified today with their pricing and stock information.
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

		# Fetch items with recently modified prices
		item_prices = frappe.get_list(
			"Item Price",
			filters=[["modified", ">=", today_start], ["selling", "=", 1]],
			fields=["item_code", "modified"],
			order_by="modified desc",
			limit_page_length=limit,
			ignore_permissions=True,
		)

		# Fetch full details for each unique item
		items_with_details = []
		for item in item_prices:
			details = _fetch_item_details(item.get("item_code"))
			if details:
				items_with_details.append(details)

		# Cache for 5 minutes
		frappe.cache.hset("label_maker", cache_key, items_with_details, 300)

		return items_with_details
	except Exception as e:
		frappe.log_error(f"Failed to fetch recently modified items: {e!s}")
		return []


@frappe.whitelist()
def get_item_selling_price(
	item_code: str, price_list: str | None = None, uom: str | None = None
) -> float | None:
	"""
	Retrieves the selling price for an item valid for today.

	Args:
		item_code: Item code to get price for
		price_list: Optional specific price list to use. If not provided, fetches any selling price.
		uom: Unit of measure for the item.

	Returns:
		Price amount, or None if not found

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if not item_code:
		return None

	try:
		today = frappe.utils.today()

		conditions = ["item_code = %(item_code)s", "selling = 1"]
		params: dict[str, Any] = {"item_code": item_code, "today": today}

		if price_list:
			conditions.append("price_list = %(price_list)s")
			params["price_list"] = price_list

		if uom:
			conditions.append("uom = %(uom)s")
			params["uom"] = uom

		item_price = frappe.db.sql(
			f"""
			SELECT price_list_rate
			FROM `tabItem Price`
			WHERE {" AND ".join(conditions)}
				AND (valid_from IS NULL OR valid_from <= %(today)s)
				AND (valid_upto IS NULL OR valid_upto >= %(today)s)
			ORDER BY valid_from DESC
			LIMIT 1
			""",
			params,
			as_dict=False,
		)

		if item_price:
			return item_price[0][0]
		return None
	except Exception as e:
		frappe.log_error(f"Failed to fetch selling price for item {item_code}: {e!s}")
		return None


@frappe.whitelist()
def get_item_price_lists(item_code: str) -> dict[str, Any]:
	"""
	Retrieves all price lists (both buying and selling) for an item.

	Args:
		item_code: Item code to get price lists for

	Returns:
		dictionary containing:
		- prices: list of all price entries (both buying and selling)
		- current_selling_price: Currently valid selling price (if any)
		- current_buying_price: Most recent buying price (if any)

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if not item_code:
		return {
			"prices": [],
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
				uom,
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

		current_selling = next(
			(p for p in all_prices if p.get("is_valid") == 1 and p.get("selling") == 1), None
		)

		if not frappe.has_permission("Item Price", "read"):
			all_prices = [p for p in all_prices if p.get("selling") == 1]

		return {
			"item_code": item_code,
			"prices": all_prices,
			"current_selling_price": current_selling,
		}
	except Exception as e:
		frappe.log_error(f"Failed to fetch price lists for item {item_code}: {e!s}")
		return {
			"item_code": item_code,
			"prices": [],
			"current_selling_price": None,
		}


def _normalize_barcode(barcode: str) -> str:
	"""
	Normalises a barcode string by trimming and removing leading zeros.
	"""
	if not barcode:
		return ""
	return barcode.strip().lstrip("0") or barcode.strip()


def _find_item_code_and_uom_by_barcode(barcode: str) -> tuple[str, str] | None:
	"""
	Finds an item code by searching for a normalized barcode.
	Uses LIKE operator to match barcodes whose trailing digits match the search string.

	Returns:
		Tuple of (item_code, uom) if found, None otherwise
	"""
	normalized_barcode = _normalize_barcode(barcode)
	if not normalized_barcode:
		return None

	try:
		# Try original barcode as it is first
		result = frappe.db.get_value(
			"Item Barcode",
			filters={"barcode": barcode},
			fieldname=["parent", "uom"],
		)
		if result:
			return result[0], result[1]

		# Fall back to LIKE search with normalized barcode
		result = frappe.db.sql(
			"""
			SELECT parent, uom
			FROM `tabItem Barcode`
			WHERE barcode LIKE %(barcode)s
			LIMIT 1
			""",
			{"barcode": f"%{normalized_barcode}"},
			as_dict=False,
		)
		if len(result) > 0:
			return result[0][0], result[0][1]
		return None
	except Exception as e:
		frappe.log_error(f"Error finding item code by barcode {normalized_barcode}: {e!s}")
		return None


def _fetch_item_details(item_code: str, uom: str | None = None) -> ItemDTO | None:
	"""
	Fetches complete item details including barcodes, pricing, and stock in one request.

	Args:
		item_code: Item code to fetch
		uom: Unit of measure for the item

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
		if item.is_stock_item:
			try:
				bin_entry = frappe.get_value("Bin", filters={"item_code": item_code}, fieldname="actual_qty")
				stock_qty = bin_entry if bin_entry is not None else 0
			except Exception:
				stock_qty = None

		# Fetch item price, usually for the stock UOM if no barcode UOM is provided.
		try:
			standard_rate = get_item_selling_price(item_code, uom=uom if uom else item.stock_uom)
		except Exception as e:
			frappe.log_error(f"Error fetching item price for {item_code}: {e!s}")
			standard_rate = None

		# Fetch all comments
		comments = []
		if frappe.has_permission("Comment", "read"):
			try:
				comments = frappe.get_all(
					"Comment",
					filters={
						"reference_doctype": "Item",
						"reference_name": item_code,
						"comment_type": "Comment",
					},
					fields=["content", "creation", "comment_by", "seen"],
					order_by="creation desc",
				)
			except Exception as e:
				frappe.log_error(f"Error fetching comments for item {item_code}: {e!s}")

		return {
			"barcodes": [bc.barcode for bc in item.barcodes] if hasattr(item, "barcodes") else [],
			"comments": comments,
			"deposit_package_count": item.deposit_package_count
			if hasattr(item, "deposit_package_count")
			else 0,
			"description": item.description,
			"disabled": item.disabled,
			"is_packaged": False,
			"is_stock_item": item.is_stock_item,
			"item_code": item.name,
			"item_group": item.item_group,
			"item_name": item.item_name,
			"last_purchase_rate": item.last_purchase_rate
			if frappe.has_permission("Item Price", "read")
			else None,
			"modified": item.modified,
			"reorder_levels": item.get("reorder_levels") if hasattr(item, "reorder_levels") else [],
			"safety_stock": item.safety_stock if hasattr(item, "safety_stock") else 0,
			"standard_rate": standard_rate,
			"stock_qty": stock_qty,
			"stock_uom": item.stock_uom,
			"suppliers": [s.supplier for s in item.supplier_items] if hasattr(item, "supplier_items") else [],
		}
	except frappe.DoesNotExistError:
		return None
	except Exception:
		frappe.throw(f"Failed to fetch item details for {item_code}", frappe.InternalError)

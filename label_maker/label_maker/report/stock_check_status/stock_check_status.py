# Copyright (c) 2026, Martynas Miliauskas and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta
from typing import Any

import frappe
from frappe import _


def execute(filters: dict[str, Any] | None = None) -> tuple[list, list]:
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns() -> list[dict[str, Any]]:
	return [
		{
			"label": _("Item Code"),
			"fieldname": "item_code",
			"fieldtype": "Link",
			"options": "Item",
			"width": 150,
		},
		{
			"label": _("Item Name"),
			"fieldname": "item_name",
			"fieldtype": "Data",
			"width": 200,
		},
		{
			"label": _("Item Group"),
			"fieldname": "item_group",
			"fieldtype": "Link",
			"options": "Item Group",
			"width": 150,
		},
		{
			"label": _("Stock Qty"),
			"fieldname": "stock_qty",
			"fieldtype": "Float",
			"width": 120,
			"convertible": "qty",
		},
		{
			"label": _("Counted"),
			"fieldname": "counted",
			"fieldtype": "Data",
			"width": 90,
		},
		{
			"label": _("Last Checked At"),
			"fieldname": "checked_at",
			"fieldtype": "Datetime",
			"width": 160,
		},
		{
			"label": _("Checked By"),
			"fieldname": "checked_by",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Actual Qty"),
			"fieldname": "actual_qty",
			"fieldtype": "Float",
			"width": 120,
			"convertible": "qty",
		},
		{
			"label": _("Difference"),
			"fieldname": "difference",
			"fieldtype": "Float",
			"width": 120,
			"convertible": "qty",
		},
	]


def get_data(filters: dict[str, Any] | None = None) -> list[list]:
	filters = frappe._dict(filters or {})

	item_group = filters.get("item_group")
	days_back = filters.get("days_back") or 2
	include_all = filters.get("include_all") or 0

	item_filters: dict[str, Any] = {"disabled": 0}
	if item_group and not include_all:
		item_filters["item_group"] = item_group

	items = frappe.get_all(
		"Item",
		filters=item_filters,
		fields=["name", "item_name", "item_group"],
	)

	if not items:
		return []

	item_codes = [i["name"] for i in items]

	# Get stock quantities from Bin
	bin_data = frappe.db.sql(
		"""
		SELECT item_code, SUM(actual_qty) as stock_qty
		FROM `tabBin`
		WHERE item_code IN %s
		GROUP BY item_code
		""",
		(item_codes,),
		as_dict=1,
	)
	stock_map: dict[str, float] = {b["item_code"]: b["stock_qty"] for b in bin_data}

	# Get recent stock check logs
	cutoff_date = datetime.now() - timedelta(days=days_back)

	logs = frappe.db.sql(
		"""
		SELECT *
		FROM `tabStock Check Log`
		WHERE item_code IN %s
		  AND checked_at >= %s
		ORDER BY modified DESC
		""",
		(item_codes, cutoff_date),
		as_dict=1,
	)

	latest_logs: dict[str, dict[str, Any]] = {}
	for log in logs:
		code = log["item_code"]
		if code not in latest_logs:
			latest_logs[code] = log

	result: list[list] = []
	for item in items:
		code = item["name"]
		stock_qty = float(stock_map.get(code, 0))
		log = latest_logs.get(code)

		# When include_all is on, skip items with no stock
		if include_all and stock_qty <= 0:
			continue

		result.append(
			[
				code,
				item["item_name"],
				item["item_group"],
				stock_qty,
				_("Yes") if log else _("No"),
				log["checked_at"] if log else None,
				log["checked_by"] if log else None,
				log["actual_qty"] if log else None,
				log["difference"] if log else None,
			]
		)

	# Sort: not-counted first, then by item code
	result.sort(key=lambda r: (0 if r[4] == _("Yes") else 1, r[0]))
	return result

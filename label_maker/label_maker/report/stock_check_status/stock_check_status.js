// Copyright (c) 2026, Martynas Miliauskas and contributors
// For license information, please see license.txt

frappe.query_reports["Stock Check Status"] = {
	filters: [
		{
			fieldname: "item_group",
			label: __("Item Group"),
			fieldtype: "Link",
			options: "Item Group",
		},
		{
			fieldname: "days_back",
			label: __("Days Back"),
			fieldtype: "Int",
			default: 2,
		},
		{
			fieldname: "include_all",
			label: __("Include All Items With Stock"),
			fieldtype: "Check",
			default: 0,
		},
	],
};

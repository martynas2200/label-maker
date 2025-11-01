import frappe
from frappe import _


@frappe.whitelist()
def add_item_reorder_level(item_code, warehouse_reorder_level, warehouse_reorder_qty):
	"""
	Add a new reorder level to an item using default warehouse and warehouse group from settings.

	Args:
		item_code (str): The item code
		warehouse_reorder_level (float): The reorder level
		warehouse_reorder_qty (float): The reorder quantity

	Returns:
		dict: The created Item Reorder document
	"""
	try:
		# Convert to float
		warehouse_reorder_level = float(warehouse_reorder_level)
		warehouse_reorder_qty = float(warehouse_reorder_qty)

		# Get settings
		settings = frappe.get_single("Label Maker Settings")

		if not settings.default_warehouse or not settings.default_warehouse_group:
			frappe.throw(_("Default warehouse and warehouse group not configured in Label Maker Settings"))

		# Create new Item Reorder document
		reorder = frappe.new_doc("Item Reorder")
		reorder.parent = item_code
		reorder.parenttype = "Item"
		reorder.parentfield = "reorder_levels"
		reorder.warehouse = settings.default_warehouse
		reorder.warehouse_group = settings.default_warehouse_group
		reorder.warehouse_reorder_level = warehouse_reorder_level
		reorder.warehouse_reorder_qty = warehouse_reorder_qty
		reorder.material_request_type = "Purchase"

		reorder.insert()
		frappe.db.commit()

		return {"message": "Reorder level added successfully", "success": True}
	except frappe.ValidationError as e:
		frappe.log_error(frappe.get_traceback(), "add_item_reorder_level")
		frappe.throw(str(e))
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "add_item_reorder_level")
		frappe.throw(_("Failed to add reorder level: {0}").format(str(e)))


@frappe.whitelist()
def delete_item_reorder_level(reorder_name):
	"""
	Delete an item reorder level.

	Args:
		reorder_name (str): The name of the Item Reorder document

	Returns:
		dict: Success response
	"""
	try:
		frappe.delete_doc("Item Reorder", reorder_name)
		frappe.db.commit()

		return {"message": "Reorder level deleted successfully", "success": True}
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "delete_item_reorder_level")
		frappe.throw(_("Failed to delete reorder level: {0}").format(str(e)))

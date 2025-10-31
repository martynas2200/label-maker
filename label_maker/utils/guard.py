import frappe
from frappe import _


def ensure_label_maker_access():
	# Only intercept API routes
	path = frappe.request.path
	if not path.startswith("/api/method/label_maker.api."):
		return

	if "Label Maker User" not in frappe.get_roles():
		frappe.throw(_("Not permitted"), frappe.PermissionError)

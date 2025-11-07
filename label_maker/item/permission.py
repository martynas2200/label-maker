import frappe


def has_permission(doc=None, ptype="read", user=None):
	"""
	Allow users with role 'Label Maker User' to read Item without stripping existing permissions.
	"""
	user = user or frappe.session.user
	if ptype in ("read", "report", "print", "email"):
		if "Label Maker User" in frappe.get_roles(user):
			return True
	# fall back to default permissions
	return None

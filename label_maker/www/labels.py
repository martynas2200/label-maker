from urllib.parse import urlencode

import frappe
from frappe import _


def get_context(context):
	"""Add CSRF token and other context to the page"""
	# Only allow logged-in users
	if frappe.session.user == "Guest":
		frappe.response["status_code"] = 403
		frappe.msgprint(_("Log in to access this page."))
		frappe.redirect(f"/login?{urlencode({'redirect-to': frappe.request.path})}")
		return

	context.csrf_token = frappe.sessions.get_csrf_token()
	context.user = frappe.session.user
	context.user_info = frappe.get_doc("User", frappe.session.user)

	return context

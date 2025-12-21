from urllib.parse import urlencode

import frappe
from frappe import _

# Disable caching to avoid sharing CSRF tokens
no_cache = True


def get_context(context):
	"""Add CSRF token and other context to the page"""
	# Only allow logged-in users
	if frappe.session.user == "Guest":
		frappe.redirect(f"/login?{urlencode({'redirect-to': frappe.request.path})}")
		return

	csrf_token = frappe.sessions.get_csrf_token()
	frappe.db.commit()
	context.csrf_token = csrf_token
	context.user = frappe.session.user

	return context

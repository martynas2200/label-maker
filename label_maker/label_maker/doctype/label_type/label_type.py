# Copyright (c) 2024, Label Maker Contributors
# See license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils.jinja import validate_template


class LabelType(Document):
	def validate(self):
		"""Validate Jinja2 templates so the user gets immediate feedback."""
		if self.print_format == "html" and self.template:
			self._validate_jinja(self.template, "HTML Body Template")
		if self.print_format == "html" and self.css:
			# we must also check for Jinja2 expressions in CSS
			if "{{" in self.css or "{%" in self.css:
				self._validate_jinja(self.css, "Custom CSS")
		if self.print_format == "zpl" and self.zpl_template:
			self._validate_jinja(self.zpl_template, "ZPL Template")

	def _validate_jinja(self, source: str, field_label: str) -> None:
		"""Parse the Jinja2 template and raise a ValidationError on syntax errors."""
		try:
			validate_template(source)
		except Exception as e:
			frappe.throw(
				_("Syntax error in {0}: {1}").format(field_label, str(e)),
				frappe.ValidationError,
			)

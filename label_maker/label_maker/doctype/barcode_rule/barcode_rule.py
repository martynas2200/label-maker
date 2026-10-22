from frappe.model.document import Document

from label_maker.api.items import get_barcode_rules


class BarcodeRule(Document):
	def on_update(self):
		get_barcode_rules.clear_cache()

import frappe
import frappe.translate


@frappe.whitelist()
def get_language_list() -> list:
	translations = frappe.translate.get_lang_dict()
	return translations


# TODO: Can be used for translation service
@frappe.whitelist()
def get_translations(language: str) -> dict:
	return frappe.translate.get_all_translations(language)

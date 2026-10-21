"""
Settings API endpoints
"""

from decimal import Decimal
from typing import Any, Literal

import frappe
import requests
from frappe import _
from num2words import num2words


@frappe.whitelist()
def get_settings() -> dict[str, Any]:
	"""
	Retrieves all Label Maker Settings.

	Returns cached results if available and not expired (5 minutes).
	User must be logged in to access settings.

	Returns:
		dictionary with all settings fields

	Raises:
		frappe.PermissionError: If user is not logged in
	"""
	if not frappe.session.user or frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in to access settings"), frappe.PermissionError)

	try:
		# Check cache first
		cache_key = "label_maker_settings"

		# Fetch settings document
		settings = frappe.get_doc("Label Maker Settings", "Label Maker Settings")

		result = settings.as_dict()

		# Cache for 60 minutes
		frappe.cache().hset("label_maker", cache_key, result, 3600)

		return result
	except frappe.DoesNotExistError:
		# Return empty settings if document doesn't exist
		return {
			"default_label_type": None,
			"ws_address": None,
			"package_item": None,
		}
	except Exception as e:
		frappe.log_error(f"Failed to fetch Label Maker Settings: {e!s}")
		raise


@frappe.whitelist()
def synthesize_speech(
	phrase_type: Literal["quantity", "price"],
	value: int | float,
	language: str = "en",
) -> dict[str, str]:
	"""Generate localized speech audio without exposing the Google TTS key."""
	if not frappe.session.user or frappe.session.user == "Guest":
		frappe.throw(_("You must be logged in to use text-to-speech"), frappe.PermissionError)

	if phrase_type not in {"quantity", "price"}:
		frappe.throw(_("Unsupported speech phrase type"))

	try:
		amount = Decimal(str(value))
	except Exception:
		frappe.throw(_("Speech value must be a number"))

	if phrase_type == "quantity":
		text = num2words(amount, lang=language)
	elif phrase_type == "price":
		text = num2words(amount, lang=language, to="currency")

	return _synthesize_google_audio(text, language)


def _synthesize_google_audio(text: str, language: str) -> dict[str, str]:
	settings = frappe.get_doc("Label Maker Settings", "Label Maker Settings", ignore_permissions=True)
	api_key = settings.get_password("tts_api_key") if settings.tts_api_key else None
	if not api_key:
		frappe.throw(_("Google Text-to-Speech is not configured"))

	response = requests.post(
		"https://texttospeech.googleapis.com/v1/text:synthesize",
		params={"key": api_key},
		json={
			"input": {"text": text},
			"voice": {"languageCode": language, "ssmlGender": "MALE"},
			"audioConfig": {"audioEncoding": "MP3"},
		},
		timeout=15,
	)
	if not response.ok:
		frappe.throw(_("Google Text-to-Speech request failed"))

	audio_content = response.json().get("audioContent")
	if not audio_content:
		frappe.throw(_("Google Text-to-Speech returned no audio"))

	return {"audioContent": audio_content}

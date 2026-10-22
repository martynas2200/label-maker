"""Text-to-speech API endpoints."""

from decimal import Decimal
from typing import Literal

import frappe
import requests
from frappe import _
from num2words import num2words


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
	else:
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

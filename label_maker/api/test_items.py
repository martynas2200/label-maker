from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

import frappe

from label_maker.api import items


class TestItems(TestCase):
	def test_packaged_barcode_sets_barcode_weight_and_total_price(self):
		item = {"item_code": "ITEM-001", "standard_rate": 12.5, "is_packaged": False}

		with (
			patch.object(items, "_find_item_code_and_uom_by_barcode", return_value=("ITEM-001", "Kg")),
			patch.object(items, "_fetch_item_details", return_value=item),
			patch.object(
				items,
				"get_barcode_rules",
				return_value=[{"name": "Weight barcode", "rule": r"^(?P<code>\d{4})(?P<quantity>\d{4})$"}],
			),
		):
			result = items.get_item("00120025")

		assert result == {
			"item_code": "ITEM-001",
			"standard_rate": 12.5,
			"is_packaged": True,
			"weight": 0.025,
			"total_price": 0.31,
		}

	def test_non_matching_barcode_falls_back_to_normal_lookup(self):
		item = {"item_code": "ITEM-002", "standard_rate": 8.0, "is_packaged": False}

		with (
			patch.object(items, "get_barcode_rules", return_value=[]),
			patch.object(items, "_find_item_code_and_uom_by_barcode", return_value=None) as find_item,
			patch.object(items, "_fetch_item_details", return_value=item) as fetch_item,
		):
			result = items.get_item("ITEM-002")

		find_item.assert_called_once_with("ITEM-002")
		fetch_item.assert_called_once_with("ITEM-002", None)
		assert result == item

	def test_speech_enqueue_requires_numeric_value(self):
		with (
			patch.object(items, "_decode_barcode", return_value=None),
			patch.object(items, "_find_item_code_and_uom_by_barcode", return_value=None),
			patch.object(
				items, "_fetch_item_details", return_value={"standard_rate": 4.5, "stock_qty": None}
			),
			patch.object(frappe, "generate_hash", return_value="request-1"),
			patch.object(frappe, "enqueue") as enqueue,
			patch.object(items.frappe, "session", SimpleNamespace(user="test@example.com")),
		):
			result = items.get_item("ITEM-003", speech_type="price")

		assert result["audio_request_id"] == "request-1"
		enqueue.assert_called_once()

		with (
			patch.object(items, "_decode_barcode", return_value=None),
			patch.object(items, "_find_item_code_and_uom_by_barcode", return_value=None),
			patch.object(
				items, "_fetch_item_details", return_value={"standard_rate": None, "stock_qty": None}
			),
			patch.object(items.frappe, "session", SimpleNamespace(user="test@example.com")),
		):
			items.get_item("ITEM-004", speech_type="price")

		assert enqueue.call_count == 1

	def test_invalid_barcode_rule_is_skipped(self):
		with (
			patch.object(
				frappe,
				"get_all",
				return_value=[
					{"name": "Invalid", "rule": "("},
					{"name": "Valid", "rule": r"^(?P<code>\d{4})(?P<quantity>\d{4})$"},
				],
			),
			patch.object(frappe, "log_error"),
		):
			rules = items.get_barcode_rules.__wrapped__()

		assert rules == [{"name": "Valid", "rule": r"^(?P<code>\d{4})(?P<quantity>\d{4})$"}]
		with patch.object(items, "get_barcode_rules", return_value=rules):
			decoded = items._decode_barcode("00120025")

		assert decoded["item_barcode"] == "12"
		assert decoded["quantity"] == 25

<template>
	<div class="space-y-6">
		<BarcodeInput
			ref="barcodeInputRef"
			v-model="barcode"
			@scan="processBarcode"
			:placeholder="$t('scan_item_barcode_to_start_counting')"
		/>
		<ScanLoadingOverlay :visible="isProcessing" />

		<div
			v-if="currentItem"
			class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
		>
			<div class="p-5">
				<div class="flex items-start gap-4">
					<!-- Item image -->
					<div v-if="currentItem.image" class="flex-shrink-0">
						<img
							:src="currentItem.image"
							:alt="currentItem.item_name"
							class="w-20 h-20 object-cover rounded-lg border border-gray-200"
						/>
					</div>
					<div class="flex-1 min-w-0">
						<h3 class="text-lg font-semibold text-gray-900 truncate">
							{{ currentItem.item_name }}
						</h3>
						<p class="text-sm text-gray-500">{{ currentItem.item_code }}</p>
					</div>
					<button
						@click="dismissItem"
						class="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
					>
						<FeatherIcon name="x" class="w-5 h-5" />
					</button>
				</div>

				<!-- Stock info cards -->
				<div class="mt-4 grid grid-cols-2 gap-3">
					<div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
						<p class="text-xs text-gray-500 font-medium uppercase tracking-wider">
							{{ $t("system_qty") }}
						</p>
						<p class="mt-1 text-xl font-bold text-gray-900">
							{{ systemQty }}
						</p>
					</div>
					<div
						class="rounded-lg p-3 border"
						:class="
							difference !== null && difference !== 0
								? 'bg-red-50 border-red-300'
								: 'bg-gray-50 border-gray-200'
						"
					>
						<p class="text-xs text-gray-500 font-medium uppercase tracking-wider">
							{{ $t("difference") }}
						</p>
						<p
							class="mt-1 text-xl font-bold"
							:class="
								difference && difference !== 0
									? difference > 0
										? 'text-green-600'
										: 'text-red-600'
									: 'text-gray-400'
							"
						>
							{{
								difference !== null
									? (difference > 0 ? "+" : "") + difference
									: "—"
							}}
						</p>
					</div>
				</div>

				<!-- Actual qty input + save -->
				<div class="mt-4">
					<label class="block text-sm font-medium text-gray-700 mb-1">
						{{ $t("actual_counted_qty") }}
					</label>
					<div class="flex gap-3">
						<input
							v-model.number="actualQty"
							type="number"
							step="any"
							min="0"
							:placeholder="systemQty?.toString()"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
							@keyup.enter="saveCheck"
							@keyup.escape="dismissItem"
							autofocus
						/>
						<Button
							:loading="saving"
							:disabled="!actualQty && actualQty !== 0"
							@click="saveCheck"
							variant="solid"
							theme="green"
							style="height: unset"
							class="mb-0.5"
						>
							<i class="fa fa-check mr-2"></i>
							{{ $t("save_check") }}
						</Button>
					</div>
				</div>

				<!-- Last check info + save with previous -->
				<div
					v-if="lastCheck && lastCheck.checked_at"
					class="mt-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1"
				>
					<span class="inline-flex items-center gap-1">
						<svg
							class="w-3.5 h-3.5 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						{{ $t("last_check") }}:
						<span class="font-medium text-gray-600">{{
							formatDate(lastCheck.checked_at)
						}}</span>
					</span>
					<span class="text-gray-300">|</span>
					<span
						>{{ $t("system") }}:
						<span class="font-mono font-medium text-gray-600">{{
							lastCheck.system_qty
						}}</span></span
					>
					<span class="text-gray-300">|</span>
					<span
						>{{ $t("counted") }}:
						<span class="font-mono font-medium text-gray-600">{{
							lastCheck.actual_qty
						}}</span></span
					>
					<span class="text-gray-300">|</span>
					<span>
						{{ $t("diff") }}:
						<span
							class="font-mono font-semibold"
							:class="
								lastCheck.difference === 0
									? 'text-green-600'
									: lastCheck.difference > 0
									? 'text-green-600'
									: 'text-red-600'
							"
						>
							{{ lastCheck.difference > 0 ? "+" : "" }}{{ lastCheck.difference }}
						</span>
					</span>
					<button
						@click="saveWithPrevious"
						class="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
					>
						{{ $t("save_with_previous") }}
					</button>
				</div>
			</div>
		</div>

		<!-- Empty state -->
		<div v-if="!currentItem && checkedItems.length === 0" class="text-center py-16">
			<div class="text-gray-300 mb-4">
				<svg
					class="w-16 h-16 mx-auto"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
					/>
				</svg>
			</div>
			<p class="text-gray-500 text-lg font-medium">
				{{ $t("scan_items_to_start_stock_taking") }}
			</p>
			<p class="text-gray-400 text-sm mt-1">
				{{ $t("items_will_appear_here_as_you_scan_them") }}
			</p>
		</div>

		<!-- Checked items list -->
		<div
			v-if="checkedItems.length > 0"
			class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
		>
			<div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
				<h3 class="font-semibold text-gray-800">
					{{ $t("checked_items") }}
					<span class="text-gray-400 font-normal ml-1">({{ checkedItems.length }})</span>
				</h3>
				<div class="flex gap-2">
					<span class="text-xs text-gray-400">
						{{ $t("mismatches") }}:
						<span
							class="font-semibold"
							:class="mismatchCount > 0 ? 'text-red-500' : 'text-green-500'"
						>
							{{ mismatchCount }}
						</span>
					</span>
				</div>
			</div>
			<div class="divide-y divide-gray-100">
				<div
					v-for="(item, idx) in checkedItems"
					:key="item.item_code"
					class="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
				>
					<span class="text-xs text-gray-400 w-6 font-mono">{{ idx + 1 }}</span>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-gray-900 truncate">
							{{ item.item_name || item.item_code }}
						</p>
						<p class="text-xs text-gray-400">{{ item.item_code }}</p>
					</div>
					<div class="text-right">
						<p class="text-sm text-gray-500">
							{{ $t("sys") }}: <span class="font-mono">{{ item.system_qty }}</span>
						</p>
						<p
							class="text-sm font-semibold"
							:class="item.difference === 0 ? 'text-green-600' : 'text-red-600'"
						>
							{{ $t("act") }}: <span class="font-mono">{{ item.actual_qty }}</span>
						</p>
					</div>
					<div
						class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
						:class="
							item.difference === 0
								? 'bg-green-100 text-green-600'
								: 'bg-red-100 text-red-600'
						"
					>
						{{ item.difference > 0 ? "+" : "" }}{{ item.difference }}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { ref, computed, nextTick, watch } from "vue";
import { Button, FeatherIcon } from "frappe-ui";
import { useBarcodeScanner } from "../composables/useBarcodeScanner";
import { getStockTakeService } from "../api/stocktake";
import { toast } from "../helpers/toast";
import { useI18n } from "vue-i18n";
import BarcodeInput from "./BarcodeInput.vue";
import ScanLoadingOverlay from "./ScanLoadingOverlay.vue";

export default {
	name: "StockTakingView",
	components: { Button, FeatherIcon, BarcodeInput, ScanLoadingOverlay },
	props: {
		initialBarcode: {
			type: String,
			default: "",
		},
	},
	emits: ["exit", "initial-barcode-processed"],
	setup(props, { emit }) {
		const stockTakeService = getStockTakeService();
		const { t } = useI18n();

		const currentItem = ref(null);
		const systemQty = ref(null);
		const actualQty = ref(null);
		const lastCheck = ref(null);
		const saving = ref(false);
		const checkedItems = ref([]);
		let scanVersion = 0;

		const { barcode, barcodeInputRef, focusInput, processBarcode, isProcessing } =
			useBarcodeScanner({
				active: ref(true),
				getSpeechRequest: () => ({
					language: navigator.language,
					speechType: "quantity",
				}),
				onItem: async (item) => {
					const currentScanVersion = ++scanVersion;
					if (!item.is_stock_item) {
						toast({
							title: t("item_not_stock_item", {
								item_code: item.item_code,
							}),
						});
						return;
					}

					// Load last check info
					let last = null;
					try {
						last = await stockTakeService.getLastCheck(item.item_code);
					} catch (_) {
						// Ignore errors fetching last check
					}
					if (currentScanVersion !== scanVersion) return;

					currentItem.value = item;
					systemQty.value = item.stock_qty ?? 0;
					lastCheck.value = last;
					actualQty.value = item?.weight > 0 ? item.weight : null;
				},
				// Focus the quantity input after a successful scan
				focusAfterScan: async () => {
					await nextTick();
					const qtyInput = document.querySelector('input[type="number"]');
					if (qtyInput) qtyInput.focus();
				},
			});

		watch(
			() => props.initialBarcode,
			async (inventoryBarcode) => {
				if (inventoryBarcode) {
					await processBarcode(inventoryBarcode);
					emit("initial-barcode-processed");
				}
			},
			{ immediate: true }
		);

		const difference = computed(() => {
			if (systemQty.value === null || actualQty.value === null) return null;
			return actualQty.value - systemQty.value;
		});

		const mismatchCount = computed(() => {
			return checkedItems.value.filter((i) => i.difference !== 0).length;
		});

		function formatDate(dateStr) {
			if (!dateStr) return "";
			const d = new Date(dateStr);
			return d.toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		}

		async function saveCheck() {
			if (actualQty.value === null && actualQty.value !== 0) return;
			if (!currentItem.value) return;

			const itemToSave = currentItem.value;
			const systemQtyToSave = systemQty.value;
			const qty = Number(actualQty.value);
			if (isNaN(qty)) {
				toast({
					title: t("invalid_quantity"),
					variant: "warning",
				});
				return;
			}

			saving.value = true;
			try {
				const record = await stockTakeService.saveCheck(itemToSave.item_code, qty, {
					item_name: itemToSave.item_name,
					system_qty: systemQtyToSave,
				});

				checkedItems.value = [
					{
						item_code: record.item_code,
						item_name: record.item_name,
						system_qty: record.system_qty,
						actual_qty: record.actual_qty,
						difference: record.difference,
					},
					...checkedItems.value,
				];

				toast({
					title: t("checked_item", { item_code: itemToSave.item_code }),
					text: t("counted_system_quantity", {
						qty,
						systemQty: systemQtyToSave,
					}),
					variant: "success",
					timeout: 2,
				});

				// Auto-reset for the next scan
				if (currentItem.value === itemToSave) dismissItem();
			} catch (e) {
				toast({
					text: String(e?.message || e),
					variant: "warning",
				});
			} finally {
				saving.value = false;
			}
		}

		async function saveWithPrevious() {
			if (!currentItem.value || !lastCheck.value) return;

			const prevQty = lastCheck.value.actual_qty;
			const currentEntry = Number(actualQty.value) || 0;
			const newQty = prevQty + currentEntry;

			const confirmed = window.confirm(
				t("take_previous_count", { prevQty, currentEntry, newQty })
			);
			if (!confirmed) return;

			actualQty.value = newQty;
			await saveCheck();
		}

		function dismissItem() {
			currentItem.value = null;
			systemQty.value = null;
			actualQty.value = null;
			lastCheck.value = null;
			focusInput();
		}

		return {
			barcode,
			barcodeInputRef,
			isProcessing,
			currentItem,
			systemQty,
			actualQty,
			lastCheck,
			saving,
			checkedItems,
			difference,
			mismatchCount,
			formatDate,
			processBarcode,
			saveCheck,
			saveWithPrevious,
			dismissItem,
			focusInput,
		};
	},
};
</script>

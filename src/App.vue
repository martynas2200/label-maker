<template>
	<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
		<!-- Header -->
		<AppHeader
			:ws-connected="wsConnected"
			:show-reconnect-button="showReconnectButton"
			v-model:show-stock-qty="showStockQty"
			v-model:show-input-manually="showInputManually"
			v-model:speak-price="speakPrice"
			v-model:cards-view="cardsView"
			:current-list-length="currentList.length"
			:printing="printing"
			@print="onPrint"
			@clear="clearCurrentList"
			@reconnect="handleReconnect"
		/>

		<!-- Main Content -->
		<div class="max-w-7xl py-6 px-6 mx-auto">
			<!-- Barcode Input Section -->
			<BarcodeInput
				v-if="!wsConnected || showInputManually"
				ref="barcodeInputRef"
				v-model="barcode"
				@scan="onScan"
			/>

			<!-- Current List Section (shown when there are items) -->
			<!-- Style: List -->
			<CurrentListTable
				v-if="currentList.length > 0 && !cardsView"
				:items="currentList"
				:show-stock-qty="showStockQty"
				@clear="clearCurrentList"
				@remove="removeFromCurrent"
				@open-weigh="openWeigh"
				@open-details="openItemDetails"
			/>

			<!-- Second style: Cards -->
			<CurrentListCards
				v-if="currentList.length > 0 && cardsView"
				:items="currentList"
				:show-stock-qty="showStockQty"
				:show-dim-effect="showDimEffect"
				@remove="removeFromCurrent"
				@open-weigh="openWeigh"
				@open-details="openItemDetails"
			/>

			<!-- Tabs Section (hidden when current list has items) -->
			<div v-if="currentList.length === 0">
				<Tabs
					as="div"
					class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
					v-model="state.index"
					:tabs="tabs"
				>
					<template #tab-panel="{ tab }">
						<div class="p-6">
							<!-- Recently Modified Tab -->
							<RecentlyModifiedTab
								v-if="tab.key === 'modified'"
								:items="recentlyModified"
								:show-stock-qty="showStockQty"
								:loading="loadingModified"
								@refresh="loadRecentlyModified(true)"
								@add="addToCurrent"
								@open-weigh="openWeigh"
							/>

							<!-- Recently Scanned Tab -->
							<RecentlyScannedTab
								v-else
								:items="recentlyScanned"
								:show-stock-qty="showStockQty"
								@clear="recentlyScanned = []"
								@add="addToCurrent"
								@open-weigh="openWeigh"
							/>
						</div>
					</template>
				</Tabs>
			</div>
		</div>

		<!-- Weight Modal -->
		<WeightLabelModal
			v-if="weightModalItem"
			v-model="weightModalOpen"
			:item="weightModalItem"
		/>

		<!-- Item Details Modal -->
		<ItemDetailsModal
			v-if="itemDetailsModalItem"
			v-model="itemDetailsModalOpen"
			:item="itemDetailsModalItem"
		/>

		<!-- Toast notifications are handled by frappe-ui ?? -->
	</div>
</template>

<script>
import { Button, Tabs } from "frappe-ui";
import { onMounted, onUnmounted, ref, computed, watch, nextTick, reactive } from "vue";
import { getItemService } from "./api/items";
import { getScannerService } from "./api/scanner";
import { getLabelService } from "./api/labels";
import { getSettingsService } from "./api/settings";
import { getTTSService } from "./api/tts";
import { LabelGenerator } from "./helpers/labelGenerator";
import { toast } from "./helpers/toast";
import AppHeader from "./components/AppHeader.vue";
import BarcodeInput from "./components/BarcodeInput.vue";
import CurrentListTable from "./components/CurrentListTable.vue";
import CurrentListCards from "./components/CurrentListCards.vue";
import RecentlyModifiedTab from "./components/RecentlyModifiedTab.vue";
import RecentlyScannedTab from "./components/RecentlyScannedTab.vue";
import WeightLabelModal from "./components/WeightLabelModal.vue";
import ItemDetailsModal from "./components/ItemDetailsModal.vue";

export default {
	name: "LabelMaker",
	components: {
		Button,
		Tabs,
		AppHeader,
		BarcodeInput,
		CurrentListTable,
		CurrentListCards,
		RecentlyModifiedTab,
		RecentlyScannedTab,
		WeightLabelModal,
		ItemDetailsModal,
	},
	setup() {
		const itemService = getItemService();
		const scanner = getScannerService();
		const labels = getLabelService();
		const settingsSvc = getSettingsService();
		const tts = getTTSService();

		const tabs = [
			{ label: "Recently Modified", key: "modified" },
			{ label: "Recently Scanned", key: "scanned" },
		];

		// State
		const state = reactive({ index: 0 }); // Start with scanned tab
		const showStockQty = ref(false);
		const speakPrice = ref(true);
		const currentList = ref([]); // Items ready to print
		const recentlyScanned = ref([]); // History of scanned items
		const recentlyModified = ref([]); // Recently modified items from backend
		const loadingModified = ref(false);
		const barcode = ref("");
		const barcodeInputRef = ref(null);
		const printing = ref(false);
		const cardsView = ref(true);
		const showInputManually = ref(false);
		const weightModalOpen = ref(false);
		const weightModalItem = ref(null);
		const itemDetailsModalOpen = ref(false);
		const itemDetailsModalItem = ref(null);
		const showDimEffect = ref(false);
		let dimTimer = null;
		let autoRefreshTimer = null;

		// Computed
		const wsConnected = computed(() => scanner.state.connected);
		const showReconnectButton = computed(() => {
			return (
				!scanner.state.connected &&
				scanner.state.reconnectAttempts >= scanner.state.maxReconnectAttempts &&
				scanner.state.url !== ""
			);
		});
		const isModifiedTabVisible = computed(() => {
			return currentList.value.length === 0 && state.index === 0;
		});

		/**
		 * Check if barcode can be a packaged item
		 */
		function canItBePackaged(barcode) {
			const prefix = parseInt(barcode.slice(0, 2), 10);
			return (barcode.length === 13 || barcode.length === 21) && prefix > 20 && prefix < 30;
		}

		/**
		 * Extract the item code part from a packaged barcode
		 */
		function extractBarcodePart(barcode) {
			if (barcode.length === 13 && ["23", "24"].includes(barcode.slice(0, 2))) {
				return barcode.slice(0, 8);
			} else if (barcode.length === 13 && ["25", "29"].includes(barcode.slice(0, 2))) {
				return barcode.slice(0, 7);
			} else if (barcode.length === 21) {
				return barcode.slice(4, 17).replace(/^0+/, "");
			}
			return barcode;
		}

		/**
		 * Calculate weight from packaged barcode
		 */
		function calculateWeight(barcode) {
			const weightPart = barcode.length > 13 ? barcode.slice(17, 21) : barcode.slice(8, 12);
			return parseInt(weightPart, 10) / 1000;
		}

		/**
		 * Calculate total price for packaged item
		 */
		function calculateTotalPrice(pricePerUnit, quantity) {
			if (pricePerUnit == null || quantity == null) {
				return 0;
			}
			const totalPrice = pricePerUnit * quantity;
			return Math.round((totalPrice + Number.EPSILON) * 100) / 100;
		}

		/**
		 * Trigger dim effect for other items
		 */
		function triggerDimEffect() {
			// Clear existing timer
			if (dimTimer) {
				clearTimeout(dimTimer);
			}

			// Show dim effect
			showDimEffect.value = true;

			// Remove dim effect after 10 seconds
			dimTimer = setTimeout(() => {
				showDimEffect.value = false;
			}, 10000);
		}

		/**
		 * Focus on the barcode input
		 */
		async function focusInput() {
			await nextTick();
			if (barcodeInputRef.value) {
				barcodeInputRef.value.focus();
			}
		}

		/**
		 * Handle barcode scan
		 */
		async function onScan() {
			const code = (barcode.value || "").trim();
			if (!code) return;

			try {
				let item;
				let isPackaged = false;
				let packagedWeight = 0;

				// Check if this could be a packaged item barcode
				if (canItBePackaged(code)) {
					const barcodePart = extractBarcodePart(code);
					item = await itemService.getItem(barcodePart);

					if (item) {
						isPackaged = true;
						packagedWeight = calculateWeight(code);

						// Add weight and total price to the item
						item.weight = packagedWeight;
						item.total_price = calculateTotalPrice(item.standard_rate, packagedWeight);
					}
				}

				// If not packaged or not found as packaged, try normal lookup
				if (!item) {
					item = await itemService.getItem(code);
				}

				if (!item) {
					toast({
						title: "Item not found",
						text: `Barcode: ${code}`,
						icon: "alert",
						variant: "warning",
					});
					barcode.value = "";
					focusInput();
					return;
				}

				// Add to current list (remove duplicates, keep order)
				currentList.value = [
					item,
					...currentList.value.filter((i) => i.item_code !== item.item_code),
				].slice(0, 50);

				// Also add to history (remove duplicates, keep order)
				recentlyScanned.value = [
					item,
					...recentlyScanned.value.filter((i) => i.item_code !== item.item_code),
				].slice(0, 50);

				// Trigger dim effect for other items
				triggerDimEffect();

				// Speak price if enabled
				if (speakPrice.value) {
					const price = isPackaged ? item.total_price : item.standard_rate || 0;
					if (price > 0) {
						tts.speak(tts.digitsToPrice(price));
					}
				}

				// Show success with additional info for packaged items
				const message = isPackaged
					? `Packaged item added: ${item.item_code} - ${
							item.item_name
					  } (${packagedWeight.toFixed(3)} kg)`
					: `Item added: ${item.item_code} - ${item.item_name}`;

				toast({
					title: message,
					icon: "check",
					timeout: 2,
				});
			} catch (e) {
				console.error("Scan error:", e);
				toast({
					title: "Scan failed",
					text: String(e?.message || e),
					icon: "x",
					variant: "warning",
				});
			} finally {
				barcode.value = "";
				focusInput();
			}
		}

		/**
		 * Load recently modified items
		 */
		async function loadRecentlyModified(forced = false) {
			loadingModified.value = true;
			try {
				recentlyModified.value = await itemService.getRecentlyModifiedItems(forced);
				if (recentlyModified.value.length > 0 && forced) {
					toast({
						title: `Loaded ${recentlyModified.value.length} items`,
						icon: "check",
						timeout: 2,
					});
				}
			} catch (e) {
				console.error("Load recently modified error:", e);
				// Only show error toast if it was a manual refresh
				if (forced) {
					toast({
						title: "Failed to load items",
						text: String(e?.message || e),
						icon: "x",
						variant: "warning",
					});
				}
			} finally {
				loadingModified.value = false;
			}
		}

		/**
		 * Start auto-refresh for recently modified items
		 */
		function startAutoRefresh() {
			if (autoRefreshTimer) return; // Already running

			autoRefreshTimer = setInterval(() => {
				if (isModifiedTabVisible.value) {
					loadRecentlyModified(false); // Silent refresh (forced = false)
				}
			}, 60000); // Every 60 seconds (1 minute)
		}

		/**
		 * Stop auto-refresh
		 */
		function stopAutoRefresh() {
			if (autoRefreshTimer) {
				clearInterval(autoRefreshTimer);
				autoRefreshTimer = null;
			}
		}

		/**
		 * Print labels for current items
		 */
		async function onPrint() {
			if (currentList.value.length === 0) {
				toast({
					title: "No items to print",
					text: "Please add some items first",
					icon: "alert",
					variant: "warning",
				});
				return;
			}

			printing.value = true;
			try {
				// Load settings (fail-proof fallback to empty object)
				const settings = await settingsSvc.get().catch(() => ({}));
				const defaultLabelType = settings?.default_label_type || "normal";

				// Option 1: Use backend API with dynamic templates (to be implemented in the future)
				// const codes = currentList.value.map((i) => i.item_code)
				// await labels.printLabels(codes, defaultLabelType)

				// Option 2: Use frontend LabelGenerator directly (old class, but faster, no backend call)
				new LabelGenerator(currentList.value, defaultLabelType);

				toast({
					title: `Printing ${currentList.value.length} labels`,
					text: `Label type: ${defaultLabelType}`,
					icon: "check",
				});

				// Move items to history and clear current list
				currentList.value = [];
			} catch (e) {
				console.error("Print error:", e);
				toast({
					title: "Print failed",
					text: String(e?.message || e),
					icon: "x",
					variant: "warning",
				});
			} finally {
				printing.value = false;
			}
		}

		/**
		 * Add item to current list from history
		 */
		function addToCurrent(item) {
			currentList.value = [
				item,
				...currentList.value.filter((i) => i.item_code !== item.item_code),
			].slice(0, 50);

			// Trigger dim effect for other items
			triggerDimEffect();

			toast({
				title: "Item added to print list",
				text: `${item.item_code}`,
				icon: "check",
				timeout: 2,
			});
		}

		/**
		 * Remove item from current list
		 */
		function removeFromCurrent(itemCode) {
			currentList.value = currentList.value.filter((i) => i.item_code !== itemCode);
		}

		/**
		 * Clear current list and show tabs again
		 */
		function clearCurrentList() {
			currentList.value = [];
			toast({
				title: "List cleared",
				icon: "check",
				timeout: 5,
			});
		}

		/**
		 * Open weight modal for an item
		 */
		function openWeigh(item) {
			weightModalItem.value = item;
			weightModalOpen.value = true;
		}

		/**
		 * Open item details modal
		 */
		function openItemDetails(item) {
			itemDetailsModalItem.value = item;
			itemDetailsModalOpen.value = true;
		}

		/**
		 * Handle manual reconnect request
		 */
		function handleReconnect() {
			toast({
				title: "Reconnecting scanner...",
				icon: "refresh-cw",
				timeout: 2,
			});
			scanner.manualReconnect();
		}

		/**
		 * Initialize on mount
		 */
		onMounted(async () => {
			try {
				const cfg = await settingsSvc.get();

				// Connect scanner if configured
				if (cfg?.ws_address) {
					scanner.connect(cfg.ws_address, (code) => {
						barcode.value = code;
						onScan();
					});
				} else {
					// If no scanner, focus input for manual entry
					showInputManually.value = true;
				}

				// Load recently modified items
				await loadRecentlyModified(false);

				// Start auto-refresh timer
				startAutoRefresh();

				// Focus input if no scanner
				if (!wsConnected.value) {
					focusInput();
				}
			} catch (e) {
				console.error("Initialization error:", e);
				toast({
					title: "Initialization failed",
					text: String(e?.message || e),
					icon: "x",
					variant: "warning",
				});
			}
		});

		// Auto-focus input when toggling manual input
		watch(showInputManually, (v) => {
			if (v) {
				setTimeout(() => focusInput(), 100);
			}
		});

		// Watch for tab visibility changes to control auto-refresh
		watch(isModifiedTabVisible, (visible) => {
			if (visible) {
				// Tab became visible, ensure auto-refresh is running
				startAutoRefresh();
			}
		});

		// Cleanup on unmount
		onUnmounted(() => {
			stopAutoRefresh();
			if (dimTimer) {
				clearTimeout(dimTimer);
			}
		});

		return {
			tabs,
			state,
			showStockQty,
			speakPrice,
			currentList,
			recentlyScanned,
			recentlyModified,
			loadingModified,
			barcode,
			barcodeInputRef,
			wsConnected,
			showReconnectButton,
			printing,
			cardsView,
			showInputManually,
			weightModalOpen,
			weightModalItem,
			showDimEffect,
			onScan,
			onPrint,
			loadRecentlyModified,
			addToCurrent,
			removeFromCurrent,
			clearCurrentList,
			openWeigh,
			openItemDetails,
			handleReconnect,
			itemDetailsModalOpen,
			itemDetailsModalItem,
		};
	},
};
</script>

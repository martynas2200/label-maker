<template>
	<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
		<!-- Header -->
		<AppHeader
			:ws-connected="wsConnected"
			:show-reconnect-button="showReconnectButton"
			v-model:show-stock-qty="showStockQty"
			v-model:show-input-manually="showInputManually"
			v-model:speak-price="speakPrice"
			v-model:speak-quantity="speakQuantity"
			v-model:cards-view="cardsView"
			v-model:stock-taking-mode="stockTakingMode"
			:current-list-length="currentList.length"
			:printing="printing"
			@print="onPrint"
			@clear="clearCurrentList"
			@reconnect="handleReconnect"
		/>

		<!-- Main Content -->
		<div class="max-w-7xl py-6 px-6 mx-auto">
			<!-- Stock Taking View -->
			<StockTakingView v-if="stockTakingMode" @exit="stockTakingMode = false" />

			<!-- Normal label mode content -->
			<template v-else>
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
			</template>
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
import { useScannerEvents } from "./composables/useScannerEvents";
import { getItemService } from "./api/items";
import { getWebSocketService } from "./api/websocket";
import { getLabelService } from "./api/labels";
import { getSettingsService } from "./api/settings";
import { getTTSService } from "./api/tts";
import { LabelGenerator } from "./helpers/labelGenerator";
import { toast } from "./helpers/toast";
import { scanBarcode } from "./services/scanner";
import AppHeader from "./components/AppHeader.vue";
import BarcodeInput from "./components/BarcodeInput.vue";
import CurrentListTable from "./components/CurrentListTable.vue";
import CurrentListCards from "./components/CurrentListCards.vue";
import RecentlyModifiedTab from "./components/RecentlyModifiedTab.vue";
import RecentlyScannedTab from "./components/RecentlyScannedTab.vue";
import WeightLabelModal from "./components/WeightLabelModal.vue";
import ItemDetailsModal from "./components/ItemDetailsModal.vue";
import StockTakingView from "./components/StockTakingView.vue";
import { useI18n } from "vue-i18n";

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
		StockTakingView,
	},
	setup() {
		const { t } = useI18n();
		const itemService = getItemService();
		const websocket = getWebSocketService();
		const labels = getLabelService();
		const settingsSvc = getSettingsService();
		const tts = getTTSService();

		const tabs = [
			{ label: t("Recently Modified"), key: "modified" },
			{ label: t("Recently Scanned"), key: "scanned" },
		];

		// State
		const state = reactive({ index: 0 }); // Start with scanned tab
		const showStockQty = ref(
			localStorage.getItem("showStockQty") !== null
				? localStorage.getItem("showStockQty") === "true"
				: false
		);
		const speakPrice = ref(
			localStorage.getItem("speakPrice") !== null
				? localStorage.getItem("speakPrice") === "true"
				: true
		);
		const speakQuantity = ref(
			localStorage.getItem("speakQuantity") !== null
				? localStorage.getItem("speakQuantity") === "true"
				: false
		);
		const currentList = ref([]); // Items ready to print
		const recentlyScanned = ref(
			localStorage.getItem("recentlyScanned")
				? JSON.parse(localStorage.getItem("recentlyScanned"))
				: []
		);
		const recentlyModified = ref([]);
		const loadingModified = ref(false);
		const barcode = ref("");
		const barcodeInputRef = ref(null);
		const printing = ref(false);
		const cardsView = ref(true);
		const showInputManually = ref(false);
		const stockTakingMode = ref(false);
		const weightModalOpen = ref(false);
		const weightModalItem = ref(null);
		const itemDetailsModalOpen = ref(false);
		const itemDetailsModalItem = ref(null);
		const showDimEffect = ref(false);
		let dimTimer = null;
		let autoRefreshTimer = null;

		useScannerEvents(
			computed(() => !stockTakingMode.value),
			(code) => {
				barcode.value = code;
				onScan();
			}
		);

		const wsConnected = computed(() => websocket.state.connected);
		const showReconnectButton = computed(() => {
			return (
				!websocket.state.connected &&
				websocket.state.reconnectAttempts >= websocket.state.maxReconnectAttempts &&
				websocket.state.url !== ""
			);
		});
		const isModifiedTabVisible = computed(() => {
			return currentList.value.length === 0 && state.index === 0;
		});

		function triggerDimEffect() {
			if (dimTimer) {
				clearTimeout(dimTimer);
			}

			showDimEffect.value = true;

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

		async function onScan() {
			const code = (barcode.value || "").trim();
			if (!code) return;

			try {
				const result = await scanBarcode(code);
				if (!result) {
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

				const { item, isPackaged, packagedWeight } = result;

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
				localStorage.setItem("recentlyScanned", JSON.stringify(recentlyScanned.value));

				// Trigger dim effect for other items
				triggerDimEffect();

				// Speak quantity if enabled (overrides speakPrice)
				if (speakQuantity.value) {
					const qty = item.stock_qty || 0;
					if (qty > 0) {
						tts.speak(tts.numberToWords(qty));
					}
				} else if (speakPrice.value) {
					const price = isPackaged ? item.total_price : item.standard_rate || 0;
					if (price > 0) {
						tts.speak(tts.digitsToPrice(price));
					}
				}

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
				toast({
					text: String(e?.message || e),
					icon: "x",
					variant: "warning",
				});
			} finally {
				barcode.value = "";
				focusInput();
			}
		}

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

		function startAutoRefresh() {
			if (autoRefreshTimer) return; // Already running

			autoRefreshTimer = setInterval(() => {
				if (isModifiedTabVisible.value) {
					loadRecentlyModified(false); // Silent refresh (forced = false)
				}
			}, 60000); // Every 60 seconds (1 minute)
		}

		function stopAutoRefresh() {
			if (autoRefreshTimer) {
				clearInterval(autoRefreshTimer);
				autoRefreshTimer = null;
			}
		}

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
				const settings = await settingsSvc.get().catch(() => ({}));
				const defaultLabelType = settings?.default_label_type || "normal";

				// Option 1: Use backend API with dynamic templates (to be implemented in the future)
				// const codes = currentList.value.map((i) => i.item_code)
				// await labels.printLabels(codes, defaultLabelType)

				// Option 2: Use frontend LabelGenerator directly (old class, but faster, no backend call)
				new LabelGenerator(currentList.value, defaultLabelType, settings);

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

		function removeFromCurrent(itemCode) {
			currentList.value = currentList.value.filter((i) => i.item_code !== itemCode);
		}

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

		function openItemDetails(item) {
			itemDetailsModalItem.value = item;
			itemDetailsModalOpen.value = true;
		}

		function handleReconnect() {
			toast({
				title: "Reconnecting websocket...",
				icon: "refresh-cw",
				timeout: 2,
			});
			websocket.manualReconnect();
		}

		onMounted(async () => {
			try {
				const cfg = await settingsSvc.get();

				// Connect websocket if configured
				if (cfg?.ws_address) {
					websocket.connect(cfg.ws_address);
				} else {
					// If no websocket, focus input for manual entry
					showInputManually.value = true;
				}

				// Load recently modified items
				await loadRecentlyModified(false);

				// Start auto-refresh timer
				startAutoRefresh();

				// Focus input if no websocket
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

		// Persist settings to localStorage
		watch(showStockQty, (v) => localStorage.setItem("showStockQty", v));
		watch(speakPrice, (v) => localStorage.setItem("speakPrice", v));
		watch(speakQuantity, (v) => localStorage.setItem("speakQuantity", v));

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
			speakQuantity,
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
			stockTakingMode,
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

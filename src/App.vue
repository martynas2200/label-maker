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
			<StockTakingView
				v-if="stockTakingMode"
				:initial-barcode="pendingInventoryBarcode"
				@exit="stockTakingMode = false"
				@initial-barcode-processed="pendingInventoryBarcode = ''"
			/>

			<!-- Normal label mode content -->
			<template v-else>
				<!-- Barcode Input Section -->
				<BarcodeInput
					v-if="!wsConnected || showInputManually"
					ref="barcodeInputRef"
					v-model="barcode"
					@scan="processBarcode"
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
									@clear="clearRecentlyScanned"
									@add="addToCurrent"
									@open-weigh="openWeigh"
								/>
							</div>
						</template>
					</Tabs>
				</div>
			</template>
		</div>

		<ScanLoadingOverlay :visible="isProcessing" />

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
import { onMounted, onUnmounted, ref, computed, watch, reactive } from "vue";
import { useBarcodeScanner } from "./composables/useBarcodeScanner";
import { getItemService } from "./api/items";
import { getWebSocketService } from "./api/websocket";
import { getLabelService } from "./api/labels";
import { getSettingsService } from "./api/settings";
import { connectFrappeRealtime } from "./api/frappeRealtime";
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
import StockTakingView from "./components/StockTakingView.vue";
import ScanLoadingOverlay from "./components/ScanLoadingOverlay.vue";
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
		ScanLoadingOverlay,
	},
	setup() {
		const { t } = useI18n();
		const itemService = getItemService();
		const websocket = getWebSocketService();
		const labels = getLabelService();
		const settingsSvc = getSettingsService();

		const tabs = [
			{ label: t("recently_modified"), key: "modified" },
			{ label: t("recently_scanned"), key: "scanned" },
		];

		const readStoredBoolean = (key, defaultValue) => {
			const value = localStorage.getItem(key);
			return value === null ? defaultValue : value === "true";
		};
		const storedSpeakPrice = readStoredBoolean("speakPrice", true);
		const storedSpeakQuantity = readStoredBoolean("speakQuantity", false);
		const state = reactive({ index: 0 });
		const showStockQty = ref(readStoredBoolean("showStockQty", false));
		const speakPrice = ref(storedSpeakPrice && !storedSpeakQuantity);
		const speakQuantity = ref(storedSpeakQuantity);
		const currentList = ref([]); // Items ready to print
		const recentlyScanned = ref(
			localStorage.getItem("recentlyScanned")
				? JSON.parse(localStorage.getItem("recentlyScanned"))
				: []
		);
		const recentlyModified = ref([]);
		const loadingModified = ref(false);
		const printing = ref(false);
		const cardsView = ref(readStoredBoolean("cardsView", true));
		const showInputManually = ref(readStoredBoolean("showInputManually", false));
		const stockTakingMode = ref(false);
		const pendingInventoryBarcode = ref("");
		const weightModalOpen = ref(false);
		const weightModalItem = ref(null);
		const itemDetailsModalOpen = ref(false);
		const itemDetailsModalItem = ref(null);
		const showDimEffect = ref(false);
		let dimTimer = null;
		let autoRefreshTimer = null;

		const { barcode, barcodeInputRef, focusInput, processBarcode, isProcessing } =
			useBarcodeScanner({
				active: computed(() => !stockTakingMode.value),
				getSpeechRequest: () => {
					if (speakQuantity.value)
						return { language: navigator.language, speechType: "quantity" };
					if (speakPrice.value)
						return { language: navigator.language, speechType: "price" };
					return null;
				},
				onInventoryCommand: (inventoryBarcode) => {
					pendingInventoryBarcode.value = inventoryBarcode;
					stockTakingMode.value = true;
				},
				onItem: (item) => {
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
					const isPackaged = Boolean(item.is_packaged);

					toast({
						title: t(isPackaged ? "packaged_item_added" : "item_added", {
							code: item.item_code,
						}),
						variant: "success",
						timeout: 2,
					});
				},
			});

		const wsConnected = computed(() => websocket.state.connected);
		const showReconnectButton = computed(() => {
			return (
				!websocket.state.connected &&
				websocket.state.reconnectAttempts >= websocket.state.maxReconnectAttempts &&
				websocket.state.url !== ""
			);
		});
		const isModifiedTabVisible = computed(() => {
			return !stockTakingMode.value && currentList.value.length === 0 && state.index === 0;
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

		async function loadRecentlyModified(forced = false) {
			loadingModified.value = true;
			try {
				recentlyModified.value = await itemService.getRecentlyModifiedItems(forced);
				if (recentlyModified.value.length > 0 && forced) {
					toast({
						title: t("loaded_items", { count: recentlyModified.value.length }),
						variant: "success",
						timeout: 2,
					});
				}
			} catch (e) {
				console.error("Load recently modified error:", e);
				// Only show error toast if it was a manual refresh
				if (forced) {
					toast({
						title: t("failed_to_load_items"),
						text: String(e?.message || e),
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
					title: t("nothing_to_print"),
					text: t("please_add_some_items_first"),
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

				// Option 2: Use frontend old LabelGenerator directly
				new LabelGenerator(currentList.value, defaultLabelType, settings);
				toast({
					title: t("printing_labels", { count: currentList.value.length }),
					variant: "success",
				});

				currentList.value = [];
			} catch (e) {
				console.error("Print error:", e);
				toast({
					title: t("print_failed"),
					text: String(e?.message || e),
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
				title: t("item_added_to_print_list"),
				variant: "success",
				timeout: 2,
			});
		}

		function removeFromCurrent(itemCode) {
			currentList.value = currentList.value.filter((i) => i.item_code !== itemCode);
		}

		function clearCurrentList() {
			currentList.value = [];
			toast({
				title: t("list_cleared"),
				variant: "success",
				timeout: 5,
			});
		}

		function clearRecentlyScanned() {
			recentlyScanned.value = [];
			localStorage.removeItem("recentlyScanned");
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
				title: t("reconnecting_websocket"),
				variant: "info",
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
				void connectFrappeRealtime();

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
					title: t("initialization_failed"),
					text: String(e?.message || e),
					variant: "warning",
				});
			}
		});

		watch(showStockQty, (value) => localStorage.setItem("showStockQty", String(value)));
		watch(cardsView, (value) => localStorage.setItem("cardsView", String(value)));
		watch(showInputManually, (value) => {
			localStorage.setItem("showInputManually", String(value));
			if (value) {
				setTimeout(() => focusInput(), 100);
			}
		});
		watch(speakPrice, (value) => {
			if (value) speakQuantity.value = false;
			localStorage.setItem("speakPrice", String(value));
		});
		watch(speakQuantity, (value) => {
			if (value) speakPrice.value = false;
			localStorage.setItem("speakQuantity", String(value));
		});

		// Auto-focus input when toggling manual input

		watch(isModifiedTabVisible, (visible) => {
			if (visible) {
				startAutoRefresh();
			} else {
				stopAutoRefresh();
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
			pendingInventoryBarcode,
			weightModalOpen,
			weightModalItem,
			showDimEffect,
			isProcessing,
			processBarcode,
			onPrint,
			loadRecentlyModified,
			addToCurrent,
			removeFromCurrent,
			clearCurrentList,
			clearRecentlyScanned,
			openWeigh,
			openItemDetails,
			handleReconnect,
			itemDetailsModalOpen,
			itemDetailsModalItem,
		};
	},
};
</script>

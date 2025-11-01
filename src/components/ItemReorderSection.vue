<template>
	<div
		v-if="item?.reorder_levels && item.reorder_levels.length > 0"
		class="border-t border-gray-200 pt-4"
	>
		<div class="flex items-center justify-between mb-3">
			<h5 class="text-sm font-semibold text-gray-700">{{ $t("Item Reorder Levels") }}</h5>
			<Button @click="showAddReorderForm = true" variant="subtle" size="sm" theme="green">
				<i class="fa fa-plus mr-1"></i> {{ $t("Add Reorder") }}
			</Button>
		</div>
		<div class="space-y-3">
			<div
				v-for="(reorder, idx) in item.reorder_levels"
				:key="idx"
				class="border border-gray-200 rounded-lg py-2 px-3 bg-gray-50 hover:bg-gray-100 transition-colors"
			>
				<div class="grid grid-cols-3 gap-3 text-sm">
					<div>
						<p class="text-xs font-medium text-gray-600">{{ $t("Reorder Level") }}</p>
						<p class="text-gray-900">{{ reorder.warehouse_reorder_level }}</p>
					</div>
					<div>
						<p class="text-xs font-medium text-gray-600">{{ $t("Reorder Qty") }}</p>
						<p class="text-gray-900">{{ reorder.warehouse_reorder_qty }}</p>
					</div>
					<div>
						<Button
							@click="deleteReorderLevel(idx)"
							variant="subtle"
							size="sm"
							theme="red"
							class="pull-right"
						>
							<i class="fa fa-trash"></i>
						</Button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Add Reorder Form -->
	<div
		v-if="showAddReorderForm"
		class="border border-yellow-200 rounded-lg p-4 bg-yellow-50 mt-4"
	>
		<h5 class="text-sm font-semibold text-gray-700 mb-3">{{ $t("Add New Reorder Level") }}</h5>
		<div class="space-y-3">
			<div>
				<label class="block text-xs font-medium text-gray-600 mb-1">{{
					$t("Reorder Level")
				}}</label>
				<input
					v-model.number="newReorderData.warehouse_reorder_level"
					type="number"
					class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
					:placeholder="$t('Enter reorder level')"
				/>
			</div>
			<div>
				<label class="block text-xs font-medium text-gray-600 mb-1">{{
					$t("Reorder Qty")
				}}</label>
				<input
					v-model.number="newReorderData.warehouse_reorder_qty"
					type="number"
					class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
					:placeholder="$t('Enter reorder quantity')"
				/>
			</div>
			<div class="flex gap-2">
				<Button
					@click="addReorderLevel"
					variant="solid"
					size="sm"
					theme="green"
					:loading="savingReorder"
				>
					<i class="fa fa-check mr-1"></i> {{ $t("Add") }}
				</Button>
				<Button
					@click="
						showAddReorderForm = false;
						resetReorderForm();
					"
					variant="outline"
					size="sm"
					theme="gray"
				>
					<i class="fa fa-times mr-1"></i> {{ $t("Cancel") }}
				</Button>
			</div>
		</div>
	</div>
	<Button
		v-else-if="!item?.reorder_levels || item.reorder_levels.length === 0"
		@click="showAddReorderForm = true"
		variant="subtle"
		size="sm"
		theme="blue"
		class="mt-4"
	>
		<i class="fa fa-plus mr-1"></i> {{ $t("Add First Reorder Level") }}
	</Button>
</template>

<script>
import { Button } from "frappe-ui";
import { ref, onMounted } from "vue";
import { call } from "frappe-ui";
import { toast } from "../helpers/toast";

export default {
	name: "ItemReorderSection",
	components: { Button },
	props: {
		item: { type: Object, required: true },
	},
	setup(props) {
		const showAddReorderForm = ref(false);
		const savingReorder = ref(false);
		const settings = ref(null);
		const newReorderData = ref({
			warehouse_reorder_level: null,
			warehouse_reorder_qty: null,
		});

		async function loadSettings() {
			try {
				const result = await call("frappe.client.get", {
					doctype: "Label Maker Settings",
					name: "Label Maker Settings",
				});
				settings.value = result;
				return result;
			} catch (error) {
				console.error("Failed to load settings:", error);
				toast({
					title: "Error",
					text: "Failed to load Label Maker Settings. Please configure default warehouse and warehouse group in settings.",
					icon: "x",
				});
				return null;
			}
		}

		function resetReorderForm() {
			newReorderData.value = {
				warehouse_reorder_level: null,
				warehouse_reorder_qty: null,
			};
		}

		async function addReorderLevel() {
			if (!props.item?.item_code) {
				toast({
					title: "Error",
					text: "Item code not found",
					icon: "x",
				});
				return;
			}

			// Load settings if not already loaded
			if (!settings.value) {
				await loadSettings();
			}

			if (!settings.value?.default_warehouse || !settings.value?.default_warehouse_group) {
				toast({
					title: "Error",
					text: "Default warehouse and warehouse group not configured in settings",
					icon: "x",
				});
				return;
			}

			if (
				newReorderData.value.warehouse_reorder_level === null ||
				newReorderData.value.warehouse_reorder_level === undefined
			) {
				toast({
					title: "Error",
					text: "Please enter reorder level",
					icon: "x",
				});
				return;
			}

			if (!newReorderData.value.warehouse_reorder_qty) {
				toast({
					title: "Error",
					text: "Please enter reorder quantity",
					icon: "x",
				});
				return;
			}

			savingReorder.value = true;
			try {
				await call("label_maker.api.edits.add_item_reorder_level", {
					item_code: props.item.item_code,
					warehouse_reorder_level: newReorderData.value.warehouse_reorder_level,
					warehouse_reorder_qty: newReorderData.value.warehouse_reorder_qty,
				});

				// Reload item
				const updatedItem = await call("frappe.client.get", {
					doctype: "Item",
					name: props.item.item_code,
					fields: ["*"],
				});

				// Update the item object
				Object.assign(props.item, updatedItem);

				resetReorderForm();
				showAddReorderForm.value = false;

				toast({
					title: "Success",
					text: "Reorder level added successfully",
					icon: "check",
				});
			} catch (error) {
				console.error("Failed to add reorder level:", error);
				const errorMsg = error?.message || error?.responseText || String(error);
				toast({
					title: "Error",
					text: errorMsg,
					icon: "x",
				});
			} finally {
				savingReorder.value = false;
			}
		}

		async function deleteReorderLevel(reorderName) {
			if (!confirm("Are you sure you want to delete this reorder level?")) {
				return;
			}

			try {
				await call("label_maker.api.edits.delete_item_reorder_level", {
					reorder_name: reorderName,
				});

				// Remove from local array
				reorderLevels.value = reorderLevels.value.filter((r) => r.name !== reorderName);

				toast({
					title: "Success",
					text: "Reorder level deleted successfully",
					icon: "check",
				});

				// Then reload
				const updatedItem = await call("frappe.client.get", {
					doctype: "Item",
					name: props.item.item_code,
					fields: ["*"],
				});
				Object.assign(props.item, updatedItem);
			} catch (error) {
				console.error("Failed to delete reorder level:", error);
				const errorMsg = error?.message || error?.responseText || String(error);
				toast({
					title: "Error",
					text: errorMsg,
					icon: "x",
				});
			}
		}
		onMounted(() => {
			loadSettings();
		});

		return {
			showAddReorderForm,
			savingReorder,
			newReorderData,
			resetReorderForm,
			addReorderLevel,
			deleteReorderLevel,
			loadSettings,
		};
	},
};
</script>

<style scoped></style>

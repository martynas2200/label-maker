<template>
	<div
		v-if="item?.reorder_levels && item.reorder_levels.length > 0"
		class="border-t border-gray-200 pt-4"
	>
		<div class="flex items-center justify-between mb-3">
			<h5 class="text-sm font-semibold text-gray-700">{{ $t("item_reorder_levels") }}</h5>
			<Button @click="showAddReorderForm = true" variant="subtle" size="sm" theme="green">
				<i class="fa fa-plus mr-1"></i> {{ $t("add_reorder") }}
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
						<p class="text-xs font-medium text-gray-600">{{ $t("reorder_level") }}</p>
						<p class="text-gray-900">{{ reorder.warehouse_reorder_level }}</p>
					</div>
					<div>
						<p class="text-xs font-medium text-gray-600">{{ $t("reorder_qty") }}</p>
						<p class="text-gray-900">{{ reorder.warehouse_reorder_qty }}</p>
					</div>
					<div>
						<Button
							@click="deleteReorderLevel(reorder.name)"
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
		<h5 class="text-sm font-semibold text-gray-700 mb-3">{{ $t("add_new_reorder_level") }}</h5>
		<div class="space-y-3">
			<div>
				<label class="block text-xs font-medium text-gray-600 mb-1">{{
					$t("reorder_level")
				}}</label>
				<input
					v-model.number="newReorderData.warehouse_reorder_level"
					type="number"
					class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
					:placeholder="$t('enter_reorder_level')"
				/>
			</div>
			<div>
				<label class="block text-xs font-medium text-gray-600 mb-1">{{
					$t("reorder_qty")
				}}</label>
				<input
					v-model.number="newReorderData.warehouse_reorder_qty"
					type="number"
					class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
					:placeholder="$t('enter_reorder_quantity')"
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
					<i class="fa fa-check mr-1"></i> {{ $t("add") }}
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
					<i class="fa fa-times mr-1"></i> {{ $t("cancel") }}
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
		<i class="fa fa-plus mr-1"></i> {{ $t("add_first_reorder_level") }}
	</Button>
</template>

<script>
import { Button } from "frappe-ui";
import { ref } from "vue";
import { call } from "frappe-ui";
import { toast } from "../helpers/toast";
import { useI18n } from "vue-i18n";
export default {
	name: "ItemReorderSection",
	components: { Button },
	props: {
		item: { type: Object, required: true },
	},
	setup(props) {
		const { t } = useI18n();
		const showAddReorderForm = ref(false);
		const savingReorder = ref(false);
		const newReorderData = ref({
			warehouse_reorder_level: null,
			warehouse_reorder_qty: null,
		});

		function resetReorderForm() {
			newReorderData.value = {
				warehouse_reorder_level: null,
				warehouse_reorder_qty: null,
			};
		}

		async function addReorderLevel() {
			if (!props.item?.item_code) {
				toast({
					title: t("error"),
					text: t("item_code_not_found"),
					variant: "error",
				});
				return;
			}

			if (
				newReorderData.value.warehouse_reorder_level === null ||
				newReorderData.value.warehouse_reorder_level === undefined
			) {
				toast({
					title: t("error"),
					text: t("please_enter_reorder_level"),
					variant: "error",
				});
				return;
			}

			if (!newReorderData.value.warehouse_reorder_qty) {
				toast({
					title: t("error"),
					text: t("please_enter_reorder_quantity"),
					variant: "error",
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
					title: t("success"),
					text: t("reorder_level_added_successfully"),
					variant: "success",
				});
			} catch (error) {
				console.error("Failed to add reorder level:", error);
				const errorMsg = error?.message || error?.responseText || String(error);
				toast({
					title: "Error",
					text: errorMsg,
					variant: "error",
				});
			} finally {
				savingReorder.value = false;
			}
		}

		async function deleteReorderLevel(reorderName) {
			if (!confirm(t("confirm_delete_reorder_level"))) {
				return;
			}

			try {
				await call("label_maker.api.edits.delete_item_reorder_level", {
					reorder_name: reorderName,
				});

				toast({
					title: t("success"),
					text: t("reorder_level_deleted_successfully"),
					variant: "success",
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
					title: t("error"),
					text: t(errorMsg),
					variant: "error",
				});
			}
		}
		return {
			showAddReorderForm,
			savingReorder,
			newReorderData,
			resetReorderForm,
			addReorderLevel,
			deleteReorderLevel,
		};
	},
};
</script>

<style scoped></style>

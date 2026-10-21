<template>
	<Dialog v-model="open" :options="{ size: 'lg' }">
		<template #body-title>
			<h3 class="text-lg font-semibold text-gray-900">{{ $t("item_details") }}</h3>
		</template>
		<template #body-content>
			<div class="space-y-6">
				<!-- Item Header -->
				<div class="border-b border-gray-200 pb-4">
					<h4
						:class="[
							'text-xl font-semibold',
							item.disabled ? 'text-red-700 line-through' : 'text-gray-900',
						]"
					>
						{{ item?.item_name }}
					</h4>
					<p class="text-sm text-gray-500">
						{{ $t("code") }}:
						<code class="bg-green-100 px-2 py-1 rounded">{{ item?.item_code }}</code>
						<!-- if package_deposit -->
						<code
							v-if="item?.deposit_package_count"
							class="bg-yellow-100 px-2 py-1 rounded ml-2"
						>
							<i class="fa fa-plus mr-1"></i>
							{{ item.deposit_package_count }} {{ $t("deposit_packages") }}
						</code>
					</p>
				</div>

				<!-- Basic Information Grid -->
				<div class="grid grid-cols-2 gap-6">
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-2">{{
							$t("item_barcodes")
						}}</label>
						<div
							v-if="!item?.barcodes || item.barcodes.length === 0"
							class="text-gray-400 italic"
						>
							{{ $t("no_barcodes") }}
						</div>
						<div v-else class="flex flex-wrap gap-2">
							<span
								v-for="(bc, idx) in item.barcodes"
								:key="idx"
								class="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-100 text-gray-900 text-sm font-mono border border-gray-200"
							>
								{{ bc.barcode || bc }}
							</span>
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-2">{{
							$t("suppliers")
						}}</label>
						<div
							v-if="!item?.suppliers || item.suppliers.length === 0"
							class="text-gray-400 italic"
						>
							{{ $t("no_suppliers") }}
						</div>
						<div v-else class="flex flex-wrap gap-2">
							<span
								v-for="(supplier, idx) in item.suppliers"
								:key="idx"
								class="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-50 text-blue-900 text-sm border border-blue-200"
							>
								{{ supplier.supplier || supplier }}
							</span>
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-1">{{
							$t("stock_quantity")
						}}</label>
						<p class="text-gray-900">
							{{ item?.stock_qty || 0 }} {{ item?.stock_uom }}
						</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-1">{{
							$t("safety_stock")
						}}</label>
						<div class="flex items-center gap-2">
							<div v-if="!editingSafetyStock" class="flex items-center gap-2 flex-1">
								<p class="text-gray-900">{{ item?.safety_stock || " - " }}</p>
								<Button
									@click="editingSafetyStock = true"
									variant="subtle"
									size="sm"
									theme="gray"
								>
									<i class="fa fa-edit"></i>
								</Button>
							</div>
							<div v-else class="flex items-center gap-2 flex-1">
								<input
									v-model.number="safetyStockValue"
									type="number"
									class="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
									:placeholder="item?.safety_stock || '0'"
								/>
								<Button
									@click="saveSafetyStock"
									variant="solid"
									size="sm"
									theme="green"
									:loading="savingSafetyStock"
								>
									<i class="fa fa-check"></i>
								</Button>
								<Button
									@click="editingSafetyStock = false"
									variant="outline"
									size="sm"
									theme="gray"
								>
									<i class="fa fa-times"></i>
								</Button>
							</div>
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-1">{{
							$t("item_group")
						}}</label>
						<p class="text-gray-900">{{ item?.item_group }}</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-1">{{
							$t("last_modified")
						}}</label>
						<p class="text-gray-900 text-sm">{{ formatDate(item?.modified) }}</p>
					</div>
				</div>

				<!-- Additional Details -->
				<div v-if="item?.description" class="border-t border-gray-200 pt-4">
					<label class="block text-sm font-medium text-gray-600 mb-2">{{
						$t("description")
					}}</label>
					<p class="text-gray-700 whitespace-pre-wrap">{{ item.description }}</p>
				</div>

				<!-- Price Lists Section -->
				<div class="border-t border-gray-200 pt-4">
					<div class="flex items-center justify-between mb-3">
						<label class="block text-sm font-medium text-gray-600">{{
							$t("price_lists")
						}}</label>
						<Button
							@click="loadPriceLists"
							variant="subtle"
							:loading="loadingPrices"
							size="sm"
						>
							<i class="fa fa-refresh mr-1"></i>
							{{ priceLists ? $t("refresh") : $t("load") }} {{ $t("prices") }}
						</Button>
					</div>

					<div class="space-y-4">
						<div class="grid grid-cols-2 gap-4 p-3 bg-cyan-100 rounded-lg">
							<div>
								<p class="text-xs font-medium text-gray-600">
									{{ $t("current_selling_price") }}
								</p>
								<p
									class="text-lg font-semibold text-gray-900"
									v-if="priceLists && priceLists.current_selling_price"
								>
									{{
										priceLists &&
										priceLists.current_selling_price &&
										priceLists.current_selling_price.price_list_rate !== null
											? `€${priceLists.current_selling_price.price_list_rate.toFixed(
													2
											  )}`
											: "N/A"
									}}
								</p>
								<p
									v-if="priceLists && priceLists.current_selling_price"
									class="text-xs text-gray-500"
								>
									{{ priceLists.current_selling_price.price_list }}
								</p>
							</div>
							<div v-if="item.last_purchase_rate !== null">
								<p class="text-xs font-medium text-gray-600">
									{{ $t("last_purchase_rate") }}
								</p>
								<p class="text-lg font-semibold text-gray-900">
									{{
										item.last_purchase_rate
											? `€${item.last_purchase_rate.toFixed(2)}`
											: "N/A"
									}}
								</p>
							</div>
						</div>

						<div v-if="priceLists && priceLists.prices.length > 0">
							<div class="overflow-x-auto">
								<table class="min-w-full divide-y divide-gray-200 text-sm">
									<thead class="bg-gray-50">
										<tr>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("price_list") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("rate") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("uom") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("valid") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("modified") }}
											</th>
										</tr>
									</thead>
									<tbody class="bg-white divide-y divide-gray-200">
										<tr
											v-for="price in priceLists.prices"
											:key="price.name"
											:class="{
												'bg-yellow-50': price.buying === 1,
												'bg-blue-50': price.selling === 1,
												'opacity-30': !price.is_valid,
											}"
										>
											<td class="px-3 py-2 text-gray-900">
												{{ price.price_list }}
											</td>
											<td class="px-3 py-2 text-gray-900 font-medium">
												{{ price.currency }}
												{{ price.price_list_rate.toFixed(2) }}
											</td>
											<td class="px-3 py-2 text-gray-600">
												{{ price.uom || "-" }}
											</td>
											<td class="px-3 py-2 text-gray-600">
												{{
													(price.valid_from || "-") +
													(price.valid_upto
														? " - " + price.valid_upto
														: "")
												}}
											</td>
											<td class="px-3 py-2 text-gray-600">
												{{ formatDate(price.modified) }}
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<div v-if="priceLists && priceLists.prices.length === 0">
							<p class="text-sm text-gray-500 text-center py-4">
								{{ $t("no_price_lists_found_for_this_item") }}
							</p>
						</div>
					</div>
				</div>

				<!-- Item Reorder Section -->
				<ItemReorderSection :item="item" />

				<!-- Comments Section -->
				<div
					v-if="item?.comments && item.comments.length > 0"
					class="border-t border-gray-200 pt-4"
				>
					<label class="block text-sm font-medium text-gray-600 mb-2"
						>{{ $t("comments") }} ({{ item.comments.length }})</label
					>
					<div class="space-y-2 max-h-96 overflow-y-auto">
						<div
							v-for="(comment, idx) in item.comments"
							:key="idx"
							class="border border-gray-200 rounded-lg py-2 px-3 hover:shadow-md transition-shadow bg-white"
						>
							<!-- Comment Header -->
							<div class="flex items-center justify-between mb-2">
								<p class="font-medium text-gray-900">{{ comment.comment_by }}</p>
								<div class="flex items-center gap-3">
									<p class="text-xs text-gray-500">
										{{ new Date(comment.creation).toLocaleDateString() }}
										<span class="mx-1">•</span>
										{{
											new Date(comment.creation).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})
										}}
									</p>
									<div
										v-if="!comment.seen"
										class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-medium"
									>
										{{ $t("unseen") }}
									</div>
								</div>
							</div>

							<div
								class="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none break-words"
								v-html="comment.content"
							></div>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #actions>
			<div class="flex items-center justify-between gap-2">
				<Button @click="openInErpNext" variant="solid" theme="blue">
					<i class="fa fa-external-link mr-2"></i> {{ $t("view_in_erpnext") }}
				</Button>
				<Button @click="close" variant="outline">{{ $t("close") }}</Button>
			</div>
		</template>
	</Dialog>
</template>

<script>
import { Dialog, Button } from "frappe-ui";
import { computed, ref } from "vue";
import { call } from "frappe-ui";
import { toast } from "../helpers/toast";
import ItemReorderSection from "./ItemReorderSection.vue";

import { watch } from "vue";

export default {
	name: "ItemDetailsModal",
	components: { Dialog, Button, ItemReorderSection },
	props: {
		modelValue: { type: Boolean, default: false },
		item: { type: Object, required: true },
	},
	emits: ["update:modelValue"],
	setup(props, { emit }) {
		const open = computed({
			get: () => props.modelValue,
			set: (v) => emit("update:modelValue", v),
		});

		const priceLists = ref(null);
		const loadingPrices = ref(false);
		const editingSafetyStock = ref(false);
		const safetyStockValue = ref(null);
		const savingSafetyStock = ref(false);

		watch(
			() => props.item,
			() => {
				// Reset price lists when item changes
				priceLists.value = null;
				loadPriceLists();
			}
		);

		function close() {
			open.value = false;
			priceLists.value = null;
		}

		async function loadPriceLists() {
			if (!props.item?.item_code) {
				toast({
					title: "Error",
					text: "Item code not found",
					variant: "error",
				});
				return;
			}

			loadingPrices.value = true;
			try {
				const result = await call("label_maker.api.items.get_item_price_lists", {
					item_code: props.item.item_code,
				});
				priceLists.value = result;
			} catch (error) {
				console.error("Failed to load price lists:", error);
				toast({
					title: "Error",
					text: "Failed to load price lists",
					variant: "error",
				});
			} finally {
				loadingPrices.value = false;
			}
		}

		function formatDate(dateString) {
			if (!dateString) return "N/A";
			try {
				return new Date(dateString).toLocaleDateString(window.navigator.language, {
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				});
			} catch {
				return dateString;
			}
		}

		function openInErpNext() {
			if (!props.item?.item_code) {
				toast({
					title: "Error",
					text: "Item code not found",
					variant: "error",
				});
				return;
			}
			// Open ERPNext item page in new tab
			const url = `/app/item/${props.item.item_code}`;
			window.open(url, "_blank");
		}

		async function saveSafetyStock() {
			if (!props.item?.item_code) {
				toast({
					title: "Error",
					text: "Item code not found",
					variant: "error",
				});
				return;
			}

			if (safetyStockValue.value === null || safetyStockValue.value === undefined) {
				toast({
					title: "Error",
					text: "Please enter a valid value",
					variant: "error",
				});
				return;
			}

			savingSafetyStock.value = true;
			try {
				await call("frappe.client.set_value", {
					doctype: "Item",
					name: props.item.item_code,
					fieldname: "safety_stock",
					value: safetyStockValue.value,
				});

				// Update the local item object
				props.item.safety_stock = safetyStockValue.value;
				editingSafetyStock.value = false;
				safetyStockValue.value = null;

				toast({
					title: "Success",
					text: "Safety Stock updated successfully",
					variant: "success",
				});
			} catch (error) {
				console.error("Failed to update safety stock:", error);
				toast({
					title: "Error",
					text: "Failed to update Safety Stock",
					variant: "error",
				});
			} finally {
				savingSafetyStock.value = false;
			}
		}

		return {
			open,
			close,
			formatDate,
			openInErpNext,
			priceLists,
			loadingPrices,
			loadPriceLists,
			editingSafetyStock,
			safetyStockValue,
			savingSafetyStock,
			saveSafetyStock,
		};
	},
};
</script>

<style scoped></style>

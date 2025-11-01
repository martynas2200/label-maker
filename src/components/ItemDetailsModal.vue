<template>
	<Dialog v-model="open" :options="{ size: 'lg' }">
		<template #body-title>
			<h3 class="text-lg font-semibold text-gray-900">{{ $t("Item Details") }}</h3>
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
						{{ $t("Code") }}:
						<code class="bg-green-100 px-2 py-1 rounded">{{ item?.item_code }}</code>
						<!-- if package_deposit -->
						<code
							v-if="item?.deposit_package_count"
							class="bg-yellow-100 px-2 py-1 rounded ml-2"
						>
							<i class="fa fa-plus mr-1"></i>
							{{ item.deposit_package_count }} {{ $t("Deposit Packages") }}
						</code>
					</p>
				</div>

				<!-- Basic Information Grid -->
				<div class="grid grid-cols-2 gap-6">
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-2">{{
							$t("Item Barcodes")
						}}</label>
						<div
							v-if="!item?.barcodes || item.barcodes.length === 0"
							class="text-gray-400 italic"
						>
							{{ $t("No barcodes") }}
						</div>
						<div v-else class="flex flex-wrap gap-2">
							<span
								v-for="(bc, idx) in item.barcodes"
								:key="idx"
								class="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-100 text-gray-900 text-sm font-mono border border-gray-200"
							>
								<i class="fa fa-barcode mr-2 text-gray-500"></i>
								{{ bc.barcode || bc }}
							</span>
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-2">{{
							$t("Suppliers")
						}}</label>
						<div
							v-if="!item?.suppliers || item.suppliers.length === 0"
							class="text-gray-400 italic"
						>
							{{ $t("No suppliers") }}
						</div>
						<div v-else class="flex flex-wrap gap-2">
							<span
								v-for="(supplier, idx) in item.suppliers"
								:key="idx"
								class="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-50 text-blue-900 text-sm border border-blue-200"
							>
								<i class="fa fa-building mr-2 text-blue-500"></i>
								{{ supplier.supplier || supplier }}
							</span>
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-1">{{
							$t("Stock Quantity")
						}}</label>
						<p class="text-gray-900">
							{{ item?.stock_qty || 0 }} {{ item?.stock_uom }}
						</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-1">{{
							$t("Safety Stock")
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
							$t("Item Group")
						}}</label>
						<p class="text-gray-900">{{ item?.item_group }}</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-1">{{
							$t("Last Modified")
						}}</label>
						<p class="text-gray-900 text-sm">{{ formatDate(item?.modified) }}</p>
					</div>
				</div>

				<!-- Additional Details -->
				<div v-if="item?.description" class="border-t border-gray-200 pt-4">
					<label class="block text-sm font-medium text-gray-600 mb-2">{{
						$t("Description")
					}}</label>
					<p class="text-gray-700 whitespace-pre-wrap">{{ item.description }}</p>
				</div>

				<!-- Price Lists Section -->
				<div class="border-t border-gray-200 pt-4">
					<div class="flex items-center justify-between mb-3">
						<label class="block text-sm font-medium text-gray-600">{{
							$t("Price Lists")
						}}</label>
						<Button
							@click="loadPriceLists"
							variant="subtle"
							:loading="loadingPrices"
							size="sm"
						>
							<i class="fa fa-refresh mr-1"></i>
							{{ priceLists ? $t("Refresh") : $t("Load") }} {{ $t("Prices") }}
						</Button>
					</div>

					<div v-if="priceLists" class="space-y-4">
						<!-- Current Prices Summary -->
						<div class="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
							<div>
								<p class="text-xs font-medium text-gray-600">
									{{ $t("Current Selling Price") }}
								</p>
								<p class="text-lg font-semibold text-gray-900">
									{{
										priceLists.current_selling_price
											? `€${priceLists.current_selling_price.price_list_rate.toFixed(
													2
											  )}`
											: "N/A"
									}}
								</p>
								<p
									v-if="priceLists.current_selling_price"
									class="text-xs text-gray-500"
								>
									{{ priceLists.current_selling_price.price_list }}
								</p>
							</div>
							<div v-if="priceLists.current_buying_price !== null">
								<p class="text-xs font-medium text-gray-600">
									{{ $t("Current Buying Price") }}
								</p>
								<p class="text-lg font-semibold text-gray-900">
									{{
										priceLists.current_buying_price
											? `€${priceLists.current_buying_price.price_list_rate.toFixed(
													2
											  )}`
											: "N/A"
									}}
								</p>
								<p
									v-if="priceLists.current_buying_price"
									class="text-xs text-gray-500"
								>
									{{ priceLists.current_buying_price.price_list }}
								</p>
							</div>
						</div>

						<!-- Selling Prices Table -->
						<div v-if="priceLists.selling_prices.length > 0">
							<h5 class="text-sm font-semibold text-gray-700 mb-2">
								{{ $t("Selling Prices") }}
							</h5>
							<div class="overflow-x-auto">
								<table class="min-w-full divide-y divide-gray-200 text-sm">
									<thead class="bg-gray-50">
										<tr>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("Price List") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("Rate") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("Valid From") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("Valid Until") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("Status") }}
											</th>
										</tr>
									</thead>
									<tbody class="bg-white divide-y divide-gray-200">
										<tr
											v-for="price in priceLists.selling_prices"
											:key="price.name"
											:class="{ 'bg-green-50': price.is_valid }"
										>
											<td class="px-3 py-2 text-gray-900">
												{{ price.price_list }}
											</td>
											<td class="px-3 py-2 text-gray-900 font-medium">
												{{ price.currency }}
												{{ price.price_list_rate.toFixed(2) }}
											</td>
											<td class="px-3 py-2 text-gray-600">
												{{ price.valid_from || "-" }}
											</td>
											<td class="px-3 py-2 text-gray-600">
												{{ price.valid_upto || "-" }}
											</td>
											<td class="px-3 py-2">
												<span
													v-if="price.is_valid"
													class="px-2 py-1 text-xs rounded bg-green-100 text-green-800"
												>
													{{ $t("Active") }}
												</span>
												<span
													v-else
													class="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600"
												>
													{{ $t("Inactive") }}
												</span>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<!-- Buying Prices Table -->
						<div v-if="priceLists.buying_prices.length > 0">
							<h5 class="text-sm font-semibold text-gray-700 mb-2">
								{{ $t("Buying Prices") }}
							</h5>
							<div class="overflow-x-auto">
								<table class="min-w-full divide-y divide-gray-200 text-sm">
									<thead class="bg-gray-50">
										<tr>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("Price List") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("Rate") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("Valid") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("Modified") }}
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												{{ $t("Status") }}
											</th>
										</tr>
									</thead>
									<tbody class="bg-white divide-y divide-gray-200">
										<tr
											v-for="price in priceLists.buying_prices"
											:key="price.name"
											:class="{ 'bg-green-50': price.is_valid }"
										>
											<td class="px-3 py-2 text-gray-900">
												{{ price.price_list }}
											</td>
											<td class="px-3 py-2 text-gray-900 font-medium">
												{{ price.currency }}
												{{ price.price_list_rate.toFixed(2) }}
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
											<td class="px-3 py-2">
												<span
													v-if="price.is_valid"
													class="px-2 py-1 text-xs rounded bg-green-100 text-green-800"
												>
													{{ $t("Active") }}
												</span>
												<span
													v-else
													class="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600"
												>
													{{ $t("Inactive") }}
												</span>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<div
							v-if="
								priceLists.selling_prices.length === 0 &&
								priceLists.buying_prices.length === 0
							"
						>
							<p class="text-sm text-gray-500 text-center py-4">
								{{ $t("No price lists found for this item.") }}
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
						>{{ $t("Comments") }} ({{ item.comments.length }})</label
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
										{{ $t("Unseen") }}
									</div>
								</div>
							</div>

							<!-- Comment Content -->
							<div
								class="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none break-words"
								v-html="comment.content"
							></div>

							<!-- <div class="mt-2 flex items-center gap-4 text-xs text-gray-500">
								<span v-if="comment.comment_email">
									<i class="fa fa-envelope mr-1"></i>{{ comment.comment_email }}
								</span>
								<span v-if="comment.comment_type">
									<i class="fa fa-tag mr-1"></i>{{ comment.comment_type }}
								</span>
							</div> -->
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #actions>
			<div class="flex items-center justify-between gap-2">
				<Button @click="openInErpNext" variant="solid" theme="blue">
					<i class="fa fa-external-link mr-2"></i> {{ $t("View in ERPNext") }}
				</Button>
				<Button @click="close" variant="outline">{{ $t("Close") }}</Button>
			</div>
		</template>
	</Dialog>
</template>

<script>
import { Dialog, Button, toast } from "frappe-ui";
import { computed, ref } from "vue";
import { call } from "frappe-ui";
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
					icon: "x",
					iconClasses: "text-red-600",
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
					icon: "x",
					iconClasses: "text-red-600",
				});
			} finally {
				loadingPrices.value = false;
			}
		}

		function formatDate(dateString) {
			if (!dateString) return "N/A";
			try {
				return new Date(dateString).toLocaleDateString("en-US", {
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
					icon: "x",
					iconClasses: "text-red-600",
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
					icon: "x",
					iconClasses: "text-red-600",
				});
				return;
			}

			if (safetyStockValue.value === null || safetyStockValue.value === undefined) {
				toast({
					title: "Error",
					text: "Please enter a valid value",
					icon: "x",
					iconClasses: "text-red-600",
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
					icon: "check",
					iconClasses: "text-green-600",
				});
			} catch (error) {
				console.error("Failed to update safety stock:", error);
				toast({
					title: "Error",
					text: "Failed to update Safety Stock",
					icon: "x",
					iconClasses: "text-red-600",
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

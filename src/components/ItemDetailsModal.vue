<template>
	<Dialog v-model="open" :options="{ size: 'lg' }">
		<template #body-title>
			<h3 class="text-lg font-semibold text-gray-900">Item Details</h3>
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
						Code:
						<code class="bg-green-100 px-2 py-1 rounded">{{ item?.item_code }}</code>
					</p>
				</div>

				<!-- Basic Information Grid -->
				<div class="grid grid-cols-2 gap-6">
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-2"
							>Item Barcodes</label
						>
						<div
							v-if="!item?.barcodes || item.barcodes.length === 0"
							class="text-gray-400 italic"
						>
							No barcodes
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
						<label class="block text-sm font-medium text-gray-600 mb-2"
							>Suppliers</label
						>
						<div
							v-if="!item?.suppliers || item.suppliers.length === 0"
							class="text-gray-400 italic"
						>
							No suppliers
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
						<label class="block text-sm font-medium text-gray-600 mb-1"
							>Item Group</label
						>
						<p class="text-gray-900">{{ item?.item_group }}</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-1"
							>Standard Rate</label
						>
						<p class="text-gray-900">€{{ (item?.standard_rate || 0).toFixed(2) }}</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-1"
							>Stock Quantity</label
						>
						<p class="text-gray-900">
							{{ item?.stock_qty || 0 }} {{ item?.stock_uom }}
						</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-600 mb-1"
							>Last Modified</label
						>
						<p class="text-gray-900 text-sm">{{ formatDate(item?.modified) }}</p>
					</div>
				</div>

				<!-- Additional Details -->
				<div v-if="item?.description" class="border-t border-gray-200 pt-4">
					<label class="block text-sm font-medium text-gray-600 mb-2">Description</label>
					<p class="text-gray-700 whitespace-pre-wrap">{{ item.description }}</p>
				</div>

				<!-- Price Lists Section -->
				<div class="border-t border-gray-200 pt-4">
					<div class="flex items-center justify-between mb-3">
						<label class="block text-sm font-medium text-gray-600">Price Lists</label>
						<Button
							@click="loadPriceLists"
							variant="subtle"
							:loading="loadingPrices"
							size="sm"
						>
							<i class="fa fa-refresh mr-1"></i>
							{{ priceLists ? "Refresh" : "Load" }} Prices
						</Button>
					</div>

					<div v-if="priceLists" class="space-y-4">
						<!-- Current Prices Summary -->
						<div class="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
							<div>
								<p class="text-xs font-medium text-gray-600">
									Current Selling Price
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
									Current Buying Price
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
								Selling Prices
							</h5>
							<div class="overflow-x-auto">
								<table class="min-w-full divide-y divide-gray-200 text-sm">
									<thead class="bg-gray-50">
										<tr>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												Price List
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												Rate
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												Valid From
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												Valid Until
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												Status
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
													Active
												</span>
												<span
													v-else
													class="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600"
												>
													Inactive
												</span>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<!-- Buying Prices Table -->
						<div v-if="priceLists.buying_prices.length > 0">
							<h5 class="text-sm font-semibold text-gray-700 mb-2">Buying Prices</h5>
							<div class="overflow-x-auto">
								<table class="min-w-full divide-y divide-gray-200 text-sm">
									<thead class="bg-gray-50">
										<tr>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												Price List
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												Rate
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												Valid
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												Modified
											</th>
											<th
												class="px-3 py-2 text-left text-xs font-medium text-gray-500"
											>
												Status
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
													Active
												</span>
												<span
													v-else
													class="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600"
												>
													Inactive
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
								No price lists found for this item.
							</p>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #actions>
			<div class="flex items-center justify-between gap-2">
				<Button @click="openInErpNext" variant="solid" theme="blue">
					<i class="fa fa-external-link mr-2"></i> View in ERPNext
				</Button>
				<Button @click="close" variant="outline">Close</Button>
			</div>
		</template>
	</Dialog>
</template>

<script>
import { Dialog, Button, toast } from "frappe-ui";
import { computed, ref } from "vue";
import { call } from "frappe-ui";

import { watch } from "vue";

export default {
	name: "ItemDetailsModal",
	components: { Dialog, Button },
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

		watch(
			() => props.item,
			() => {
				// Reset price lists when item changes
				priceLists.value = null;
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

		return {
			open,
			close,
			formatDate,
			openInErpNext,
			priceLists,
			loadingPrices,
			loadPriceLists,
		};
	},
};
</script>

<style scoped></style>

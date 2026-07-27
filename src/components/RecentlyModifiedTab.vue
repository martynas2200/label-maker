<template>
	<div>
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<h2 class="text-lg font-semibold text-gray-900">
					{{ $t("Recently Modified Item Prices") }}
				</h2>
				<span class="text-sm text-gray-500">({{ items.length }})</span>
			</div>
			<Button size="sm" :loading="loading" @click="$emit('refresh')" variant="subtle">
				<i class="fa fa-refresh mr-2"></i>{{ $t("Refresh") }}
			</Button>
		</div>

		<div v-if="items.length === 0" class="text-center py-12">
			<div class="text-gray-400 text-4xl mb-2">
				<i class="fa fa-inbox"></i>
			</div>
			<p class="text-gray-500">
				{{ $t("No recently modified item prices") }}
			</p>
		</div>

		<div v-else class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="border-b border-gray-200 bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left font-semibold text-gray-700">
							{{ $t("Item Code") }}
						</th>
						<th class="px-4 py-3 text-left font-semibold text-gray-700">
							{{ $t("Item Name") }}
						</th>
						<th class="px-4 py-3 text-right font-semibold text-gray-700">
							{{ $t("Rate") }}
						</th>
						<th
							v-if="showStockQty"
							class="px-4 py-3 text-right font-semibold text-gray-700"
						>
							{{ $t("Stock Qty") }}
						</th>
						<th class="px-4 py-3 text-center font-semibold text-gray-700">
							{{ $t("Actions") }}
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					<tr
						v-for="item in items"
						:key="item.item_code"
						class="hover:bg-gray-50 transition"
					>
						<td class="px-4 py-3" @click="$emit('open-details', item)">
							<code
								class="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-900"
								>{{ item.item_code }}</code
							>
						</td>
						<td
							:class="[
								'cursor-pointer px-4 py-3 font-medium',
								item.disabled ? 'text-red-700 line-through' : 'text-gray-900',
							]"
							@click="$emit('open-details', item)"
						>
							{{ item.item_name }}
						</td>
						<td class="px-4 py-3 text-right font-semibold text-gray-900">
							€{{ (item.standard_rate || 0).toFixed(2) }} / {{ item.stock_uom }}
						</td>
						<td v-if="showStockQty" class="px-4 py-3 text-right text-gray-600">
							{{ item.stock_qty || 0 }}
						</td>
						<td class="px-4 py-3 text-center">
							<div class="flex items-center justify-center gap-2">
								<Button
									size="sm"
									@click="$emit('add', item)"
									variant="solid"
									theme="green"
								>
									<i class="fa fa-plus"></i>
								</Button>
								<Button
									size="sm"
									@click="$emit('open-weigh', item)"
									variant="outline"
									theme="blue"
								>
									<i class="fa fa-balance-scale"></i>
								</Button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script>
import { Button } from "frappe-ui";

export default {
	name: "RecentlyModifiedTab",
	components: { Button },
	props: {
		items: Array,
		showStockQty: Boolean,
		loading: Boolean,
	},
	emits: ["refresh", "add", "open-weigh", "open-details"],
};
</script>

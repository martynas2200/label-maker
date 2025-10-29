<template>
	<div class="mb-6">
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
			<div class="p-6 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<i class="fa fa-check-circle text-blue-500"></i>
						<h2 class="text-lg font-semibold text-gray-900">Items to Print</h2>
						<span class="text-sm text-gray-500">({{ items.length }})</span>
					</div>
					<Button
						v-if="items.length > 0"
						size="sm"
						@click="$emit('clear')"
						variant="solid"
						theme="red"
					>
						<i class="fa fa-trash mr-2"></i>Clear
					</Button>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="border-b border-gray-200 bg-gray-50">
						<tr>
							<th class="px-4 py-2 text-left font-semibold text-gray-700">
								Item Name
							</th>
							<th class="px-4 py-2 text-left font-semibold text-gray-700">
								Item Code
							</th>
							<th class="px-4 py-2 text-left font-semibold text-gray-700">UOM</th>
							<th class="px-4 py-2 text-right font-semibold text-gray-700">Rate</th>
							<th
								v-if="showStockQty"
								class="px-4 py-2 text-right font-semibold text-gray-700"
							>
								Stock Qty
							</th>
							<th class="px-4 py-2 text-center font-semibold text-gray-700">
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						<tr
							v-for="item in items"
							:key="item.item_code"
							class="hover:bg-gray-50 transition"
						>
							<td
								:class="[
									'cursor-pointer px-4 py-3 font-medium text-lg',
									item.disabled ? 'text-red-700 line-through' : 'text-gray-900',
								]"
								@click="$emit('open-details', item)"
							>
								{{ item.item_name }}
							</td>
							<td class="px-4 py-3">
								<code
									class="bg-green-100 px-2 py-1 rounded text-xs font-mono text-green-900"
									>{{ item.item_code }}</code
								>
							</td>
							<td class="px-4 py-3 text-gray-600">{{ item.stock_uom }}</td>
							<td class="px-4 py-3 text-right">
								<span
									class="bg-blue-50 font-normal font-weight-bold px-2 py-1 rounded text-lg"
								>
									{{
										item.total_price != null && item.total_price > 0
											? item.total_price.toFixed(2)
											: (item.standard_rate || 0).toFixed(2)
									}}
								</span>
							</td>
							<td v-if="showStockQty" class="px-4 py-3 text-right text-gray-600">
								{{ item.stock_qty || 0 }}
							</td>
							<td class="px-4 py-3 text-center">
								<div class="flex items-center justify-center gap-2">
									<Button
										size="sm"
										@click="$emit('remove', item.item_code)"
										variant="outline"
										theme="red"
									>
										<i class="fa fa-trash"></i>
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
	</div>
</template>

<script>
import { Button } from "frappe-ui";

export default {
	name: "CurrentListTable",
	components: { Button },
	props: {
		items: Array,
		showStockQty: Boolean,
	},
	emits: ["clear", "remove", "open-weigh", "open-details"],
};
</script>

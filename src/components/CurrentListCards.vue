<template>
	<div :class="['mb-6 item-list', { 'has-new-item': showDimEffect }]">
		<TransitionGroup name="item-list" tag="div">
			<div
				v-for="(item, index) in items"
				:key="item.item_code"
				:class="[
					'py-2 px-2 mb-2 item bg-white rounded-lg shadow border overflow-hidden hover:bg-gray-50',
					{ 'item-first': index === 0 && showDimEffect },
					item.disabled ? 'border-red-500 border-2 bg-red-50' : 'border-gray-200',
				]"
			>
				<div class="item-main" @click="$emit('open-details', item)">
					<span class="item-price rounded" v-if="item.standard_rate > 0">{{
						item.total_price != null && item.total_price > 0
							? item.total_price.toFixed(2)
							: (item.standard_rate || 0).toFixed(2)
					}}</span>
					<span
						:class="[
							'item-name font-medium text-lg',
							item.disabled ? 'text-red-700 line-through' : 'text-gray-900',
						]"
						>{{ item.item_name }}</span
					>
				</div>
				<div class="item-labels">
					<span
						v-if="item.disabled"
						class="bg-red-600 text-white px-2 py-1 rounded font-semibold text-sm"
						>{{ $t("ITEM DISABLED") }}</span
					>
					<span v-if="item.weight" class="font-semibold">
						Weight: {{ item.weight }}</span
					>
					<span v-if="showStockQty">
						<i class="fa fa-home margin-right-5"></i>{{ $t("Stock") }}:
						{{ item.stock_qty || 0 }}
					</span>
					<span v-if="item.stock_uom.toLowerCase().includes('kg')">{{
						$t("Weighted item")
					}}</span>
					<span v-if="item.standard_rate >= 0 && item.weight" class="font-semibold">
						{{ item.stock_uom }} {{ $t("Rate") }}:
						{{ (item.standard_rate || 0).toFixed(2) }}</span
					>
					<span
						v-if="item.barcodes && item.barcodes.length > 1"
						class="text-sm text-gray-500"
					>
						{{ item.barcodes.length }} {{ $t("Barcodes") }}
					</span>
					<span
						v-if="item.suppliers && item.suppliers.length > 1"
						class="text-sm text-gray-500"
					>
						{{ item.suppliers.length }} {{ $t("Suppliers") }}
					</span>

					<span
						v-if="getPricePerUnit(item.item_name, item.standard_rate) > 0"
						class="pull-right text-grey"
					>
						{{ getPricePerUnit(item.item_name, item.standard_rate) }}
					</span>

					<div v-if="item.comments && item.comments.length > 0" class="mt-1 text-sm">
						<div
							class="bg-gradient-to-r from-blue-50 to-indigo-50 py-2 px-3 rounded-lg border border-blue-100"
						>
							<div class="text-xs text-gray-500 mb-2">
								<span class="font-medium text-gray-700">{{
									$t("Latest Comment")
								}}</span>
								<span class="font-medium">{{ item.comments[0].comment_by }}</span>
								<span class="mx-1">•</span>
								<span>{{
									new Date(item.comments[0].creation).toLocaleDateString()
								}}</span>
								<code
									v-if="item.comments.length > 1"
									class="text-xs pull-right bg-blue-100 text-blue-700 px-2 py-1 rounded"
								>
									+{{ 0 }} {{ $t("more") }}
								</code>
							</div>
							<div
								class="text-gray-700 text-xs leading-relaxed prose prose-sm max-w-none"
								v-html="item.comments[0].content"
							></div>
						</div>
					</div>
				</div>
				<div class="buttons flex items-center justify-center gap-2">
					<Button
						size="sm"
						@click="$emit('remove', item.item_code)"
						variant="subtle"
						theme="red"
					>
						<i class="fa fa-trash"></i>
					</Button>
					<Button
						size="sm"
						@click="$emit('open-weigh', item)"
						variant="subtle"
						theme="blue"
					>
						<i class="fa fa-balance-scale"></i>
					</Button>
				</div>
			</div>
		</TransitionGroup>
	</div>
</template>

<script>
import { Button } from "frappe-ui";
import { TransitionGroup } from "vue";
import { getPricePerUnit } from "../helpers/utilities";

export default {
	name: "CurrentListCards",
	components: { Button, TransitionGroup },
	props: {
		items: Array,
		showStockQty: Boolean,
		showDimEffect: Boolean,
	},
	emits: ["remove", "open-weigh", "open-details"],
	setup() {
		return {
			getPricePerUnit,
		};
	},
};
</script>

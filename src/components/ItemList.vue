<template>
	<div>
		<div v-if="!items || items.length === 0" class="text-gray-500 text-sm py-6">No items</div>
		<div v-else class="border rounded divide-y">
			<div v-for="it in items" :key="it.item_code" class="p-3 flex items-center gap-4">
				<div class="flex-1 min-w-0">
					<div class="font-medium truncate">{{ it.item_name }}</div>
					<div class="text-xs text-gray-500">
						{{ it.item_code }} · {{ it.stock_uom }}
					</div>
				</div>
				<div class="w-28 text-right tabular-nums">
					€ {{ Number(it.standard_rate || 0).toFixed(2) }}
				</div>
				<div v-if="showStock" class="w-32 text-right text-gray-600 tabular-nums">
					Stock: {{ Number(it.stock_qty || 0).toFixed(2) }}
				</div>
				<div class="w-28 text-right">
					<Button v-if="isWeighable(it)" size="sm" @click="$emit('weigh', it)"
						>Weigh</Button
					>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: "ItemList",
	props: {
		items: { type: Array, default: () => [] },
		showStock: { type: Boolean, default: true },
	},
	emits: ["weigh"],
	methods: {
		isWeighable(it) {
			if (!it || !it.stock_uom) return false;
			const u = String(it.stock_uom).toLowerCase();
			return u === "kg" || u === "kilogram" || u === "kilograms";
		},
	},
};
</script>

<style scoped>
.tabular-nums {
	font-variant-numeric: tabular-nums;
}
</style>

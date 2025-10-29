<template>
	<div class="sticky top-0 bg-white border-b border-gray-200 shadow-sm">
		<div class="max-w-7xl py-4 px-6 mx-auto">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Label Maker</h1>
						<div
							v-if="wsConnected"
							class="flex items-center gap-2 text-sm text-green-600"
						>
							<span
								class="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"
							></span>
							Scanner connected
						</div>
						<div
							v-else-if="showReconnectButton"
							class="flex items-center gap-2 text-sm text-red-600"
						>
							<span class="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
							Scanner disconnected
						</div>
					</div>
				</div>
				<div class="flex items-center gap-4">
					<Button
						v-if="showReconnectButton"
						size="sm"
						@click="$emit('reconnect')"
						variant="solid"
						theme="orange"
					>
						<i class="fa fa-plug mr-1"></i>Reconnect
					</Button>
					<Dropdown
						:options="[
							{
								label: 'Show Stock Qty',
								switch: true,
								switchValue: showStockQty,
								onClick: (val) => $emit('update:showStockQty', val),
							},
							{
								label: 'Show Input',
								switch: true,
								switchValue: showInputManually,
								onClick: (val) => $emit('update:showInputManually', val),
							},
							{
								label: 'Speak Price',
								switch: true,
								switchValue: speakPrice,
								onClick: (val) => $emit('update:speakPrice', val),
							},
							{
								label: 'Cards View',
								switch: true,
								switchValue: cardsView,
								onClick: (val) => $emit('update:cardsView', val),
							},
							{
								label: 'Go back to Apps',
								icon: 'list',
								onClick: this.goToApps,
							},
						]"
					/>
					<Button
						v-if="currentListLength > 0 && cardsView"
						size="sm"
						@click="$emit('clear')"
						variant="subtle"
						theme="red"
					>
						<i class="fa fa-trash mr-2"></i>Clear
					</Button>
					<Button
						:loading="printing"
						@click="$emit('print')"
						:disabled="currentListLength === 0"
						variant="solid"
						theme="blue"
					>
						<i class="fa fa-print mr-2"></i>
						Print ({{ currentListLength }})
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { Button, Dropdown } from "frappe-ui";

export default {
	name: "AppHeader",
	components: { Button, Dropdown },
	props: {
		wsConnected: Boolean,
		showReconnectButton: Boolean,
		showStockQty: Boolean,
		showInputManually: Boolean,
		speakPrice: Boolean,
		cardsView: Boolean,
		currentListLength: Number,
		printing: Boolean,
	},
	emits: [
		"update:showStockQty",
		"update:showInputManually",
		"update:speakPrice",
		"update:cardsView",
		"print",
		"clear",
		"reconnect",
	],
	methods: {
		goToApps() {
			window.location.href = "/apps";
		},
	},
};
</script>

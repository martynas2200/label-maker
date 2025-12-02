<template>
	<div class="sticky top-0 bg-white border-b border-gray-200 shadow-sm">
		<div class="max-w-7xl py-4 px-6 mx-auto">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div>
						<h1 class="text-2xl font-bold text-gray-900">{{ $t("Label Maker") }}</h1>
						<div
							v-if="wsConnected"
							class="flex items-center gap-2 text-sm text-green-600"
						>
							<span
								class="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"
							></span>
							{{ $t("Scanner connected") }}
						</div>
						<div
							v-else-if="showReconnectButton"
							class="flex items-center gap-2 text-sm text-red-600"
						>
							<span class="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
							{{ $t("Scanner disconnected") }}
						</div>
					</div>
				</div>
				<div class="flex items-center gap-4">
					<Button
						v-if="showReconnectButton"
						size="sm"
						@click="$emit('reconnect')"
						variant="solid"
					>
						<i class="fa fa-plug mr-1"></i>{{ $t("Reconnect") }}
					</Button>
					<Dropdown
						:options="[
							{
								group: $t('Options'),
								items: [
									{
										label: $t('Show Stock Qty'),
										switch: true,
										switchValue: showStockQty,
										onClick: (val) => $emit('update:showStockQty', val),
									},
									{
										label: $t('Show Input'),
										switch: true,
										switchValue: showInputManually,
										onClick: (val) => $emit('update:showInputManually', val),
									},
									{
										label: $t('Speak Price'),
										switch: true,
										switchValue: speakPrice,
										onClick: (val) => $emit('update:speakPrice', val),
									},
									{
										label: $t('Cards View'),
										switch: true,
										switchValue: cardsView,
										onClick: (val) => $emit('update:cardsView', val),
									},
								],
							},
							{
								group: $t('Navigation'),
								items: [
									{
										icon: 'grid',
										label: $t('Apps'),
										submenu: apps.data?.map((app) => ({
											label: app.title,
											icon: app.logo,
											component: h(
												'a',
												{
													class: 'flex items-center gap-2 p-1.5 rounded hover:bg-surface-gray-2',
													href: app.route,
												},
												[
													h('img', { src: app.logo, class: 'size-6' }),
													h(
														'span',
														{
															class: 'max-w-18 text-sm w-full truncate',
														},
														app.title
													),
												]
											),
										})),
									},
									{
										label: $t('Log out'),
										icon: 'log-out',
										onClick: this.logOut,
									},
								],
							},
						]"
					>
						<Button size="sm" variant="outline" theme="gray">
							<FeatherIcon name="more-horizontal" class="w-4 h-4" />
						</Button>
					</Dropdown>
					<Button
						v-if="currentListLength > 0 && cardsView"
						size="sm"
						@click="$emit('clear')"
						variant="subtle"
						theme="red"
					>
						<i class="fa fa-trash mr-2"></i>{{ $t("Clear") }}
					</Button>
					<Button
						:loading="printing"
						@click="$emit('print')"
						:disabled="currentListLength === 0"
						variant="solid"
						theme="blue"
					>
						<i class="fa fa-print mr-2"></i>
						{{ $t("Print") }} ({{ currentListLength }})
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { h } from "vue";
import { Button, Dropdown, FeatherIcon } from "frappe-ui";
import { apps } from "../resources/all";

export default {
	name: "AppHeader",
	components: { Button, Dropdown, FeatherIcon },
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
	setup() {
		apps.fetch();
		return { apps, h };
	},
	methods: {
		logOut() {
			window.location.href = "/logout";
		},
	},
};
</script>

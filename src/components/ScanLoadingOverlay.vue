<template>
	<Transition name="scan-loader">
		<div
			v-if="delayedVisible"
			class="fixed mt-0 inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-6 backdrop-blur-[2px]"
			role="status"
			aria-live="polite"
			:aria-label="$t('loading_item')"
		>
			<div
				class="scan-loader-panel w-full max-w-xs rounded-2xl border border-white/60 bg-white/95 px-8 py-7 text-center shadow-2xl"
			>
				<div class="spinner"></div>
				<p class="text-base font-semibold text-slate-900">{{ $t("loading_item") }}</p>
				<p class="mt-1 text-sm text-slate-500">{{ $t("please_wait") }}</p>
			</div>
		</div>
	</Transition>
</template>

<script>
export default {
	name: "ScanLoadingOverlay",
	props: {
		visible: Boolean,
	},
	data() {
		return {
			delayedVisible: false,
			delayTimer: null,
		};
	},
	watch: {
		visible: {
			handler(value) {
				clearTimeout(this.delayTimer);
				this.delayedVisible = false;

				if (value) {
					this.delayTimer = setTimeout(() => {
						this.delayedVisible = true;
					}, 500);
				}
			},
			immediate: true,
		},
	},
	beforeUnmount() {
		clearTimeout(this.delayTimer);
	},
};
</script>

<style scoped>
.spinner {
	position: relative;
	margin: auto;
	box-sizing: border-box;
	width: 50px;
	height: 50px;
	border-radius: 100px;
	border: 4px solid rgba(255, 255, 255, 0.1);
	margin-bottom: 1rem;
}
.spinner:before,
.spinner:after {
	content: "";
	position: absolute;
	margin: -4px;
	box-sizing: inherit;
	width: inherit;
	height: inherit;
	border-radius: inherit;
	opacity: 0.05;
	border: inherit;
	top: 0;
	left: 0;
	border-color: transparent;
	animation: spinner-spin 1.6s ease-in-out infinite, spinner-fade 1.6s linear infinite;
}

.spinner:before {
	border-top-color: #76beb5;
}

.spinner:after {
	border-top-color: #fe9c3c;
	animation-delay: 0.55s;
}

@keyframes spinner-spin {
	100% {
		transform: rotate(360deg);
	}
}
@keyframes spinner-fade {
	25% {
		opacity: 0.15;
	}
	35% {
		opacity: 1;
	}
	65% {
		opacity: 1;
	}
	75% {
		opacity: 0.15;
	}
}
</style>

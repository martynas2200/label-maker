<template>
	<div class="mb-6">
		<div class="bg-white rounded-lg shadow border border-gray-200 p-4">
			<div class="flex items-center gap-3">
				<div class="flex-1">
					<label class="block text-sm font-medium text-gray-700 mb-2"> Barcode </label>
					<div class="flex gap-2">
						<input
							ref="inputRef"
							:value="modelValue"
							@input="$emit('update:modelValue', $event.target.value)"
							placeholder="Scan or enter barcode..."
							@keydown.enter="$emit('scan')"
							type="text"
							autocomplete="off"
							class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<Button
							@click="$emit('scan')"
							:disabled="!modelValue.trim()"
							variant="solid"
							theme="green"
						>
							<i class="fa fa-plus mr-2"></i>Add Item
						</Button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { Button } from "frappe-ui";
import { ref } from "vue";

export default {
	name: "BarcodeInput",
	components: { Button },
	props: {
		modelValue: String,
	},
	emits: ["update:modelValue", "scan"],
	setup() {
		const inputRef = ref(null);

		const focus = () => {
			if (inputRef.value) {
				inputRef.value.focus();
				inputRef.value.select();
			}
		};

		return {
			inputRef,
			focus,
		};
	},
};
</script>

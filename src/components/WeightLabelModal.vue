<template>
	<Dialog v-model="open" :options="{ size: 'xl', title: 'Weight Label' }">
		<template #body-content>
			<div class="space-y-4">
				<div class="grid grid-cols-12 gap-4">
					<div class="col-span-12">
						<label class="block text-sm text-gray-600 mb-1">Name</label>
						<Input :value="item.item_name" readonly />
					</div>
					<div class="col-span-6 sm:col-span-4">
						<label class="block text-sm text-gray-600 mb-1">Quantity (g/vnt.)</label>
						<Input
							v-model="weight"
							type="text"
							inputmode="numeric"
							variant="outline"
							@keydown.enter.prevent="print"
						/>
					</div>
					<div class="col-span-6 sm:col-span-4">
						<label class="block text-sm text-gray-600 mb-1"
							>Price per {{ item.stock_uom }}</label
						>
						<Input v-model="pricePerKg" type="number" step="0.01" disabled="true" />
					</div>
					<div class="col-span-6 sm:col-span-4">
						<label class="block text-sm text-gray-600 mb-1">Total Price</label>
						<Input :value="totalPrice.toFixed(2)" readonly />
					</div>
				</div>

				<div class="grid grid-cols-12 gap-4">
					<div class="col-span-12 sm:col-span-6 flex flex-col gap-3">
						<div>
							<label class="block text-sm text-gray-600 mb-1">Expiry Date</label>
							<Input v-model="expiryDate" type="date" />
						</div>
						<Checkbox
							class="mt-2"
							v-model="addManufacturer"
							:label="'Add manufacturer ' + (item.default_item_manufacturer || '')"
							v-if="item.default_item_manufacturer"
						/>
						<Checkbox class="mt-2" v-model="addPackageFee" label="Add package fee" />
						<!-- TODO: show an error/disable if the settings are not set -->
					</div>
					<div class="col-span-12 sm:col-span-6" v-if="showKeypad">
						<div class="grid grid-cols-3 gap-2">
							<Button
								class="key py-5"
								v-for="n in ['7', '8', '9', '4', '5', '6', '1', '2', '3']"
								:key="n"
								@click="key(n)"
								>{{ n }}</Button
							>
							<Button class="key py-5" @click="key('0')">0</Button>
							<Button class="key py-5" appearance="subtle" @click="key('c')"
								>C</Button
							>
							<Button class="key py-5" appearance="danger" @click="key('d')"
								>⌫</Button
							>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #actions="{ close }">
			<div class="flex justify-end gap-2">
				<Button @click="close" variant="outline">Close</Button>
				<Button
					@click="print"
					:loading="printing"
					:disabled="!canPrint"
					variant="solid"
					theme="blue"
				>
					<i class="fa fa-print mr-1" /> Print
				</Button>
			</div>
		</template>
	</Dialog>
</template>

<script>
import { Dialog, Input, Button, Checkbox } from "frappe-ui";
import { ref, computed, watch, onMounted } from "vue";
import { getSettingsService } from "../api/settings";
import { LabelGenerator } from "./../helpers/labelGenerator";
import { toast } from "./../helpers/toast";
export default {
	name: "WeightLabelModal",
	components: { Dialog, Input, Button, Checkbox },
	props: {
		modelValue: { type: Boolean, default: false },
		item: { type: Object, required: true },
	},
	emits: ["update:modelValue", "printed"],
	setup(props, { emit }) {
		const settings = getSettingsService();

		console.log("WeightLabelModal setup - initial modelValue:", props.modelValue);
		console.log("WeightLabelModal setup - item:", props.item);

		const open = computed({
			get: () => {
				console.log("open getter - modelValue:", props.modelValue);
				return props.modelValue;
			},
			set: (v) => {
				console.log("open setter - emitting update:modelValue:", v);
				emit("update:modelValue", v);
			},
		});
		const weight = ref(""); // grams
		const expiryDate = ref("");
		const addManufacturer = ref(false);
		const addPackageFee = ref(true);
		const printing = ref(false);
		const pricePerKg = ref(props.item.standard_rate || 0);

		// Determine if we need to convert grams to kg based on stock UOM
		const isKgUom = computed(() => {
			return String(props.item.stock_uom || "")
				.toLowerCase()
				.includes("kg");
		});

		const warnedLarge = ref(false);

		const quantity = computed(() => {
			const g = Number((weight.value || "").replace(/[^0-9]/g, ""));
			const base = isFinite(g) ? (isKgUom.value ? g / 1000 : g) : 0;

			if (base >= 10) {
				if (!warnedLarge.value) {
					warnedLarge.value = true;
					toast({
						title: "Quantity too large",
						text: "Value is 10 or more — reset to 0",
						icon: "x",
						variant: "warning",
					});
				}
				return 0;
			} else {
				warnedLarge.value = false;
				return base;
			}
		});
		const canPrint = computed(() => quantity.value > 0);

		const totalPrice = computed(() => {
			return quantity.value * Number(pricePerKg.value || 0);
		});

		const showKeypad = ref(true);

		function key(k) {
			if (k === "c") {
				weight.value = "";
			} else if (k === "d") {
				weight.value = (weight.value || "").slice(0, -1);
			} else if (/^[0-9]$/.test(k)) {
				weight.value = `${weight.value || ""}${k}`;
			}
		}
		function close() {
			console.log("close() called - setting open to false");
			open.value = false;
		}

		async function print() {
			try {
				printing.value = true;
				const cfg = await settings.get();
				if (!cfg?.default_label_type) throw new Error("Default label type not configured");
				// await labels.printPackagedLabel({
				//   item_code: props.item.item_code,
				//   label_type: cfg.default_label_type,
				//   weight_g: Number(weight.value || 0),
				//   expiry_date: expiryDate.value || undefined,
				//   add_manufacturer: addManufacturer.value || false,
				//   add_package_fee: addPackageFee.value || false,
				// })
				const item_to_print = {
					// item_code: props.item.item_code,
					...props.item,
					total_price: totalPrice.value,
					weight: isKgUom.value
						? Number(weight.value || 0) / 1000
						: Number(weight.value || 0),
					expiry_date: expiryDate.value || undefined,
					add_manufacturer: addManufacturer.value || false,
					add_package_fee: addPackageFee.value || false,
				};
				new LabelGenerator([item_to_print]);

				toast({ title: "Label sent to printer", icon: "check" });
				emit("printed", { item_code: props.item.item_code });
			} catch (e) {
				console.error(e);
				toast({
					title: "Print failed",
					text: String(e?.message || e),
					icon: "x",
					variant: "warning",
				});
			} finally {
				printing.value = false;
			}
		}

		watch(
			open,
			(v) => {
				console.log("watch(open) triggered - new value:", v);
				if (v) {
					// reset per-open
					weight.value = "";
					expiryDate.value = "";
					pricePerKg.value = props.item?.standard_rate || 0;
					addManufacturer.value = false;
					addPackageFee.value = true;
					console.log("open is true - form reset, item:", props.item);
				}
			},
			{ immediate: true }
		);

		// Watch for item changes to update pricePerKg
		watch(
			() => props.item,
			(newItem) => {
				console.log("item changed:", newItem);
				if (open.value) {
					pricePerKg.value = newItem?.standard_rate || 0;
				}
			},
			{ deep: true }
		);

		const dialogTitle = computed(() => {
			return "Weight Label";
		});

		// Create a computed property for item to ensure reactivity
		const item = computed(() => props.item);

		onMounted(() => {
			console.log("WeightLabelModal mounted");
			console.log("open value:", open.value);
			console.log("item:", props.item);
		});

		return {
			open,
			weight,
			expiryDate,
			addManufacturer,
			addPackageFee,
			printing,
			canPrint,
			showKeypad,
			pricePerKg,
			totalPrice,
			isKgUom,
			quantity,
			key,
			close,
			print,
			dialogTitle,
			item,
		};
	},
};
</script>

<style scoped></style>

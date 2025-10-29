frappe.pages["label_maker_settings"] = {
	on_page_load: function (wrapper) {
		const page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Label Maker Settings"),
			single_column: true,
		});

		const $body = $(page.body);
		const $form = $('<div class="form-layout form-layout-horizontal"/>').appendTo($body);
		const $section = $('<div class="form-section">').appendTo($form);
		const $fields = $('<div class="form-fields">').appendTo($section);

		const state = { values: {} };

		const controls = {};
		function make_control(df) {
			const wrapper = $('<div class="frappe-control"/>').appendTo($fields);
			const c = frappe.ui.form.make_control({
				df,
				parent: wrapper,
				render_input: true,
				only_input: false,
			});
			c.refresh();
			controls[df.fieldname] = c;
			return c;
		}

		make_control({
			fieldname: "default_label_type",
			label: __("Default Label Type"),
			fieldtype: "Link",
			options: "Label Type",
		});
		make_control({
			fieldname: "package_item",
			label: __("Package Item"),
			fieldtype: "Link",
			options: "Item",
		});
		make_control({
			fieldname: "ws_address",
			label: __("WebSocket Address"),
			fieldtype: "Data",
		});
		make_control({
			fieldname: "tts_api_key",
			label: __("TTS API Key"),
			fieldtype: "Password",
		});

		const $actions = $('<div class="mt-3"/>').appendTo($body);
		const $save = $('<button class="btn btn-primary">' + __("Save") + "</button>").appendTo(
			$actions
		);

		function load_values() {
			frappe.call({
				method: "frappe.client.get_value",
				args: {
					doctype: "Label Maker Settings",
					fieldname: ["default_label_type", "package_item", "ws_address", "tts_api_key"],
				},
				callback: (r) => {
					const values = (r.message || {})["Label Maker Settings"] || r.message || {};
					state.values = values || {};
					Object.keys(controls).forEach((f) => controls[f].set_value(values[f] || ""));
				},
			});
		}

		function save_values() {
			const data = {};
			Object.keys(controls).forEach((f) => (data[f] = controls[f].get_value()));
			frappe.call({
				method: "frappe.client.set_value",
				args: {
					doctype: "Label Maker Settings",
					name: "Label Maker Settings",
					fieldname: data,
				},
				callback: (r) => {
					if (!r.exc) {
						frappe.show_alert({ message: __("Settings Saved"), indicator: "green" });
					}
				},
			});
		}

		$save.on("click", () => save_values());
		load_values();
	},
};

frappe.pages["labels"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Labels",
		single_column: true,
	});

	page.set_primary_action("Open Label Maker", () => {
		window.location.href = "/labels";
	});

	const user_language = window.navigator.language.split("-")[0] == "en" ? "" : "_lt";
	const logo_src = `/assets/label_maker/logo${user_language}.svg`;

	const content = $(`
		<div class="my-5 text-center">
			<img src="${logo_src}" alt="Label Maker Logo" style="width: 150px; height: auto;"/>
			<p>Click the button above to open the Label Maker application.</p>
		</div>
	`);
	page.body.append(content);
};

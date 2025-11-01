import "./app.scss";

import { createApp } from "vue";
import App from "./App.vue";
import i18n from "./locales/i18n";

import { Button, setConfig, frappeRequest, resourcesPlugin } from "frappe-ui";

const mount = () => {
	const el = document.querySelector("#app");
	console.log("[Label Maker] mount() called");
	if (!el) {
		console.warn("[Label Maker] #app element not found, cannot mount");
		return;
	}
	const app = createApp(App);
	setConfig("resourceFetcher", frappeRequest);
	app.use(resourcesPlugin);
	app.component("Button", Button);
	app.use(i18n);
	app.mount(el);
};

console.log("[Label Maker] main.js loaded");

// Expose mount function for page-level loaders
window.LabelMakerMount = mount;
// check if the page has frappe or is it just standalone
if (!window.frappe) {
	console.log("[Label Maker] No frappe detected, mounting immediately");
	mount();
}

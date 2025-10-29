import "./app.scss";

import { createApp } from "vue";
import App from "./App.vue";

import { Button, setConfig, frappeRequest, resourcesPlugin } from "frappe-ui";

const mount = () => {
	const el = document.querySelector("#app");
	console.log("[Label Maker] mount() called, element found:", !!el);
	if (!el) {
		console.warn("[Label Maker] #app element not found, cannot mount");
		return;
	}
	const app = createApp(App);
	console.log("[Label Maker] Creating Vue app");
	setConfig("resourceFetcher", frappeRequest);
	app.use(resourcesPlugin);
	app.component("Button", Button);
	console.log("[Label Maker] Mounting to #app");
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

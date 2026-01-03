import frappeUiPreset from "./node_modules/frappe-ui/src/tailwind/preset.js";

export default {
  presets: [frappeUiPreset],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    // Scan frappe-ui source files for class names
    "./node_modules/frappe-ui/src/**/*.{vue,js,ts,jsx,tsx}",
    // Also scan the built frappe-ui components if they exist
    "./node_modules/frappe-ui/frappe/**/*.{vue,js,ts,jsx,tsx}",
    // Scan grid-layout-plus components
    "./node_modules/grid-layout-plus/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  // Safelist Frappe UI component classes that need to be included
  safelist: [
    "form-input",
    "form-textarea",
    "form-select",
    "form-checkbox",
    "w-72",
    "border-gray-400",
    "placeholder-gray-500",
    "h-7",
    "rounded",
    "border",
    "py-1.5",
    "pl-2",
    "pr-2",
    "text-base",
    "transition-colors",
  ],
};

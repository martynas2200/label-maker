import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";
import path from "path";
import fs from "fs";

const setupWwwPlugin = () => {
	return {
		name: "setup-www",
		writeBundle() {
			// Copy built index.html from public outDir to www/labels.html
			const builtHtml = path.resolve(
				__dirname,
				"label_maker/public/labels_assets/index.html"
			);
			const wwwDir = path.resolve(__dirname, "label_maker/www");
			const targetHtml = path.join(wwwDir, "labels.html");

			console.log("[setup-www] builtHtml:", builtHtml);
			console.log("[setup-www] wwwDir:", wwwDir);
			console.log("[setup-www] targetHtml:", targetHtml);

			if (!fs.existsSync(builtHtml)) {
				return;
			}

			try {
				console.log("[setup-www] Found built index.html, preparing to copy...");
				if (!fs.existsSync(wwwDir)) {
					console.log("[setup-www] www directory does not exist, creating...");
					fs.mkdirSync(wwwDir, { recursive: true });
				}
				console.log("[setup-www] Reading built HTML...");
				const html = fs.readFileSync(builtHtml, "utf-8");
				console.log("[setup-www] Writing HTML to:", targetHtml);
				fs.writeFileSync(targetHtml, html);
				console.log("[setup-www] ✓ Created www/labels.html");
				console.log("[setup-www] Removing original built index.html:", builtHtml);
				fs.unlinkSync(builtHtml); // Remove it after copying
			} catch (err) {
				console.error("[setup-www] ✗ Failed to set up www/labels.html:", err);
			}
		},
	};
};

export default defineConfig(({ command }) => ({
	plugins: [
		vue(),
		Icons({
			compiler: "vue3",
			autoInstall: true,
			defaultClass: "lucide",
			defaultCollection: "lucide",
		}),
		setupWwwPlugin(),
	],
	resolve: {},
	base: command === "build" ? "/assets/label_maker/labels_assets/" : "/",
	css: {
		postcss: "./postcss.config.js",
	},
	optimizeDeps: {
		// Ensure proper ESM interop for dependencies used by frappe-ui
		include: [
			"showdown",
			"engine.io-client",
			"highlight.js/lib/core",
			"highlight.js/lib/common",
			"interactjs",
		],
		esbuildOptions: {
			define: {
				global: "globalThis",
			},
		},
	},
	server: {
		proxy: {
			"/api": {
				target: "http://test.local:8000",
				changeOrigin: true,
			},
		},
	},
	build: {
		// Build directly into public so Frappe serves assets at /assets/label_maker/labels_assets
		outDir: "label_maker/public/labels_assets",
		assetsDir: "assets",
		emptyOutDir: true,
		cssCodeSplit: false,
		rollupOptions: {
			output: {
				// Use simple names for main entry files
				entryFileNames: "assets/[name].js",
				chunkFileNames: "assets/[name].js",
				assetFileNames: "assets/[name].[ext]",
			},
		},
	},
}));

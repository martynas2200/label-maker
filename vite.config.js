import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";
import path from "path";
import fs from "fs";

// Plugin to rename and move the HTML file after build
const setupWwwPlugin = () => {
	return {
		name: "setup-www",
		closeBundle() {
			// Move index.html to labels.html at www root
			const builtHtml = path.resolve(__dirname, "label_maker/www/_build/index.html");
			const targetHtml = path.resolve(__dirname, "label_maker/www/labels.html");

			if (fs.existsSync(builtHtml)) {
				let html = fs.readFileSync(builtHtml, "utf-8");
				// Fix asset paths from /_build/assets/ to /labels_assets/
				// Use regex to handle query parameters
				html = html.replace(/\/_build\/assets\//g, "/labels_assets/");
				fs.writeFileSync(targetHtml, html);
				console.log("✓ Created www/labels.html");
			}

			// Also update CSS files to fix font references
			const assetsSource = path.resolve(__dirname, "label_maker/www/_build/assets");
			if (fs.existsSync(assetsSource)) {
				const cssFiles = fs.readdirSync(assetsSource).filter((f) => f.endsWith(".css"));
				cssFiles.forEach((cssFile) => {
					const cssPath = path.join(assetsSource, cssFile);
					let css = fs.readFileSync(cssPath, "utf-8");
					// Replace /_build/assets/ with /labels_assets/ in CSS
					css = css.replace(/\/_build\/assets\//g, "/labels_assets/");
					fs.writeFileSync(cssPath, css);
					console.log(`✓ Updated asset paths in ${cssFile}`);
				});
			}

			// Move assets folder to labels_assets at www root
			const assetsTarget = path.resolve(__dirname, "label_maker/www/labels_assets");

			if (fs.existsSync(assetsSource)) {
				// Remove old assets if exists
				if (fs.existsSync(assetsTarget)) {
					fs.rmSync(assetsTarget, { recursive: true });
				}
				// Move assets
				fs.renameSync(assetsSource, assetsTarget);
				console.log("✓ Moved assets to www/labels_assets");
			}

			// Clean up _build directory
			const buildDir = path.resolve(__dirname, "label_maker/www/_build");
			if (fs.existsSync(buildDir)) {
				fs.rmSync(buildDir, { recursive: true });
				console.log("✓ Cleaned up temporary build directory");
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
	// Use /_build/ as base during build (will be rewritten by plugin)
	base: command === "build" ? "/_build/" : "/",
	css: {
		postcss: "./postcss.config.js",
	},
	optimizeDeps: {
		// Ensure proper ESM interop for dependencies used by frappe-ui
		include: [
			"showdown",
			"engine.io-client",
			// Pre-bundle highlight.js entrypoints used by lowlight to force ESM resolution
			"highlight.js/lib/core",
			"highlight.js/lib/common",
			// Pre-bundle interactjs to handle ESM interop for grid-layout-plus
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
		outDir: "label_maker/www/_build",
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

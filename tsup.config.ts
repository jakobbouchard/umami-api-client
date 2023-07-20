import { defineConfig, type Options } from "tsup";

export default defineConfig((options) => {
	return {
		name: "Umami API Client",
		entry: { index: "src/umami-api-client.ts" },
		target: "es2021",
		platform: "neutral",
		format: ["cjs", "esm"],
		dts: true,
		sourcemap: true,
		clean: true,
		minify: !options.watch,
	} satisfies Options;
});

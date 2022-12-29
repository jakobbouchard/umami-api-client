import { defineConfig } from "tsup";

export default defineConfig((options) => {
	return {
		entry: ["src/index.ts"],
		target: "node16",
		format: ["cjs", "esm"],
		dts: true,
		sourcemap: true,
		clean: true,
		minify: !options.watch,
	};
});

/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	printWidth: 100,
	trailingComma: "all",
	overrides: [
		{
			files: "*.yml",
			options: { useTabs: false },
		},
	],
};

module.exports = config;

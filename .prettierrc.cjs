/** @type {import("prettier").Config} */
module.exports = {
	endOfLine: "lf",
	printWidth: 100,
	trailingComma: "all",
	useTabs: true,
	overrides: [
		{
			files: "*.yml",
			options: { useTabs: false },
		},
	],
};

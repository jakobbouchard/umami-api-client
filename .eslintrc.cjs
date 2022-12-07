const config = {
	root: true,
	parser: "@typescript-eslint/parser",
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
	plugins: ["@typescript-eslint"],
	parserOptions: {
		sourceType: "module",
	},
	env: {
		es2020: true,
		node: true,
	},
};

module.exports = config;

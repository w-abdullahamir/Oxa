module.exports = function (api) {
	api.cache(true);
	return {
		presets: ["babel-preset-expo"],
		plugins: [
			["module-resolver", { root: ["./"], alias: { "@": "./" } }],
			//[
			//	"module:react-native-dotenv",
			//	{
			//		moduleName: "@env",
			//		path: ".env",
			//		blacklist: null,
			//		whitelist: null,
			//		safe: false,
			//		allowUndefined: true,
			//	},
			//],
		],
	};
};

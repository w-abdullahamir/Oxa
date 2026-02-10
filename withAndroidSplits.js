const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withAndroidSplits(config) {
	return withAppBuildGradle(config, (config) => {
		if (config.modResults.language === "groovy") {
			const splitsBlock = `
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a"
            universalApk false
        }
    }`;
			// Injects the splits block into the android {} section of build.gradle
			config.modResults.contents = config.modResults.contents.replace(
				/android\s?{/,
				`android {${splitsBlock}`
			);
		}
		return config;
	});
};

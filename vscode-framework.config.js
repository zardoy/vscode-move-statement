//@ts-check

/** @type{import('vscode-framework/build/config').UserConfig} */
const config = {
    extendPropsGenerators: [
        ({ generatedManifest }) => {
            // @ts-ignore
            const { properties } = generatedManifest.contributes.configuration
            properties['moveStatement.rejectDifferentKinds'].scope =
                properties['moveStatement.builtinCommaHandling.enabled'].scope =
                properties['moveStatement.supportedKinds'].scope =
                    'language-overridable'
            return {}
        },
    ],
    consoleStatements: false,
    target: {
        desktop: true,
        web: true,
    },
    esbuild: {
        production: {
            defineEnv: {
                EXTENSION_BOOTSTRAP_CONFIG: 'null',
            },
        },
    },
}

module.exports = config

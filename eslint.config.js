import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import stylistic from '@stylistic/eslint-plugin';
// import * as parser from '@typescript-eslint/parser';

export default [
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...pluginVue.configs['flat/vue2-recommended'],
    {
        plugins: {
            'typescript-eslint': tseslint.plugin,
        },
        languageOptions: {
            parserOptions: {
                //parser: "@typescript-eslint/parser",
                parser: tseslint.parser,
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                extraFileExtensions: ['.vue'],
                sourceType: 'module',
            },
        },
    },
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/electron/app/**',
        ]
    },
    {
        //files: [ '*.ts', '*.tsx', '*.js', '*.jsx', '*.vue' ],
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            "@typescript-eslint/no-confusing-void-expression": [
                "error", {
                    "ignoreVoidReturningFunctions": true
                }
            ],
            '@stylistic/indent': ['error', 4],
            '@stylistic/quotes': ['warn', 'single'],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/brace-style': ['error', 'stroustrup'],

            // 'arrow-spacing': [
            //     'warn', {
            //         before: true,
            //         after: true
            //     }
            // ],
            // 'comma-dangle': [
            //     'error', {
            //         arrays: 'only-multiline',
            //         objects: 'only-multiline',
            //     }
            // ],
            // 'comma-spacing': [
            //     'warn', {
            //         before: false,
            //         after: true
            //     }
            // ],
            //...tseslint.rules
        },
    },
]

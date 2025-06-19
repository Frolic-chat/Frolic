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
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/electron/app/**',
            './webpack.js',
            './electron/webpack.config.js',
        ],
    },
    {
        files: [ '**/*.js' ],
        ...tseslint.configs.disableTypeChecked,
    },
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
    {   // Modifications to default rules.
        rules: {
            "@typescript-eslint/no-confusing-void-expression": [
                "error", {
                    "ignoreVoidReturningFunctions": true
                }
            ],
            "@typescript-eslint/restrict-template-expressions": [ "error", {
                allow: [{ name: ['URL', 'URLSearchParams'], from: 'lib' }],
                allowAny:       false,
                allowArray:     true,
                allowBoolean:   true,
                allowNever:     false,
                allowNullish:   true,
                allowNumber:    true,
                allowRegExp:    true,
            }],
        },
    },
    {   // Modifications to default rules.
        rules: {
            'vue/max-attributes-per-line': 'off',
        },
    },
    {
        //files: [ '*.ts', '*.tsx', '*.js', '*.jsx', '*.vue' ],
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            '@stylistic/indent': ['error', 4],
            '@stylistic/quotes': ['warn', 'single'],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/brace-style': ['error', 'stroustrup'],

            'arrow-spacing': [
                'warn', { before: true, after: true },
            ],
            'comma-dangle': [
                'error', {
                    arrays:  'only-multiline',
                    objects: 'only-multiline',
                    imports: 'only-multiline',
                }
            ],
            'comma-spacing': [
                'warn', { before: false, after: true },
            ],
        },
    },
]

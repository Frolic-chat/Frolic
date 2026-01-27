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
            '**/electron/dist/**',
            '**/electron/app/**',
        ]
    },
    {
        plugins: {
            '@stylistic': stylistic,
        },
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                extraFileExtensions: ['.vue'],
                sourceType: 'module',
            },
        },
    },
    {   // Vue rules
        rules: {
            'vue/max-attributes-per-line': 'off',
        },
    },
    {
        //files: [ '*.ts', '*.tsx', '*.js', '*.jsx', '*.vue' ],
        rules: {
            '@stylistic/semi': [
                'error',
                'always',
            ],
            '@stylistic/brace-style': [
                'error',
                'stroustrup',
            ],
            '@stylistic/indent': [
                'warn',
                4, {
                    // SwitchCase: 0, // default
                    FunctionDeclaration: {
                        parameters: "first",
                        returnType: 0,
                    },
                    FunctionExpression: {
                        parameters: "first",
                        returnType: 0,
                    },
                },
            ],
            '@typescript-eslint/naming-convention': [
                'warn',
                { selector: 'classicAccessor', format: [ 'camelCase' ] },
                { selector: 'autoAccessor', format: [ 'camelCase' ] },
                { selector: 'class', format: [ 'PascalCase' ] },
                { selector: 'classMethod', format: [ 'camelCase' ] },
                { selector: 'classProperty', format: [ 'camelCase' ] },
                { selector: 'enum', format: [ 'PascalCase' ] },
                { selector: 'enumMember', format: [ 'PascalCase' ] },
                { selector: 'function', format: [ 'camelCase' ], modifiers: [ 'exported' ] },
                { selector: 'import', format: [ 'PascalCase' ] },
                {
                    selector: 'import',
                    format: [ 'camelCase' ],
                    filter: {
                        match: true,
                        regex: '^(?:l|core)$',
                    },
                },
                { selector: 'interface', format: [ 'PascalCase' ] },
                {   // Allow some privates to be underscore-led versions of same public variable.
                    selector: [ 'classicAccessor', 'autoAccessor', 'classMethod', 'classProperty', 'parameterProperty' ],
                    modifiers: [ 'private' ],
                    format: [ 'camelCase' ],
                    leadingUnderscore: 'allow'
                },
                { selector: 'objectLiteralMethod', format: [ 'camelCase' ] },
                {   // Should be: camelCase, but note system uses snake_case and we're okay with storing the variable names as they are fed to us by API.
                    selector: 'objectLiteralProperty',
                    format: [ 'camelCase', 'snake_case' ],
                },
                { selector: 'parameter', format: [ 'camelCase' ] },
                { selector: 'parameter', format: [ 'camelCase' ], modifiers: [ 'unused' ], leadingUnderscore: 'require' },
                { selector: 'parameterProperty', format: [ 'camelCase' ] },
                { selector: 'typeAlias', format: [ 'PascalCase' ] },
                { selector: 'typeMethod', format: [ 'camelCase' ] },
                { selector: 'typeParameter', format: [ 'PascalCase' ] },
                { selector: 'variable', format: [ 'snake_case' ] },
                { selector: 'variable', format: [ 'camelCase' ], modifiers: [ 'exported' ] },
                {   // hard CONST
                    selector: 'variable',
                    format: [ 'UPPER_CASE' ],
                    modifiers: [ 'const' ],
                    types: [ 'boolean', 'number', 'string', ],
                },
                {   // destructuring allowed for anything
                    selector: 'variable',
                    format: null,
                    modifiers: [ 'destructured' ],
                },
                {   // HTTP header variables
                    selector: [
                        "classProperty",
                        "objectLiteralProperty",
                        "typeProperty",
                        "classMethod",
                        "objectLiteralMethod",
                        "typeMethod",
                        "accessor",
                        "enumMember",
                    ],
                    format: null,
                    modifiers: [ 'requiresQuotes' ],
                },
            ],
            '@stylistic/quotes': [
                'warn',
                "single", {
                    avoidEscape: true,
                    allowTemplateLiterals: "avoidEscape",
                }
            ],

            // Multiline stuff
            'curly': [ // not @stylistic
                'warn',
                'multi-or-nest',
                'consistent',
            ],
            '@stylistic/array-element-newline': [
                'warn', {
                    multiline: true,
                    minItems: 5,
                }
            ],
            '@stylistic/object-property-newline': [
                'warn', {
                    allowAllPropertiesOnSameLine: true,
                }
            ],
            '@stylistic/array-bracket-newline': [
                'warn', {
                    multiline: true,
                }
            ],
            '@stylistic/object-curly-newline': [
                'warn', {
                    ObjectExpression: { multiline: true, consistent: true },
                    ObjectPattern: { multiline: false, consistent: true },
                }
            ],
            '@stylistic/comma-dangle': [
                'warn', {
                    arrays: 'always-multiline',
                    objects: 'always-multiline',
                }
            ],
            '@stylistic/key-spacing': [
                'warn', {
                    align: {
                        beforeColon: false,
                        afterColon: true,
                        on: 'value',
                        mode: 'minimum',
                    }
                }
            ],
            // 'member-delimeter-style': [
            //     'warn', {

            //     }
            // ],

            // Single line stuff
            '@stylistic/array-bracket-spacing': [
                'warn',
                'always', {
                    objectsInArrays: false,
                }
            ],
            // 'arrow-spacing': [
            //     'warn', {
            //         before: true,
            //         after: true
            //     }
            // ],
            // 'comma-spacing': [
            //     'warn', {
            //         before: false,
            //         after: true
            //     }
            // ],

            // Normal stuff
            '@stylistic/keyword-spacing': [
                "warn", {
                    before: true,
                    after: true,
                },
            ],

            // Strange stuff
            'prefer-promise-reject-errors': 'off',
            '@typescript-eslint/prefer-promise-reject-errors': [
                // Turn on when I can allow throwing DOMExceptions
                'off', {
                    allowThrowingAny: false,
                    allowThrowingUnknown: false,
                }
            ],
            "@typescript-eslint/no-confusing-void-expression": [
                "error", {
                    ignoreArrowShorthand: true,
                    ignoreVoidOperator: true,
                    ignoreVoidReturningFunctions: true,
                }
            ],
            "@typescript-eslint/restrict-template-expressions": [
                "error", {
                    allow: [{
                        name: ['URL', 'URLSearchParams'],
                        from: 'lib',
                    }] ,
                    allowAny:       false,
                    allowArray:     true,
                    allowBoolean:   true,
                    allowNever:     false,
                    allowNullish:   true,
                    allowNumber:    true,
                    allowRegExp:    true,
                }
            ],
        },
    },
]

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import stylistic from '@stylistic/eslint-plugin';

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
            globals: {
                window: "readonly",
                document: "readonly",
            }
        },
    },
    {   // Vue rules
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
                tsconfigRootDir: import.meta.dirname,
                sourceType: 'module',
            },
            globals: {
                window: "readonly",
                document: "readonly",
            }
        },
        rules: {
            // Typescript bad at vue
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',

            'vue/html-indent': [
                'warn',
                2, {
                    baseIndent: 0,
                    attribute: 2,
                    alignAttributesVertically: false,
                }
            ],
            'vue/max-attributes-per-line': 'off',
            'vue/html-self-closing': 'off',
            'vue/max-len': 'off',
            'vue/first-attribute-linebreak': 'off',
            'vue/html-closing-bracket-newline': [
                'warn', {
                    singleline: 'never',
                    multiline: 'always',
                    selfClosingTag: {
                        singleline: 'never',
                        multiline: 'always',
                    },
                },
            ],
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
                    SwitchCase: 0,
                },
            ],
            '@typescript-eslint/naming-convention': [
                'warn',
                { selector: 'classicAccessor', format: [ 'camelCase' ] },
                { selector: 'autoAccessor', format: [ 'camelCase' ] },
                { selector: 'class', format: [ 'PascalCase' ] },
                { selector: 'classMethod', format: [ 'camelCase' ] },
                { selector: 'classProperty', format: [ 'camelCase' ], leadingUnderscore: 'allow' },
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
                { selector: 'parameter', format: [ 'camelCase' ], leadingUnderscore: 'allow' },
                { selector: 'parameter', format: [ 'camelCase' ], modifiers: [ 'unused' ], leadingUnderscore: 'require' },
                { selector: 'parameterProperty', format: [ 'camelCase' ] },
                { selector: 'typeAlias', format: [ 'PascalCase' ] },
                { selector: 'typeMethod', format: [ 'camelCase' ] },
                { selector: 'typeParameter', format: [ 'PascalCase' ] },
                // Should be snake_case for locals, but can't declare locals only.
                { selector: 'variable', format: [ 'camelCase', 'snake_case' ] },
                { selector: 'variable', format: [ 'camelCase' ], modifiers: [ 'exported' ] },
                {   // hard CONST
                    selector: 'variable',
                    // Should be UPPER_CASE but some local and object entries use camel/snake
                    format: [ 'UPPER_CASE', 'camelCase', 'snake_case' ],
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
            '@stylistic/nonblock-statement-body-position': [
                'warn',
                'below',
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
                    arrays:  'always-multiline',
                    objects: 'always-multiline',
                    imports: 'always-multiline',
                    exports: 'always-multiline',
                    enums:   'always-multiline',
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
            '@stylistic/object-curly-spacing': [
                'warn',
                'always', {
                    // Matches [key: string] :<
                    // arraysInObjects:  false,
                    objectsInObjects: false,
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

            // Type checking stuff
            // "@typescript-eslint/no-unsafe-member-access": [
            //     'warn', {
            //         allowOptionalChaining: true,
            //     },
            // ],
            "@typescript-eslint/consistent-type-imports": [
                'error', {
                    disallowTypeAnnotations: true,
                    fixStyle: 'separate-type-imports',
                    prefer: 'type-imports',
                },
            ],

            // Strange stuff
            //'prefer-promise-reject-errors': 'off',
            '@typescript-eslint/prefer-promise-reject-errors': [
                // Turn on when I can allow throwing DOMExceptions
                'off', {
                    allowThrowingAny: false,
                    allowThrowingUnknown: false,
                }
            ],
            // Love this.
            "@typescript-eslint/no-confusing-void-expression": [
                "error", {
                    ignoreArrowShorthand: true,
                    ignoreVoidOperator: true,
                    ignoreVoidReturningFunctions: true,
                }
            ],
            "@typescript-eslint/no-redundant-type-constituents": "off",
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

            // Pointless - TS overlap.
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unused-vars": "off",

            // Cruft because legacy codebase
            "@typescript-eslint/no-namespace": "off",

            // ??
            "@typescript-eslint/no-empty-object-type": "off",
        },
    },
]

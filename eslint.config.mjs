import { defineConfig } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:prettier/recommended",
    ),

    plugins: {
        "@typescript-eslint": typescriptEslint,
        prettier,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",

        parserOptions: {
            project: "tsconfig.json",

            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    settings: {
        "import/resolver": {
            typescript: {},
        },
    },

    rules: {
        "no-undef": 0,
        semi: 0,
        "no-void": 0,
        "no-shadow": 0,
        "comma-dangle": 0,
        camelcase: 0,
        "no-use-before-define": 0,
        "no-unneeded-ternary": 0,
        "no-restricted-globals": 0,
        "consistent-return": 0,
        "max-len": 0,
        "no-else-return": 0,
        "arrow-body-style": 0,
        "arrow-parens": 0,
        "func-names": 0,
        "global-require": 0,
        "no-underscore-dangle": 0,
        "no-bitwise": 0,
        "object-curly-newline": 0,
        "no-unused-vars": 0,
        "linebreak-style": 0,
        "import/no-extraneous-dependencies": 0,
        "import/prefer-default-export": 0,
        "import/no-dynamic-require": 0,
        "import/no-unresolved": 0,
        "import/extensions": 0,
        "@typescript-eslint/interface-name-prefix": 0,
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/no-empty-interface": 0,
        "@typescript-eslint/no-explicit-any": 0,
        "@typescript-eslint/explicit-module-boundary-types": 0,

        "@typescript-eslint/no-unused-vars": [1, {
            argsIgnorePattern: "^_",
        }],
    },
}]);
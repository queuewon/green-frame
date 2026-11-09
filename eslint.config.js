import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    {
        files: ['**/*.js'],
        languageOptions: {
            globals: globals.node,
        },
        rules: js.configs.recommended.rules,
    },
    eslintConfigPrettier,
];

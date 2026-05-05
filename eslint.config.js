import pluginVue from 'eslint-plugin-vue';
import vueTsConfig from '@vue/eslint-config-typescript';
import prettierConfig from '@vue/eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        name: 'app/files-to-lint',
        files: ['**/*.{ts,mts,tsx,vue}'],
    },
    {
        name: 'app/files-to-ignore',
        ignores: ['**/dist/**', '**/node_modules/**', '**/releases/**', 'src/shared/ct-types.d.ts'],
    },
    ...pluginVue.configs['flat/recommended'],
    ...vueTsConfig(),
    prettierConfig,
];

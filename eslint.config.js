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
    {
        name: 'app/rules',
        rules: {
            // Page-level components (Admin, Gate, Dashboard, App) are never
            // going to clash with native HTML elements; the warning adds
            // noise without value.
            'vue/multi-word-component-names': 'off',
        },
    },
];

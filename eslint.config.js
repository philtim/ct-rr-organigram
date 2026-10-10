import pluginVue from 'eslint-plugin-vue';
import vueTsConfig from '@vue/eslint-config-typescript';
import prettierConfig from '@vue/eslint-config-prettier';

const FEATURES = ['admin', 'beitraege', 'dashboard', 'jahresmeldung'];

/**
 * ADR-004: feature folders never import from each other, and `shared/` never
 * imports from a feature. Written down in the ADR and still broken three times;
 * enforced here so the next break fails the lint instead of the review.
 * `App.vue`, the shell that composes the features, is the one exception.
 */
function boundary(folder) {
    const forbidden = FEATURES.filter((f) => f !== folder);
    return {
        name: `app/boundary-${folder}`,
        files: [`src/${folder}/**/*.{ts,vue}`],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: forbidden.map((f) => ({
                        group: [`@/${f}/*`, `../${f}/*`],
                        message: `ADR-004: ${folder}/ must not import from ${f}/ — move what both need to shared/.`,
                    })),
                },
            ],
        },
    };
}

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        name: 'app/files-to-lint',
        files: ['**/*.{ts,mts,tsx,vue}'],
    },
    {
        name: 'app/files-to-ignore',
        ignores: ['**/dist/**', '**/node_modules/**', '**/releases/**'],
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
    ...['shared', ...FEATURES].map(boundary),
];

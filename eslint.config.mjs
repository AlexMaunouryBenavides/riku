// Couche 1 (zéro-token) — règles kit "Vérifié par: eslint", enforced gratuitement.
// Base agnostique : TypeScript + garde-fous clean-code structurels,
// puis une couche React ciblée sur apps/web (react-hooks, jsx-a11y).
// Les configs générées par `nest new` et `create-vite` ont été supprimées :
// une seule source de vérité pour le lint, à la racine.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    // On ne lint que notre code (apps/, packages/). On exclut les dépendances,
    // les sorties de build, et la doc/bibliothèque de règles (qui a sa propre
    // config eslint starter vide → sinon warning "empty config").
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      'kit/**',
      'conception/**',
      'docs/**',
      'openspec/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // clean-code.r3 — fonctions petites, une seule chose (seuils indicatifs → warn).
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 10],
      // clean-code.r4 — peu d'arguments (0-2 visé, 3 à éviter → warn au-delà de 3).
      'max-params': ['warn', 4],
    },
  },

  // ─── Couche React — apps/web uniquement ────────────────────────────────────
  // react.r1–r8 : Rules of Hooks et pureté des composants ne sont pas
  // vérifiables à l'œil sur un projet qui grossit ; la machine les tient.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    // `configs['recommended-latest']` est au format eslintrc ; la variante flat
    // vit sous `configs.flat`. Les deux existent, une seule marche ici.
    extends: [reactHooks.configs.flat['recommended-latest'], jsxA11y.flatConfigs.recommended],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
);

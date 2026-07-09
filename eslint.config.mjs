// Couche 1 (zéro-token) — règles kit "Vérifié par: eslint", enforced gratuitement.
// Base agnostique : TypeScript + garde-fous clean-code structurels.
// Les couches framework (react-hooks, jsx-a11y, @tanstack/query pour apps/web ;
// frontières Nest pour apps/api) seront ajoutées en 2.2/2.3, quand les apps et
// leurs configs générées existeront (réconciliation).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

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
);

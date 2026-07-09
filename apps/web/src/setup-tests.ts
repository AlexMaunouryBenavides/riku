// Ajoute les matchers DOM de jest-dom à `expect` de Vitest
// (`toBeInTheDocument`, `toHaveAccessibleName`…), et nettoie le DOM
// entre chaque test via l'auto-cleanup de Testing Library.
import '@testing-library/jest-dom/vitest';

import { configDefaults, defineConfig } from 'vitest/config';

// Git worktrees live in .worktrees/ and hold their own copies of the tests.
export default defineConfig({ test: { exclude: [...configDefaults.exclude, '.worktrees/**'] } });

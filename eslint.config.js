import js from "@eslint/js";
import globals from "globals";

const browserFiles = ["apps/web/src/**/*.js", "packages/**/*.js"];
const nodeFiles = ["apps/web/vite.config.js", "tools/**/*.mjs"];

export default [
  {
    ignores: ["**/build/**", "**/dist/**", "**/node_modules/**", "apps/client/assets/generated/**"],
  },
  {
    ...js.configs.recommended,
    files: browserFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ...js.configs.recommended,
    files: nodeFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];

import js from "@eslint/js";
import prettier from "eslint-config-prettier";

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  Date: "readonly",
  KeyboardEvent: "readonly",
  CustomEvent: "readonly",
  Event: "readonly",
  console: "readonly",
  HTMLElement: "readonly",
};

export default [
  {
    ignores: ["dist/"],
  },
  js.configs.recommended,
  prettier,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none" }],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];

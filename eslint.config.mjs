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
    ignores: ["onscan.min.js", "dist/"],
  },
  js.configs.recommended,
  prettier,
  {
    files: ["onscan.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
      globals: {
        ...browserGlobals,
        module: "readonly",
        exports: "readonly",
        define: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none" }],
      "no-var": "off",
      "prefer-const": "off",
    },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none" }],
      "no-var": "off",
      "prefer-const": "off",
    },
  },
];

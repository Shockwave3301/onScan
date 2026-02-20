import js from "@eslint/js";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["onscan.min.js"],
  },
  js.configs.recommended,
  prettier,
  {
    files: ["onscan.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
      globals: {
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
];

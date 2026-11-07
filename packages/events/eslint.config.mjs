import parser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser,
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
];

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "import/order": "off",
      // Warn rather than error, so the existing code does not block the
      // build — but an unused import or variable is now visible. These
      // rules were off, which is how ~2,000 lines of unreachable code
      // accumulated without anything complaining.
      // `args: "none"` — an unused function PARAMETER is not dead code
      // (React callbacks take signatures they do not always use), and
      // flagging them buries the two things that matter: an unused
      // import, and a variable that is assigned and never read.
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "prefer-const": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@next/next/no-html-link-for-pages": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "reportUnusedDisableDirectives": "off",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
];

export default eslintConfig;

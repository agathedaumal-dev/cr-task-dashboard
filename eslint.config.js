const nextConfig = require("eslint-config-next/core-web-vitals");
const reactPlugin = require("eslint-plugin-react");
const importPlugin = require("eslint-plugin-import");
const securityPlugin = require("eslint-plugin-security");

const securityRecommendedRules =
  securityPlugin.configs?.recommended?.rules ?? {};

module.exports = [
  ...nextConfig,
  {
    plugins: {
      react: reactPlugin,
      security: securityPlugin,
    },
    rules: {
      ...securityRecommendedRules,
      "security/detect-object-injection": "off",
      "@next/next/no-img-element": "error",
      "react/function-component-definition": [
        "error",
        {
          namedComponents: "function-declaration",
          unnamedComponents: "arrow-function",
        },
      ],
    },
  },
  {
    files: [
      "components/**/*.tsx",
      "components/**/*.ts",
      "hooks/**/*.ts",
      "lib/**/*.ts",
      "app/actions/**/*.ts",
    ],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/no-default-export": "error",
    },
  },
  {
    files: [
      "app/**/page.tsx",
      "app/**/layout.tsx",
      "app/**/loading.tsx",
      "app/**/error.tsx",
      "app/**/not-found.tsx",
      "app/**/template.tsx",
      "app/**/default.tsx",
      "app/**/route.ts",
      "proxy.ts",
      "next.config.js",
      "postcss.config.js",
    ],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/no-default-export": "off",
    },
  },
];

import { defineConfig } from "vitepress";

export default defineConfig({
  title: "env-guard",
  description:
    "Strongly typed, fail-fast environment variable validation for Node.js",
  base: "/env-guard/",
  head: [
    [
      "link",
      { rel: "icon", type: "image/svg+xml", href: "/env-guard/logo.svg" },
    ],
  ],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Features", link: "/features/validators-formats" },
      { text: "Frameworks", link: "/frameworks/overview" },
      { text: "API Reference", link: "/api/" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Schema Options", link: "/guide/schema-options" },
          { text: ".env File Loading", link: "/guide/env-files" },
        ],
      },
      {
        text: "Features",
        items: [
          {
            text: "Validators & Formats",
            link: "/features/validators-formats",
          },
          { text: "Enum / Choices", link: "/features/choices" },
          { text: "Array Type", link: "/features/array" },
          { text: "Prefix Scoping", link: "/features/prefix" },
          { text: "Custom Error Formatter", link: "/features/custom-errors" },
          { text: "Describe Field", link: "/features/describe" },
          { text: "Runtime Refresh", link: "/features/runtime-refresh" },
          { text: "Secret Masking", link: "/features/secret-masking" },
          { text: "Frozen & Strict Output", link: "/features/frozen-strict" },
          { text: "Type Coercion Hooks", link: "/features/coercion" },
          { text: "Nested / Grouped Schemas", link: "/features/nested-groups" },
        ],
      },
      {
        text: "Framework Recipes",
        items: [
          { text: "Overview", link: "/frameworks/overview" },
          { text: "Next.js", link: "/frameworks/nextjs" },
          { text: "Vite", link: "/frameworks/vite" },
          { text: "Astro", link: "/frameworks/astro" },
          { text: "SvelteKit", link: "/frameworks/sveltekit" },
          { text: "Remix", link: "/frameworks/remix" },
        ],
      },
      {
        text: "API Reference",
        items: [{ text: "API", link: "/api/" }],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/frauschert/env-guard",
      },
    ],
    search: {
      provider: "local",
    },
    footer: {
      message: "Released under the MIT License.",
    },
  },
});

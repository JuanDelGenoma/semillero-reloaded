// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// GitHub Pages serves the site from a subpath like /<repo-name>/ when the
// repository is not <user>.github.io. CI sets BASE_PATH accordingly; local
// and Lovable builds stay at the root.
const basePath = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

export default defineConfig({
  vite: {
    base: basePath ? `${basePath}/` : "/",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Every route is a static path with no loader, so all of them can be
    // prerendered to HTML — required for GitHub Pages (static hosting only).
    // The crawler requests each page with a trailing slash and the server
    // answers with a 307 to the canonical path; the Lovable default of
    // maxRedirects: 0 treats that as an error, so allow the one hop.
    prerender: { enabled: true, maxRedirects: 5 },
  },
});

import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: "injectManifest",

      srcDir: "src",
      filename: "sw.js",

      registerType: "autoUpdate",
      injectRegister: "inline",

      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },

      manifest: {
        name: "JumpKey Dashboard",
        short_name: "JumpKey",
        theme_color: "#6366f1",
        display: "standalone",
        icons: [
          {
            src: "/jump-key.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "<paste trade service base URL here>",
        changeOrigin: true,
        secure: false, // skip SSL verification for staging
        rewrite: (path) => path.replace(/^\/api/, "/vpc/v1"),
      },
    },
  },
});

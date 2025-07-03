import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(() => {

  return {
    plugins: [react(), tailwindcss(), nodePolyfills()],
    // Only for Local Development
    // server: {
    //   proxy: {
    //     "/trade-stage-api-proxy": {
    //       target: "https://okto-trade-service.oktostage.com",
    //       changeOrigin: true,
    //       secure: false,
    //       rewrite: (path) => path.replace(/^\/trade-stage-api-proxy/, "/v1"),
    //     },
    //     "/trade-sandbox-api-proxy": {
    //       target: "https://sandbox-okto-trade-service-kong.okto.tech/",
    //       changeOrigin: true,
    //       secure: false,
    //       rewrite: (path) => path.replace(/^\/trade-sandbox-api-proxy/, "/v1"),
    //     },
    //   },
    // },
  };
});

// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react-swc";
// import tailwindcss from '@tailwindcss/vite';
// import { nodePolyfills } from "vite-plugin-node-polyfills";

// export default defineConfig({
//   plugins: [react(), tailwindcss(), nodePolyfills()],
// });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 4000,
    cors: true,
    // Bind the HMR socket to localhost explicitly. With host 0.0.0.0 the client
    // otherwise guesses an address it cannot reach, HMR dies, and edits silently
    // stop being applied — which looks like "my fix didn't work".
    hmr: { host: "localhost", protocol: "ws", port: 4000 },
  },
  plugins: [react(), process.env.PREVIEW ? null : basicSsl()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime"],
  },
  // amazon-cognito-identity-js references Node's `global`; polyfill it for browser
  define: {
    global: 'globalThis',
  },
}));

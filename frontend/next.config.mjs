import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Force Transformers.js to resolve to the browser/web build instead of node build
    config.resolve.alias = {
      ...config.resolve.alias,
      '@huggingface/transformers': path.resolve(__dirname, 'node_modules/@huggingface/transformers/dist/transformers.web.js'),
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;

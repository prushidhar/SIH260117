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
  async rewrites() {
    return [
      {
        source: '/api/history',
        destination: '/api/history',
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/files/:path*',
        destination: 'http://127.0.0.1:8000/files/:path*',
      },
      {
        source: '/health',
        destination: 'http://127.0.0.1:8000/health',
      },
    ];
  },
};

export default nextConfig;

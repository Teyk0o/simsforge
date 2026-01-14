/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tauri expects a static export
  output: process.env.TAURI_PLATFORM ? 'export' : 'standalone',

  // Optimize images for Tauri
  images: {
    unoptimized: true,
  },

  // Disable static optimizations for Tauri
  staticPageGenerationTimeout: 1000,
};

module.exports = nextConfig;

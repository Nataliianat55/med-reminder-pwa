/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

const runtimeCaching = require("next-pwa/cache");

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching,
  fallbacks: {
    document: "/offline.html"
  },
  // Custom worker source: `worker/index.ts`
  customWorkerSrc: "worker"
});

module.exports = withPWA(nextConfig);


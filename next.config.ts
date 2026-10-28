import type { NextConfig } from "next";

// Export estático: o app é só cliente (fala com a API Laravel por token),
// então sobe como site estático em qualquer hospedagem.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

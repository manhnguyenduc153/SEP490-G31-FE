const nextConfig = {
  /* config options here */
  devIndicators: false,
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://api.qlaundry.io.vn/api/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "https://api.qlaundry.io.vn/uploads/:path*",
      },
      {
        // Proxy SignalR hub (negotiate + long-polling) về EC2 backend
        source: "/hubs/:path*",
        destination: "https://api.qlaundry.io.vn/hubs/:path*",
      },
    ];
  },
  webpack(config: any) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

export default nextConfig;
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
        destination: "http://13.211.170.13:5000/api/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://13.211.170.13:5000/uploads/:path*",
      },
      {
        // Proxy SignalR hub (negotiate + long-polling) về EC2 backend
        source: "/hubs/:path*",
        destination: "http://13.211.170.13:5000/hubs/:path*",
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
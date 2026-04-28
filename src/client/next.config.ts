import type { NextConfig } from "next";

const imageDomains = [
  "m.media-amazon.com",
  "www.bestbuy.com",
  "www.dyson.com",
  "store.hp.com",
  "i1.adis.ws",
  "i5.walmartimages.com",
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
  "pbs.twimg.com",
  "store.storeimages.cdn-apple.com",
  "images.unsplash.com",
  "picsum.photos",
  "i.pravatar.cc",
  "api.dicebear.com",
];

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  images: {
    domains: imageDomains,
    remotePatterns: imageDomains.map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/**",
    })),
    unoptimized: process.env.NODE_ENV === "development", // Disable optimization in dev for easier debugging
  },
};

export default nextConfig;

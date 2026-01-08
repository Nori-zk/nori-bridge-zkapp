import path from "node:path";
import { fileURLToPath } from "node:url";
import TerserPlugin from "terser-webpack-plugin";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    esmExternals: true,
  },
  output: "export",
  typescript: {
    // ignoreBuildErrors: true,
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      // Dont this this is actually needed anymore but leaving it here. See https://docs.o1labs.org/o1js/tutorials/frontent-integration-guides/next#initialize-the-project
      config.resolve.alias = {
        ...config.resolve.alias,
        o1js: path.resolve(__dirname, "node_modules/o1js/dist/web/index.js"),
      };
    } else {
      config.externals.push("o1js"); // https://nextjs.org/docs/app/api-reference/next-config-js/serverExternalPackages
    }

    if (!isServer) {
      // config.optimization.minimizer = true causes o1js Provable to be undefined. Use TerserPlugin instead seems to resolve those issues.
      config.optimization.minimizer = [
        new TerserPlugin(),
        /*{
          terserOptions: {
            compress: {
              passes: 3,
              drop_console: false,
              unsafe: true,
            },
            mangle: {
              toplevel: true,
            },
            format: {
              comments: false,
              beautify: false,
            },
          },
          extractComments: true,
        }*/
      ];
    }

    // Handle SVG files as React components
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Handle PNG, JPG, JPEG, GIF files as assets
    config.module.rules.push({
      test: /\.(png|jpe?g|gif)$/i,
      type: "asset/resource",
    });

    config.experiments = { ...config.experiments, topLevelAwait: true };
    return config;
  },

  // To enable o1js for the web, we must set the COOP and COEP headers.
  // See here for more information: https://docs.minaprotocol.com/zkapps/how-to-write-a-zkapp-ui#enabling-coop-and-coep-headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

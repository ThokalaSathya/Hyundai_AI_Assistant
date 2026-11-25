/*import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;

*/

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
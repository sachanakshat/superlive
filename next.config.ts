import { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ["lucide-react"],
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default config 
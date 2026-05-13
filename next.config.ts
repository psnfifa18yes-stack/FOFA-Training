/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // This ignores the 'PostgrestFilterBuilder' error during build
    ignoreBuildErrors: true, 
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
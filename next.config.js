/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
      const headersList = [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
        },
      ];
  
      // Only enforce HTTPS in production to avoid issues during local development
      if (process.env.NODE_ENV === 'production') {
        headersList.push({
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains', // 1 year, no preload for safety
        });
      }
  
      return [
        {
          source: '/:path*',
          headers: headersList,
        },
      ];
    },
  };
  
module.exports = nextConfig;

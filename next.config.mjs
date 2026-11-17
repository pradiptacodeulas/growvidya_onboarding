/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '192.168.29.243',
    '192.168.29.243:3000',
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
  ],
};

export default nextConfig;


// const nextConfig = {
// output: 'export',
// trailingSlash: true,
// images: {
// unoptimized: true,
// },
// };

// export default nextConfig;

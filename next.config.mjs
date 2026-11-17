/** @type {import('next').NextConfig} */
const nextConfig = {
output: 'export',
trailingSlash: true,
images: {
unoptimized: true,
},
allowedDevOrigins: ['192.168.29.144','192.168.28.243'],
};

export default nextConfig;
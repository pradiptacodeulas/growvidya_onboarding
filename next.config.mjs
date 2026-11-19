/** @type {import('next').NextConfig} */
const nextConfig = {
output: 'export',
trailingSlash: true,
images: {
unoptimized: true,
},
 allowedDevOrigins: ['192.168.29.243'],
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

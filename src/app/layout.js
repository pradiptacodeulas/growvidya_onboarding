import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'Growvidya - School Onboarding & Registration',
  description: 'Instant institutional registration and setup for Growvidya School Management Platform.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-light min-vh-100 d-flex flex-column">
        {children}
      </body>
    </html>
  );
}

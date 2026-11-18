'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  const rawPortalUrl = process.env.NEXT_PUBLIC_PORTAL_URL;
  const portalUrl = rawPortalUrl ? rawPortalUrl.trim().replace(/\/+$/, '') : '';

  const handleAdminLoginClick = (e) => {
    if (!portalUrl) {
      e.preventDefault();
      alert('Configuration Error: NEXT_PUBLIC_PORTAL_URL is not defined in .env.');
    }
  };

  return (
    <header className="navbar navbar-light bg-white border-bottom shadow-sm py-3 px-3 px-md-5 sticky-top no-print">
      <div className="container-fluid px-0 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <Link href="/" className="text-decoration-none d-inline-flex align-items-center">
            <Image
              src="/logo_dark.png"
              alt="Growvidya Logo"
              width={160}
              height={48}
              style={{ objectFit: 'contain', width: 'auto', height: '42px' }}
              priority
            />
          </Link>
        </div>

        <div className="d-flex align-items-center gap-2 gap-md-3">
          <a
            href={portalUrl ? `${portalUrl}/account/login/adminlogin` : '#'}
            onClick={handleAdminLoginClick}
            className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-1"
          >
            Already Registered? Admin Login
          </a>
        </div>
      </div>
    </header>
  );
}

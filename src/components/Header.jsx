'use client';

import React from 'react';
import Image from 'next/image';

export default function Header() {
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:5174';

  return (
    <header className="navbar navbar-light bg-white border-bottom shadow-xs py-3 px-3 px-md-5 sticky-top">
      <div className="container-fluid px-0 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <Image
            src="/logo_dark.png"
            alt="Growvidya Logo"
            width={160}
            height={48}
            style={{ objectFit: 'contain', width: 'auto', height: '42px' }}
            priority
          />
        </div>

        <div className="d-flex align-items-center gap-3">
          <a
            href={`${portalUrl}/account/login/adminlogin`}
            className="btn btn-outline-secondary btn-sm fw-semibold px-3 py-1.5"
          >
            Already Registered? Admin Login
          </a>
        </div>
      </div>
    </header>
  );
}

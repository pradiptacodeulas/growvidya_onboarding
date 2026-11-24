'use client';

import React, { useState, useEffect } from 'react';
import saasApi from '@/lib/api';

export default function Footer({ className = 'bg-white border-top py-3 text-center text-muted fs-13 mt-auto no-print' }) {
  const [footerText, setFooterText] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadFooterSetting = async () => {
      try {
        const res = await saasApi.getFooterSetting();
        const data = res?.data || res;
        if (isMounted) {
          setFooterText(data?.footer_text ? String(data.footer_text).trim() : '');
        }
      } catch (err) {
        console.error('Failed to load platform footer setting:', err);
      }
    };

    loadFooterSetting();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!footerText) {
    return null;
  }

  return (
    <footer className={className}>
      <div className="container">{footerText}</div>
    </footer>
  );
}

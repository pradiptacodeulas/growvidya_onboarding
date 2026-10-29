'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import saasApi from '@/lib/api';
import {
  XCircle,
  RefreshCw,
  Edit3,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

function OnboardingPaymentFailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNoParam = searchParams.get('order_no') || searchParams.get('orderNo') || '';
  const codeParam = searchParams.get('code') || '';
  const reasonParam = searchParams.get('reason') || '';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderNoParam));

  useEffect(() => {
    if (!orderNoParam) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const checkOrderState = async () => {
      try {
        setLoading(true);
        const res = await saasApi.getOrderDetails(orderNoParam);
        const fetched = res?.data || res;
        if (!isMounted || !fetched) return;

        // If asynchronous webhook already reconciled payment as 'paid', forward to success receipt
        if (fetched.status === 'paid') {
          router.replace(`/payment/success?order_no=${encodeURIComponent(fetched.order_no)}`);
          return;
        }
        setOrder(fetched);
      } catch {
        // Order reference may not exist if gateway closed prior to persistence
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkOrderState();
    return () => {
      isMounted = false;
    };
  }, [orderNoParam, router]);

  if (loading) {
    return (
      <div className="container py-5 my-5 text-center">
        <Loader2 size={40} className="animate-spin text-primary mx-auto mb-3" />
        <h5 className="fw-bold text-dark">Checking Payment Gateway Status...</h5>
      </div>
    );
  }

  const failureCode = codeParam || order?.failure_code || 'PAYMENT_DECLINED';
  const failureReason =
    reasonParam ||
    order?.failure_reason ||
    'The transaction could not be completed by your bank or payment provider.';
  const attemptedAmount = Number(order?.grand_total ?? 0);
  const cycleLabel = order?.cycle_meta?.label || order?.billing_cycle || '';

  return (
    <div className="container py-4 py-md-5" style={{ maxWidth: '820px' }}>
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        {/* Failure Banner */}
        <div
          className="p-4 p-md-5 text-white"
          style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}
        >
          <div className="d-flex align-items-center gap-3 mb-2">
            <div
              className="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
              style={{ width: '58px', height: '58px', color: '#dc2626' }}
            >
              <XCircle size={34} />
            </div>
            <div>
              <span className="badge bg-white text-danger fw-bold px-3 py-1 fs-11 rounded-pill text-uppercase mb-1">
                Payment Not Completed
              </span>
              <h3 className="fw-bold text-white mb-0">We Could Not Finalize Your Payment</h3>
            </div>
          </div>
          <p className="text-white-50 fs-14 mb-0">
            Don&apos;t worry — all of your School Profile, Campus, Academic Session, and Super Admin details are safely preserved in your session so you don&apos;t have to re-enter anything.
          </p>
        </div>

        {/* Diagnostic & Action Body */}
        <div className="card-body p-4 p-md-5 bg-white">
          {/* Reason Box */}
          <div className="p-3 rounded-3 bg-danger-subtle border border-danger-subtle mb-4">
            <div className="d-flex align-items-start gap-3">
              <ShieldAlert size={20} className="text-danger flex-shrink-0 mt-1" />
              <div>
                <div className="fw-bold text-dark fs-14 mb-1">
                  Gateway Response ({failureCode})
                </div>
                <p className="text-secondary fs-13 mb-0">{failureReason}</p>
              </div>
            </div>
          </div>

          {/* Order Metadata Summary */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-4">
              <div className="p-3 rounded-3 bg-light border h-100">
                <div className="text-muted fs-11 text-uppercase fw-semibold">Order Reference</div>
                <div className="fw-bold text-dark font-monospace fs-13 mt-1">
                  {order?.order_no || orderNoParam || '—'}
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-4">
              <div className="p-3 rounded-3 bg-light border h-100">
                <div className="text-muted fs-11 text-uppercase fw-semibold">Selected Package</div>
                <div className="fw-bold text-dark fs-13 mt-1">
                  {order?.plan_name || 'Onboarding Package'}
                  {cycleLabel ? ` (${cycleLabel})` : ''}
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-4">
              <div className="p-3 rounded-3 bg-light border h-100">
                <div className="text-muted fs-11 text-uppercase fw-semibold">Attempted Amount</div>
                <div className="fw-bold text-dark fs-15 mt-1">
                  {attemptedAmount > 0
                    ? `₹${attemptedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Reassurance Notes */}
          <div className="p-3 rounded-3 bg-light border mb-4 fs-13">
            <h6 className="fw-bold text-dark fs-14 mb-2 d-flex align-items-center gap-2">
              <CheckCircle2 size={17} className="text-success" />
              <span>Important Billing Reassurance</span>
            </h6>
            <ul className="mb-0 ps-3 text-secondary d-flex flex-column gap-2">
              <li>
                <strong>Zero Duplicate Charges:</strong> No subscription charges were captured for this declined attempt.
              </li>
              <li>
                <strong>Temporary Bank Debits:</strong> If an amount was debited from your bank account or UPI app during a network timeout, the payment gateway automatically reverses it within 5–7 business days.
              </li>
              <li>
                <strong>Instant Resume:</strong> Click <strong>Retry Payment</strong> below to return directly to Step 6 (Review &amp; Activate) with all your onboarding details intact.
              </li>
            </ul>
          </div>

          {/* Primary Recovery CTAs */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-3 border-top">
            <Link
              href="/register?resume=plan"
              className="btn btn-outline-secondary px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2"
            >
              <Edit3 size={16} />
              <span>Modify Plan or Add-ons</span>
            </Link>

            <Link
              href="/register?resume=review"
              className="btn btn-primary px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
            >
              <RefreshCw size={16} />
              <span>Retry Payment &amp; Complete Registration</span>
            </Link>
          </div>

          <div className="mt-4 text-center text-muted fs-12 d-flex align-items-center justify-content-center gap-2">
            <HelpCircle size={14} />
            <span>
              Need assistance? Quote Order Reference{' '}
              <strong className="font-monospace text-dark">{order?.order_no || orderNoParam || 'N/A'}</strong>{' '}
              when contacting GrowVidya Support.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPaymentFailedPage() {
  return (
    <>
      <Header />
      <main className="flex-grow-1">
        <Suspense
          fallback={
            <div className="text-center py-5 my-5">
              <Loader2 size={36} className="animate-spin text-primary mx-auto mb-2" />
              <div>Loading payment status...</div>
            </div>
          }
        >
          <OnboardingPaymentFailedContent />
        </Suspense>
      </main>
      <footer className="bg-white border-top py-3 text-center text-muted fs-13 mt-auto">
        <div className="container">
          Copyright &copy; {new Date().getFullYear()} Growvidya School Management Platform. All rights reserved.
        </div>
      </footer>
    </>
  );
}

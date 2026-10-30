'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import saasApi from '@/lib/api';
import {
  CheckCircle2,
  Printer,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Truck,
  AlertCircle,
} from 'lucide-react';

const RESULT_STORAGE_KEY = 'growvidya_onboarding_result';

const formatDateDisplay = (val) => {
  if (!val) return '—';
  const str = String(val).slice(0, 10);
  const parts = str.split('-');
  if (parts.length === 3) {
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return str;
};

const formatPaymentMethodLabel = (method) => {
  const key = String(method || '').toLowerCase();
  if (key === 'razorpay') return 'Razorpay Online Checkout';
  if (key === 'free_trial') return 'Free Trial Activation';
  if (key === 'coupon_100') return '100% Promotional Coupon';
  if (key === 'bank_transfer') return 'Offline Bank Transfer (UTR)';
  return method ? String(method).replace(/_/g, ' ') : 'Verified Activation';
};

function OnboardingPaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderNoParam = searchParams.get('order_no') || searchParams.get('orderNo') || '';
  const portalUrl = (process.env.NEXT_PUBLIC_PORTAL_URL || '').trim();

  const [sessionResult, setSessionResult] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cachedResult = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
        if (raw) {
          cachedResult = JSON.parse(raw);
          setSessionResult(cachedResult);
          if (cachedResult?.order) {
            setOrder(cachedResult.order);
          }
        }
      } catch (e) {
        console.warn('Unable to read onboarding result from sessionStorage:', e);
      }
    }

    const targetOrderNo = orderNoParam || cachedResult?.order_no || '';
    if (!targetOrderNo) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await saasApi.getOrderDetails(targetOrderNo);
        const fetchedOrder = res?.data || res;
        if (isMounted && fetchedOrder) {
          setOrder(fetchedOrder);
        }
      } catch (err) {
        if (isMounted && !cachedResult?.order) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Unable to load receipt details for this order reference.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrder();
    return () => {
      isMounted = false;
    };
  }, [orderNoParam]);

  if (loading && !order) {
    return (
      <div className="container py-5 my-5 text-center">
        <Loader2 size={42} className="animate-spin text-success mx-auto mb-3" />
        <h5 className="fw-bold text-dark">Finalizing Institutional Portal &amp; Official Receipt...</h5>
        <p className="text-muted fs-14 mb-0">
          Verifying license validity dates and generating your printable invoice.
        </p>
      </div>
    );
  }

  const handoverToken = sessionResult?.handover_token || null;
  const adminEmail = sessionResult?.adminEmail || order?.school?.email || '';
  const schoolName =
    order?.school?.name || sessionResult?.schoolName || 'Registered Institution';
  const schoolCode = order?.school?.code || sessionResult?.schoolCode || '';
  const schoolEmail = order?.school?.email || adminEmail || '';
  const schoolPhone = order?.school?.phone || '';
  const schoolAddress = order?.school?.address || order?.shipping_address || '';

  const portalLaunchUrl = portalUrl;

  const lineItems =
    Array.isArray(order?.line_items) && order.line_items.length > 0
      ? order.line_items
      : order
      ? [
          {
            category: 'subscription_plan',
            title: order.plan_name || 'Institutional Subscription License',
            quantity: 1,
            unit_price: Number(order.subtotal_amount || order.grand_total || 0),
            total_price: Number(order.subtotal_amount || order.grand_total || 0),
          },
        ]
      : [];

  const subtotal = Number(order?.subtotal_amount ?? order?.grand_total ?? 0);
  const discount = Number(order?.discount_amount ?? 0);
  const grandTotal = Number(order?.grand_total ?? 0);
  const txnRef =
    order?.razorpay_payment_id ||
    order?.utr_number ||
    order?.razorpay_order_id ||
    order?.order_no ||
    sessionResult?.order_no ||
    '—';
  const cycleLabel = order?.cycle_meta?.label || order?.billing_cycle || '';

  return (
    <div className="container py-4 py-md-5" style={{ maxWidth: '1040px' }}>
      {/* Celebration & Portal Handover Hero Card (Hidden on Print) */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden no-print">
        <div
          className="p-4 p-md-5 text-white"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
        >
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-7">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div
                  className="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                  style={{ width: '60px', height: '60px', color: '#059669' }}
                >
                  <CheckCircle2 size={34} />
                </div>
                <div>
                  <span className="badge bg-white text-dark fw-bold px-3 py-1 fs-11 rounded-pill text-uppercase mb-1">
                    Instant Activation Complete
                  </span>
                  <h3 className="fw-bold text-white mb-0">
                    Welcome to GrowVidya, {schoolName}!
                  </h3>
                </div>
              </div>
              <p className="text-white-50 fs-14 mb-0">
                Your institutional workspace, academic session, license quotas, and Super Admin credentials have been provisioned and unlocked immediately.
              </p>
            </div>

            <div className="col-12 col-lg-5 text-lg-end">
              <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                {portalUrl && (
                  <a
                    href={portalLaunchUrl}
                    className="btn btn-dark fw-bold px-4 py-2 shadow-sm d-inline-flex align-items-center gap-2"
                  >
                    <span>Launch School Admin Portal</span>
                    <ExternalLink size={16} />
                  </a>
                )}

                {order && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn btn-light fw-bold px-4 py-2 shadow-sm d-inline-flex align-items-center gap-2"
                  >
                    <Printer size={16} />
                    <span>Print / Save Receipt</span>
                  </button>
                )}
              </div>
              {adminEmail && (
                <div className="text-white-50 fs-12 mt-2">
                  Admin Login: <strong className="text-white">{adminEmail}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Highlights Strip */}
        <div className="card-body bg-white p-3 p-md-4 border-top">
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="p-3 rounded-3 bg-light border h-100">
                <div className="text-muted fs-11 text-uppercase fw-semibold">Order Reference</div>
                <div className="fw-bold text-dark font-monospace fs-13 mt-1">
                  {order?.order_no || sessionResult?.order_no || orderNoParam || '—'}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3 rounded-3 bg-light border h-100">
                <div className="text-muted fs-11 text-uppercase fw-semibold">Invoice Number</div>
                <div className="fw-bold text-primary font-monospace fs-13 mt-1">
                  {order?.invoice_no || sessionResult?.invoice_no || '—'}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3 rounded-3 bg-light border h-100">
                <div className="text-muted fs-11 text-uppercase fw-semibold">License Validity</div>
                <div className="fw-bold text-dark fs-13 mt-1">
                  {order?.start_date && order?.end_date
                    ? `${formatDateDisplay(order.start_date)} → ${formatDateDisplay(order.end_date)}`
                    : cycleLabel || 'Active'}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3 rounded-3 bg-light border h-100">
                <div className="text-muted fs-11 text-uppercase fw-semibold">Net Amount Paid</div>
                <div className="fw-bold text-success fs-15 mt-1">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && !order && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between gap-3 p-4 rounded-3 shadow-sm no-print">
          <div className="d-flex align-items-center gap-2">
            <AlertCircle size={20} className="text-warning-emphasis flex-shrink-0" />
            <div>
              <h6 className="fw-bold text-dark mb-1">Receipt Lookup Notice</h6>
              <p className="mb-0 fs-13 text-secondary">{error}</p>
            </div>
          </div>
          <Link href="/register" className="btn btn-outline-primary btn-sm px-3 fw-semibold">
            Back to Onboarding
          </Link>
        </div>
      )}

      {/* Printable Official Receipt / Zero-GST Invoice */}
      {order && (
        <div
          id="printable-onboarding-invoice"
          className="card border shadow-sm rounded-4 bg-white mb-4 overflow-hidden"
        >
          <div className="card-body p-4 p-md-5">
            {/* Invoice Header */}
            <div className="d-flex flex-wrap align-items-start justify-content-between border-bottom pb-4 mb-4 gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="fw-bold fs-4 text-primary">GrowVidya</span>
                  <span className="badge bg-light text-secondary border fs-11 px-2 py-1">
                    Cloud School ERP
                  </span>
                </div>
                <p className="text-muted fs-13 mb-0">
                  Official Institutional Onboarding &amp; Subscription Payment Receipt
                </p>
              </div>

              <div className="text-md-end">
                <h5 className="fw-bold text-dark mb-1 text-uppercase">Official Payment Receipt</h5>
                <div className="fs-13 text-secondary">
                  <strong>Invoice No:</strong>{' '}
                  <span className="font-monospace text-dark">{order.invoice_no || '—'}</span>
                </div>
                <div className="fs-13 text-secondary">
                  <strong>Order Ref:</strong>{' '}
                  <span className="font-monospace text-dark">{order.order_no}</span>
                </div>
                <div className="fs-13 text-secondary">
                  <strong>Issued Date:</strong>{' '}
                  <span className="text-dark">
                    {formatDateDisplay(order.paid_at || order.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Billed Institution & Payment Details */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-md-6">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-2">
                    Billed To Institution
                  </div>
                  <h6 className="fw-bold text-dark mb-1">
                    {schoolName}
                    {schoolCode ? (
                      <span className="text-muted fw-normal fs-12 ms-1">({schoolCode})</span>
                    ) : null}
                  </h6>
                  {schoolEmail && <div className="fs-13 text-secondary">{schoolEmail}</div>}
                  {schoolPhone && <div className="fs-13 text-secondary">Phone: {schoolPhone}</div>}
                  {schoolAddress && (
                    <div className="fs-13 text-secondary mt-1">Address: {schoolAddress}</div>
                  )}
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="p-3 rounded-3 bg-light border h-100">
                  <div className="text-muted fs-11 fw-bold text-uppercase mb-2">
                    License &amp; Payment Verification
                  </div>
                  <div className="d-flex justify-content-between fs-13 mb-1">
                    <span className="text-muted">Payment Status:</span>
                    <span className="badge bg-success-subtle text-success border border-success-subtle fw-bold">
                      VERIFIED &amp; ACTIVE
                    </span>
                  </div>
                  <div className="d-flex justify-content-between fs-13 mb-1">
                    <span className="text-muted">Payment Method:</span>
                    <strong className="text-dark">
                      {formatPaymentMethodLabel(order.payment_method)}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between fs-13 mb-1">
                    <span className="text-muted">Transaction Ref:</span>
                    <span className="font-monospace text-dark fw-semibold">{txnRef}</span>
                  </div>
                  {order.plan_name && (
                    <div className="d-flex justify-content-between fs-13 mb-1">
                      <span className="text-muted">Activated Package:</span>
                      <strong className="text-dark">
                        {order.plan_name}
                        {cycleLabel ? ` (${cycleLabel})` : ''}
                      </strong>
                    </div>
                  )}
                  {order.start_date && order.end_date && (
                    <div className="d-flex justify-content-between fs-13">
                      <span className="text-muted">Validity Period:</span>
                      <strong className="text-dark">
                        {formatDateDisplay(order.start_date)} to {formatDateDisplay(order.end_date)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hardware Shipping Address if Hardware Included */}
            {order.shipping_address &&
              (Number(order.machines_amount) > 0 || Number(order.rfid_amount) > 0) && (
                <div className="p-3 rounded-3 bg-info-subtle border border-info-subtle mb-4 fs-13 d-flex align-items-start gap-2">
                  <Truck size={18} className="text-primary flex-shrink-0 mt-1" />
                  <div>
                    <strong className="text-dark d-block">
                      Hardware Dispatch &amp; Delivery Address:
                    </strong>
                    <span className="text-secondary">{order.shipping_address}</span>
                  </div>
                </div>
              )}

            {/* Line Items Table (Zero GST) */}
            <div className="table-responsive mb-4">
              <table className="table table-bordered align-middle mb-0 fs-13">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '52px' }} className="text-center">
                      #
                    </th>
                    <th>Description</th>
                    <th style={{ width: '110px' }} className="text-center">
                      Qty
                    </th>
                    <th style={{ width: '150px' }} className="text-end">
                      Unit Price
                    </th>
                    <th style={{ width: '160px' }} className="text-end">
                      Net Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-center text-muted">{idx + 1}</td>
                      <td className="fw-semibold text-dark">{item.title}</td>
                      <td className="text-center">
                        {Number(item.quantity || 1).toLocaleString('en-IN')}
                      </td>
                      <td className="text-end">
                        ₹{Number(item.unit_price || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="text-end fw-semibold text-dark">
                        ₹{Number(item.total_price || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Block (Flat Net Pricing — Zero GST) */}
            <div className="row justify-content-end">
              <div className="col-12 col-md-6 col-lg-5">
                <div className="p-3 rounded-3 bg-light border">
                  <div className="d-flex justify-content-between fs-13 mb-2">
                    <span className="text-muted">Subtotal:</span>
                    <strong className="text-dark">
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  {discount > 0 && (
                    <div className="d-flex justify-content-between fs-13 mb-2 text-success">
                      <span>
                        Coupon Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}:
                      </span>
                      <strong>
                        -₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <span className="fw-bold text-dark fs-15">Net Total Paid:</span>
                    <span className="fw-bold text-success fs-5">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-4 pt-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2 text-muted fs-12">
              <div className="d-flex align-items-center gap-2">
                <ShieldCheck size={15} className="text-success" />
                <span>
                  Computer-generated official receipt from GrowVidya SaaS Billing Engine. No physical signature required.
                </span>
              </div>
              <span>Currency: {order.currency || 'INR'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPaymentSuccessPage() {
  return (
    <>
      <Header />
      <main className="flex-grow-1">
        <Suspense
          fallback={
            <div className="text-center py-5 my-5">
              <Loader2 size={38} className="animate-spin text-success mx-auto mb-2" />
              <div>Loading activation receipt...</div>
            </div>
          }
        >
          <OnboardingPaymentSuccessContent />
        </Suspense>
      </main>
      <footer className="bg-white border-top py-3 text-center text-muted fs-13 mt-auto no-print">
        <div className="container">
          Copyright &copy; {new Date().getFullYear()} Growvidya School Management Platform. All rights reserved.
        </div>
      </footer>
    </>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tag,
  Loader2,
  Sparkles,
  AlertCircle,
  School,
  Building2,
  Calendar,
  UserCheck,
  Truck,
  Edit3,
} from 'lucide-react';
import saasApi from '../lib/api';

const DRAFT_STORAGE_KEY = 'growvidya_onboarding_draft';
const RESULT_STORAGE_KEY = 'growvidya_onboarding_result';

export default function StepReview({
  selectedPlan,
  catalog = {},
  selectedStorageId = null,
  selectedMachines = {},
  selectedCards = {},
  selectedNotifications = {},
  shippingAddress = '',
  setShippingAddress,
  schoolProfileData,
  campusContactData,
  academicYearData,
  adminData,
  isTrialMode,
  setIsTrialMode,
  couponCode = '',
  setCouponCode,
  appliedCoupon = null,
  setAppliedCoupon,
  onBack,
  onEditPlan,
}) {
  const router = useRouter();
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const trialDays = Math.max(0, parseInt(selectedPlan?.free_trial_days, 10) || 0);
  const basePrice = parseFloat(selectedPlan?.price || 0);
  const isPureFreeOrTrial =
    String(selectedPlan?.billing_cycle || '').toLowerCase() === 'trial' || basePrice <= 0;
  const hasTrialOption = trialDays > 0 && !isPureFreeOrTrial;
  const cycle = String(selectedPlan?.billing_cycle || '').toLowerCase();
  const cycleMeta = selectedPlan?.cycle_meta || {
    cycle,
    label: cycle,
    shortLabel: cycle,
  };

  // Add-ons data & calculations (100% Server-Driven, Zero GST)
  const storagePlans = catalog?.storage_plans || [];
  const attendanceMachines = catalog?.attendance_machines || [];
  const rfidCards = catalog?.rfid_cards || [];
  const notificationRecords = catalog?.notification_records || [];

  const effectiveStorageCycle = isPureFreeOrTrial ? 'annual' : cycle || 'annual';
  const selectedStorage =
    storagePlans.find((s) => Number(s.id) === Number(selectedStorageId)) || null;
  const storagePrice = selectedStorage
    ? Number(selectedStorage?.cycle_prices?.[effectiveStorageCycle] ?? 0)
    : 0;

  const machinesList = useMemo(
    () =>
      Object.entries(selectedMachines || {})
        .map(([id, qty]) => {
          const m = attendanceMachines.find((item) => Number(item.id) === Number(id));
          if (!m || qty <= 0) return null;
          const unitPrice = parseFloat(m.unit_price || 0);
          return {
            ...m,
            quantity: Number(qty),
            unitPrice,
            total: Math.round(unitPrice * Number(qty) * 100) / 100,
          };
        })
        .filter(Boolean),
    [selectedMachines, attendanceMachines]
  );

  const machinesTotal = machinesList.reduce((sum, item) => sum + item.total, 0);

  const cardsList = useMemo(
    () =>
      Object.entries(selectedCards || {})
        .map(([id, qty]) => {
          const c = rfidCards.find((item) => Number(item.id) === Number(id));
          if (!c || qty <= 0) return null;
          const unitPrice = parseFloat(c.unit_price || 0);
          return {
            ...c,
            quantity: Number(qty),
            unitPrice,
            total: Math.round(unitPrice * Number(qty) * 100) / 100,
          };
        })
        .filter(Boolean),
    [selectedCards, rfidCards]
  );

  const cardsTotal = cardsList.reduce((sum, item) => sum + item.total, 0);

  const notificationsList = useMemo(
    () =>
      Object.entries(selectedNotifications || {})
        .map(([id, cfg]) => {
          if (!cfg?.selected || !cfg?.quantity) return null;
          const n = notificationRecords.find((item) => Number(item.id) === Number(id));
          if (!n) return null;
          const unitPrice = parseFloat(n.cost || n.unit_price || 0);
          const qty = Number(cfg.quantity);
          const total = Math.round(unitPrice * qty * 100) / 100;
          return { ...n, quantity: qty, unitPrice, total };
        })
        .filter(Boolean),
    [selectedNotifications, notificationRecords]
  );

  const notificationsTotal = notificationsList.reduce((sum, item) => sum + item.total, 0);

  const hasPhysicalHardware = machinesList.length > 0 || cardsList.length > 0;
  const resolvedShippingAddress =
    shippingAddress !== undefined && shippingAddress !== ''
      ? shippingAddress
      : campusContactData?.address || '';

  const addonsTotal =
    Math.round((storagePrice + machinesTotal + cardsTotal + notificationsTotal) * 100) / 100;

  // Compute scoped coupon discount dynamically for Paid vs Trial mode
  const computeScopedDiscount = (planAmt) => {
    if (!appliedCoupon) return 0;
    const scope = String(appliedCoupon.applicable_scope || 'plan_only').toLowerCase();
    const eligibleSubtotal =
      scope === 'all'
        ? planAmt + addonsTotal
        : scope === 'software_and_storage'
        ? planAmt + storagePrice
        : planAmt;

    if (eligibleSubtotal <= 0) return 0;
    const minOrder = parseFloat(appliedCoupon.min_order_amount || 0);
    if (minOrder > 0 && eligibleSubtotal < minOrder) return 0;

    let disc = 0;
    const dVal = parseFloat(appliedCoupon.discount_value || 0);
    if (String(appliedCoupon.discount_type || '').toLowerCase() === 'percentage' && dVal > 0) {
      disc = (eligibleSubtotal * dVal) / 100;
      const maxD = parseFloat(appliedCoupon.max_discount || 0);
      if (maxD > 0 && disc > maxD) disc = maxD;
    } else if (dVal > 0) {
      disc = dVal;
    } else if (appliedCoupon.discountAmount !== undefined) {
      disc = parseFloat(appliedCoupon.discountAmount || 0);
    }

    return Math.min(eligibleSubtotal, Math.round(disc * 100) / 100);
  };

  const paidSubtotal = Math.round((basePrice + addonsTotal) * 100) / 100;
  const paidDiscountAmount = computeScopedDiscount(isPureFreeOrTrial ? 0 : basePrice);
  const finalPaidAmount = Math.max(0, Math.round((paidSubtotal - paidDiscountAmount) * 100) / 100);

  const trialDiscountAmount = computeScopedDiscount(0);
  const trialPayable = Math.max(0, Math.round((addonsTotal - trialDiscountAmount) * 100) / 100);

  const displaySubtotal = isPureFreeOrTrial ? addonsTotal : paidSubtotal;
  const displayDiscount = isPureFreeOrTrial ? trialDiscountAmount : paidDiscountAmount;
  const displayFinalAmount = isPureFreeOrTrial ? trialPayable : finalPaidAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setValidatingCoupon(true);
      setCouponError('');
      const activePlanAmt = isPureFreeOrTrial || isTrialMode ? 0 : basePrice;
      const activeSub = Math.round((activePlanAmt + addonsTotal) * 100) / 100;

      const res = await saasApi.validateCoupon({
        code: couponCode.trim(),
        amount: activeSub,
        plan_amount: activePlanAmt,
        storage_amount: storagePrice,
        email: adminData?.email || campusContactData?.email || null,
        phone: adminData?.phone || campusContactData?.phone_number || null,
      });

      if (res?.data) {
        if (setAppliedCoupon) setAppliedCoupon(res.data);
      } else {
        setCouponError(res?.message || 'Invalid coupon code.');
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Failed to validate coupon.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    if (setAppliedCoupon) setAppliedCoupon(null);
    if (setCouponCode) setCouponCode('');
    setCouponError('');
  };

  const buildRegistrationPayload = (orderData, paymentProof = {}, isTrialAction = false) => {
    const trialStorageCycle = isTrialAction || isPureFreeOrTrial ? 'annual' : cycle || 'annual';
    return {
      plan_id: selectedPlan.id,
      is_trial: isTrialAction,
      order_no: orderData?.order_no || null,
      payment_order_id: orderData?.payment_order_id || null,
      storage_plan_id: selectedStorageId || null,
      storage_qty: selectedStorageId ? 1 : 0,
      storage_billing_cycle: trialStorageCycle,
      selected_machines: machinesList.map((m) => ({ id: Number(m.id), quantity: Number(m.quantity) })),
      selected_cards: cardsList.map((c) => ({ id: Number(c.id), quantity: Number(c.quantity) })),
      selected_notifications: notificationsList.map((n) => ({
        id: Number(n.id),
        quantity: Number(n.quantity),
        type: n.type || n.channel,
      })),
      shipping_address: hasPhysicalHardware
        ? resolvedShippingAddress.trim()
        : campusContactData?.address || null,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      school: {
        school_name: schoolProfileData.school_name,
        school_code: schoolProfileData.school_code || null,
        school_type: schoolProfileData.school_type || null,
        affiliation_board: schoolProfileData.affiliation_board || null,
        medium_of_instruction: schoolProfileData.medium_of_instruction || null,
        established_year: schoolProfileData.established_year || null,
        registration_type: schoolProfileData.registration_type === 'multiple' ? 'multiple' : 'single',
        school_logo: schoolProfileData.school_logo || null,
        phone_number: campusContactData.phone_number || null,
        email: campusContactData.email || null,
        website: campusContactData.website || null,
        address: campusContactData.address || null,
        country: campusContactData.country || null,
        state: campusContactData.state || null,
        city: campusContactData.city || null,
        postal_code: campusContactData.postal_code || null,
        footer: campusContactData.footer || null,
      },
      academic_year: {
        academic_year: academicYearData.academic_year,
        start_date: academicYearData.start_date,
        end_date: academicYearData.end_date,
      },
      admin: {
        first_name: adminData.first_name,
        last_name: adminData.last_name || null,
        email: adminData.email,
        phone: adminData.phone || null,
        gender: adminData.gender ? parseInt(adminData.gender, 10) : null,
        picture: adminData.picture || null,
        password: adminData.password,
      },
      razorpay_order_id: paymentProof.orderId || null,
      razorpay_payment_id: paymentProof.paymentId || null,
      razorpay_signature: paymentProof.signature || null,
    };
  };

  const finalizeRegistrationAndRedirect = async (orderData, paymentProof = {}, isTrialAction = false) => {
    setStatusMessage('Provisioning institutional environment, license quotas, and Super Admin account...');
    const regPayload = buildRegistrationPayload(orderData, paymentProof, isTrialAction);
    const res = await saasApi.registerSchool(regPayload);
    const resData = res?.data || {};
    const resolvedOrderNo = resData.order_no || resData.orderNo || orderData?.order_no || '';

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          RESULT_STORAGE_KEY,
          JSON.stringify({
            handover_token: resData.handover_token || null,
            schoolId: resData.schoolId || null,
            schoolCode: resData.schoolCode || schoolProfileData.school_code || null,
            schoolName: schoolProfileData.school_name || null,
            adminEmail: resData.adminEmail || adminData.email || null,
            order_no: resolvedOrderNo,
            invoice_no: resData.invoice_no || resData.invoiceNo || null,
            order: resData.order || null,
          })
        );
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (storageErr) {
        console.warn('Could not store onboarding result in sessionStorage:', storageErr);
      }
    }

    setStatusMessage('Activation complete! Redirecting to your official receipt & portal launchpad...');
    router.push(`/payment/success?order_no=${encodeURIComponent(resolvedOrderNo)}`);
  };

  const executeOnboardingCheckout = async (isTrialAction = false) => {
    if (!selectedPlan) {
      setErrorMessage('Please select a subscription package before activating.');
      return;
    }

    // Validate minimum RFID and Notification quantities
    for (const c of cardsList) {
      const minQ = Math.max(1, parseInt(c.min_order_qty, 10) || 1);
      if (c.quantity < minQ) {
        setErrorMessage(`Minimum order quantity for "${c.card_name}" is ${minQ} pcs.`);
        return;
      }
    }
    for (const n of notificationsList) {
      const minQ = Math.max(1, parseInt(n.min_qty, 10) || 1);
      if (n.quantity < minQ) {
        setErrorMessage(`Minimum purchase quantity for "${n.pack_name || n.name || n.type}" is ${minQ} credits.`);
        return;
      }
    }

    if (hasPhysicalHardware && (!resolvedShippingAddress || resolvedShippingAddress.trim().length < 6)) {
      setErrorMessage('Please enter a complete Hardware Dispatch & Campus Delivery Address (minimum 6 characters).');
      return;
    }

    if (setIsTrialMode) setIsTrialMode(isTrialAction);

    try {
      setSubmitting(true);
      setErrorMessage('');

      // 1. Check account & contact availability
      setStatusMessage('Verifying contact and account availability...');
      const checkRes = await saasApi.checkAvailability({
        admin_email: adminData.email,
        admin_phone: adminData.phone,
        school_email: campusContactData.email,
        school_phone: campusContactData.phone_number,
      });
      if (checkRes?.data && !checkRes.data.available) {
        setErrorMessage(checkRes.data.message || 'The entered email or phone number is already registered.');
        setSubmitting(false);
        setStatusMessage('');
        return;
      }

      // 2. Check one-trial-ever eligibility when starting a Free Trial
      if (isTrialAction) {
        setStatusMessage('Verifying one-trial-ever institutional eligibility...');
        const eligRes = await saasApi.checkTrialEligibility({
          plan_id: selectedPlan.id,
          email: adminData.email || campusContactData.email,
          school_code: schoolProfileData.school_code || null,
          phone: campusContactData.phone_number || adminData.phone,
        });
        const eligData = eligRes?.data || eligRes;
        if (eligData && (eligData.is_eligible === false || eligData.eligible === false)) {
          setErrorMessage(
            eligData.reason ||
              'A free trial has already been claimed for this institution or contact. Please proceed with a paid plan.'
          );
          setSubmitting(false);
          setStatusMessage('');
          return;
        }
      }

      // 3. Create verified server-side checkout order intent (Zero GST)
      setStatusMessage('Preparing verified subscription order...');
      const trialStorageCycle = isTrialAction || isPureFreeOrTrial ? 'annual' : cycle || 'annual';
      const orderRes = await saasApi.createOrder({
        plan_id: selectedPlan.id,
        is_trial: isTrialAction,
        storage_plan_id: selectedStorageId || null,
        storage_qty: selectedStorageId ? 1 : 0,
        storage_billing_cycle: trialStorageCycle,
        selected_machines: machinesList.map((m) => ({ id: Number(m.id), quantity: Number(m.quantity) })),
        selected_cards: cardsList.map((c) => ({ id: Number(c.id), quantity: Number(c.quantity) })),
        selected_notifications: notificationsList.map((n) => ({
          id: Number(n.id),
          quantity: Number(n.quantity),
          type: n.type || n.channel,
        })),
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        shipping_address: hasPhysicalHardware
          ? resolvedShippingAddress.trim()
          : campusContactData.address || null,
        school_name: schoolProfileData.school_name,
        admin_email: adminData.email,
        admin_phone: adminData.phone,
        school_email: campusContactData.email,
        school_phone: campusContactData.phone_number,
        school: {
          school_name: schoolProfileData.school_name,
          school_code: schoolProfileData.school_code || null,
          address: campusContactData.address || null,
        },
      });

      const orderData = orderRes?.data || orderRes;

      // 4. Instant ₹0 Activation (pure Free Trial or 100%-Discount Coupon)
      if (orderData?.zero_amount_ready) {
        await finalizeRegistrationAndRedirect(orderData, {}, isTrialAction);
        return;
      }

      if (!orderData?.order_id) {
        throw new Error(orderRes?.message || 'Failed to initialize payment order with gateway.');
      }

      if (typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Payment gateway SDK is still loading. Please try again in a moment.');
      }

      setStatusMessage('Waiting for Razorpay payment authorization...');

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'GrowVidya School ERP',
        description: isTrialAction
          ? `Free Trial + Add-ons: ${selectedPlan.plan_name}`
          : `${cycleMeta.label || 'Subscription'}: ${selectedPlan.plan_name}`,
        order_id: orderData.order_id,
        prefill: {
          name: `${adminData.first_name || ''} ${adminData.last_name || ''}`.trim(),
          email: adminData.email || '',
          contact: adminData.phone || campusContactData.phone_number || '',
        },
        notes: {
          school_name: schoolProfileData.school_name || '',
          plan_id: String(selectedPlan.id),
          order_no: orderData.order_no || '',
        },
        theme: {
          color: '#0d6efd',
        },
        handler: async (response) => {
          try {
            setSubmitting(true);
            await finalizeRegistrationAndRedirect(
              orderData,
              {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
              isTrialAction
            );
          } catch (regErr) {
            console.error('Post-payment registration error:', regErr);
            setErrorMessage(
              regErr.response?.data?.message ||
                regErr.message ||
                'Payment was captured, but portal setup encountered an issue. Please contact support with Order Ref: ' +
                  (orderData.order_no || '')
            );
            setSubmitting(false);
            setStatusMessage('');
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setStatusMessage('');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async (resp) => {
        const errCode = resp?.error?.code || 'PAYMENT_FAILED';
        const errDesc =
          resp?.error?.description || 'Transaction was declined by your bank or payment gateway.';
        try {
          await saasApi.recordPaymentFailure({
            order_no: orderData.order_no,
            razorpay_order_id: resp?.error?.metadata?.order_id || orderData.order_id,
            razorpay_payment_id: resp?.error?.metadata?.payment_id || null,
            error_code: errCode,
            error_description: errDesc,
          });
        } catch {
          // Non-blocking audit log
        }
        setSubmitting(false);
        setStatusMessage('');
        router.push(
          `/payment/failed?order_no=${encodeURIComponent(
            orderData.order_no || ''
          )}&code=${encodeURIComponent(errCode)}&reason=${encodeURIComponent(errDesc)}`
        );
      });

      rzp.open();
    } catch (err) {
      console.error('Onboarding checkout error:', err);
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          'Unable to complete registration checkout. Please verify your details and try again.'
      );
      setSubmitting(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom">
        <div className="d-flex align-items-center gap-3">
          <div className="p-3 bg-primary-subtle text-primary rounded-3">
            <Sparkles size={26} />
          </div>
          <div>
            <h4 className="fw-bold text-dark mb-0">Review &amp; Institutional Activation</h4>
            <p className="text-muted fs-13 mb-0">
              Review your onboarding configuration and launch your institutional portal immediately.
            </p>
          </div>
        </div>

        {onEditPlan && (
          <button
            type="button"
            onClick={onEditPlan}
            disabled={submitting}
            className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-2"
          >
            <Edit3 size={14} />
            <span>Modify Plan / Add-ons</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <AlertCircle size={18} className="flex-shrink-0" />
          <div>{errorMessage}</div>
        </div>
      )}

      {statusMessage && (
        <div className="alert alert-info d-flex align-items-center gap-2 mb-4">
          <Loader2 size={18} className="animate-spin flex-shrink-0" />
          <div className="fw-semibold">{statusMessage}</div>
        </div>
      )}

      <div className="row g-4 mb-4">
        {/* Section 1: School Profile Summary */}
        <div className="col-12 col-md-6">
          <div className="p-3 bg-light rounded-3 border h-100">
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
              <span className="fw-bold text-dark fs-14 d-flex align-items-center gap-2">
                <School size={16} className="text-primary" />
                School Profile
              </span>
              {schoolProfileData.school_logo && (
                <img
                  src={schoolProfileData.school_logo}
                  alt="School Logo"
                  style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                  className="rounded border bg-white p-1"
                />
              )}
            </div>
            <div className="fs-13 d-flex flex-column gap-2">
              <div>
                <strong>Legal Name:</strong> {schoolProfileData.school_name}
              </div>
              <div>
                <strong>School Code:</strong> {schoolProfileData.school_code || 'Auto-generated'}
              </div>
              <div>
                <strong>School Type:</strong> {schoolProfileData.school_type || '—'}
              </div>
              <div>
                <strong>Affiliation Board:</strong>{' '}
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                  {schoolProfileData.affiliation_board || 'Not Specified'}
                </span>
              </div>
              <div>
                <strong>Medium of Instruction:</strong> {schoolProfileData.medium_of_instruction || '—'}
              </div>
              <div>
                <strong>Established Year:</strong> {schoolProfileData.established_year || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Campus & Contact Summary */}
        <div className="col-12 col-md-6">
          <div className="p-3 bg-light rounded-3 border h-100">
            <h6 className="fw-bold text-dark fs-14 mb-2 pb-2 border-bottom d-flex align-items-center gap-2">
              <Building2 size={16} className="text-primary" />
              Campus &amp; Contact
            </h6>
            <div className="fs-13 d-flex flex-column gap-2">
              <div>
                <strong>Helpline Phone:</strong> {campusContactData.phone_number || '—'}
              </div>
              <div>
                <strong>Official Email:</strong> {campusContactData.email || '—'}
              </div>
              <div>
                <strong>Official Website:</strong> {campusContactData.website || '—'}
              </div>
              <div>
                <strong>Physical Campus:</strong> {campusContactData.address || '—'}
              </div>
              <div>
                <strong>Location:</strong>{' '}
                {[
                  campusContactData.city_name,
                  campusContactData.state_name,
                  campusContactData.country_name,
                ]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </div>
              <div>
                <strong>Pincode:</strong> {campusContactData.postal_code || '—'}
              </div>
              {campusContactData.footer && (
                <div className="text-muted fs-12 mt-1 border-top pt-1 text-truncate">
                  <strong>Footer:</strong> {campusContactData.footer}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Academic Year Summary */}
        <div className="col-12 col-md-6">
          <div className="p-3 bg-light rounded-3 border h-100">
            <h6 className="fw-bold text-dark fs-14 mb-2 pb-2 border-bottom d-flex align-items-center gap-2">
              <Calendar size={16} className="text-primary" />
              Initial Academic Session
            </h6>
            <div className="fs-13 d-flex flex-column gap-2">
              <div>
                <strong>Session Name:</strong>{' '}
                <span className="fw-bold text-dark">{academicYearData.academic_year}</span>
              </div>
              <div>
                <strong>Start Date:</strong> {academicYearData.start_date}
              </div>
              <div>
                <strong>End Date:</strong> {academicYearData.end_date}
              </div>
              <div className="text-success fs-12 fw-semibold mt-1">
                ✓ Set as Default Current Academic Year
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Super Admin Summary */}
        <div className="col-12 col-md-6">
          <div className="p-3 bg-light rounded-3 border h-100">
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
              <span className="fw-bold text-dark fs-14 d-flex align-items-center gap-2">
                <UserCheck size={16} className="text-primary" />
                Super Admin Account
              </span>
              {adminData.picture && (
                <img
                  src={adminData.picture}
                  alt="Admin Photo"
                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                  className="rounded-circle border p-1 bg-white"
                />
              )}
            </div>
            <div className="fs-13 d-flex flex-column gap-2">
              <div>
                <strong>Admin Name:</strong> {adminData.first_name} {adminData.last_name || ''}
              </div>
              <div>
                <strong>Login Username:</strong> {adminData.email}
              </div>
              <div>
                <strong>Mobile Phone:</strong> {adminData.phone || '—'}
              </div>
              <div>
                <strong>Gender:</strong> {adminData.gender_name || 'Not Specified'}
              </div>
            </div>
          </div>
        </div>

        {/* Hardware Shipping Address (Required when Biometric Machines or RFID Cards are selected) */}
        {hasPhysicalHardware && (
          <div className="col-12">
            <div className="p-3 bg-warning-subtle bg-opacity-25 rounded-3 border border-warning-subtle">
              <label className="form-label fw-bold text-dark d-flex align-items-center gap-2 mb-1">
                <Truck size={17} className="text-primary" />
                <span>Hardware Dispatch &amp; Campus Delivery Address *</span>
              </label>
              <p className="text-muted fs-12 mb-2">
                Your order includes physical attendance hardware or smart RFID cards. Confirm the exact delivery address for courier dispatch:
              </p>
              <textarea
                rows={2}
                className="form-control bg-white"
                placeholder="Enter full school street address, landmark, city, state, and PIN code..."
                value={resolvedShippingAddress}
                onChange={(e) => setShippingAddress && setShippingAddress(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        )}

        {/* Section 5: Plan & Pricing Summary (Flat Net Pricing — Zero GST) */}
        <div className="col-12">
          <div className="p-4 bg-white rounded-3 border">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom gap-2">
              <div>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fs-11 fw-bold text-uppercase mb-1">
                  Selected Package &amp; Customizations
                </span>
                <h5 className="fw-bold text-dark mb-0">{selectedPlan?.plan_name}</h5>
                <span className="text-muted fs-13">
                  {hasTrialOption
                    ? `${cycleMeta.label} License • Includes ${trialDays}-Day Free Trial Option`
                    : isPureFreeOrTrial
                    ? `Free Evaluation Access${trialDays > 0 ? ` (${trialDays} Days)` : ''}`
                    : `${cycleMeta.label} License • Unlimited Teachers & Branches • ${Math.max(
                        0,
                        parseInt(selectedPlan?.included_storage_gb, 10) || 0
                      )} GB Base Cloud Storage`}
                </span>
              </div>
              <div className="text-end">
                <span className="fs-20 fw-bold text-primary">
                  {displaySubtotal <= 0
                    ? 'Free'
                    : `₹${Number(displaySubtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
                <div className="text-muted fs-11">Flat Net Pricing</div>
              </div>
            </div>

            {/* Scoped Coupon Code Input */}
            {(paidSubtotal > 0 || addonsTotal > 0) && (
              <div className="p-3 bg-light rounded-3 border mb-3">
                <div className="row g-2 align-items-center justify-content-between">
                  <div className="col-12 col-md-6">
                    <div className="d-flex align-items-center gap-2 fw-bold text-dark fs-13 mb-1">
                      <Tag size={15} className="text-primary flex-shrink-0" />
                      <span>Have a Promotional or Institutional Coupon?</span>
                    </div>
                    <div className="text-muted fs-12">
                      Apply your discount code before proceeding to activation.
                    </div>
                  </div>

                  <div className="col-12 col-md-5">
                    <div className="input-group">
                      <span className="input-group-text bg-white text-muted">
                        <Tag size={15} />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => {
                          if (setCouponCode) setCouponCode(e.target.value.toUpperCase());
                          if (couponError) setCouponError('');
                        }}
                        disabled={Boolean(appliedCoupon) || submitting}
                      />
                      {appliedCoupon ? (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={handleRemoveCoupon}
                          disabled={submitting}
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleApplyCoupon}
                          disabled={validatingCoupon || !couponCode.trim() || submitting}
                        >
                          {validatingCoupon ? (
                            <>
                              <Loader2 size={14} className="animate-spin me-1 inline" />
                              <span>Checking...</span>
                            </>
                          ) : (
                            'Apply'
                          )}
                        </button>
                      )}
                    </div>
                    {couponError && <div className="text-danger fs-12 mt-1">{couponError}</div>}
                    {appliedCoupon && (
                      <div className="text-success fs-12 fw-semibold mt-1">
                        ✓ Coupon <strong>{appliedCoupon.code}</strong> applied (
                        {appliedCoupon.applicable_scope === 'all'
                          ? 'Applies to Full Order'
                          : appliedCoupon.applicable_scope === 'software_and_storage'
                          ? 'Applies to Software & Storage'
                          : 'Applies to Base Plan'}
                        ) — You save ₹{Number(displayDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Itemized Net Receipt Breakdown (Zero GST) */}
            <div className="pt-2">
              <h6 className="fw-bold text-dark fs-13 text-uppercase mb-3">
                Itemized Order Summary:
              </h6>

              <div className="d-flex flex-column gap-2 fs-14">
                <div className="d-flex justify-content-between text-dark">
                  <span>
                    Base Platform License ({selectedPlan?.plan_name}
                    {isPureFreeOrTrial ? ' — Free Trial' : ` — ${cycleMeta.label}`}):
                  </span>
                  <span className="fw-semibold">
                    {isPureFreeOrTrial || basePrice <= 0
                      ? '₹0.00'
                      : `₹${Number(basePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </span>
                </div>

                {selectedStorage && (
                  <div className="d-flex justify-content-between text-dark">
                    <span>
                      Cloud Storage Expansion ({selectedStorage.plan_name} — +{selectedStorage.storage_capacity}{' '}
                      {selectedStorage.unit_code || 'GB'}):
                    </span>
                    <span className="fw-semibold">
                      +₹{Number(storagePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {machinesList.map((m) => (
                  <div key={m.id} className="d-flex justify-content-between text-dark">
                    <span>
                      Attendance Terminal ({m.machine_name} × {m.quantity}):
                    </span>
                    <span className="fw-semibold">
                      +₹{Number(m.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}

                {cardsList.length === 1 ? (
                  <div className="d-flex justify-content-between text-dark">
                    <span>
                      Smart RFID Cards ({cardsList[0].card_name} × {cardsList[0].quantity}):
                    </span>
                    <span className="fw-semibold">
                      +₹{Number(cardsList[0].total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : cardsList.length > 1 ? (
                  <div className="d-flex justify-content-between text-dark">
                    <div>
                      <span>
                        Smart RFID Cards (Total: {cardsList.reduce((sum, c) => sum + c.quantity, 0)} cards):
                      </span>
                      <div className="text-muted fs-12 mt-1">
                        {cardsList.map((c, i) => (
                          <span key={c.id}>
                            {i > 0 && <span className="mx-1">•</span>}
                            {c.card_name}: {c.quantity} pcs @ ₹{c.unitPrice.toLocaleString('en-IN')}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="flex-shrink-0 ms-2 fw-semibold">
                      +₹{Number(cardsTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : null}

                {notificationsList.map((n) => (
                  <div key={n.id} className="d-flex justify-content-between text-dark">
                    <span>
                      Prepaid {n.pack_name || n.name || `${String(n.type || n.channel || '').toUpperCase()} Credits`} (×{' '}
                      {n.quantity.toLocaleString('en-IN')}):
                    </span>
                    <span className="fw-semibold">
                      +₹{Number(n.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}

                {displayDiscount > 0 && (
                  <div className="d-flex justify-content-between text-success fw-semibold">
                    <span>Coupon Discount ({appliedCoupon?.code}):</span>
                    <span>
                      -₹{Number(displayDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-baseline pt-3 border-top mt-1">
                  <div>
                    <span className="fw-bold text-dark fs-16 d-block">Net Total Payable:</span>
                    <span className="text-muted fs-11">
                      Instant portal provisioning &amp; official receipt upon confirmation
                    </span>
                  </div>
                  <span className="display-6 fw-bold text-success">
                    ₹{Number(displayFinalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Navigation Buttons */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pt-4 border-top mt-4">
        <button
          type="button"
          className="btn btn-outline-secondary px-4 py-2 fw-semibold fs-14"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </button>

        <div className="d-flex flex-wrap align-items-center gap-3 ms-auto">
          {hasTrialOption ? (
            <>
              <button
                type="button"
                className="btn btn-outline-success px-4 py-2 fw-semibold fs-14"
                onClick={() => executeOnboardingCheckout(true)}
                disabled={submitting}
              >
                {submitting && isTrialMode ? (
                  <span className="d-inline-flex align-items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : trialPayable > 0 ? (
                  `Start ${trialDays}-Day Free Trial (Pay ₹${Number(trialPayable).toLocaleString('en-IN')} Add-ons)`
                ) : (
                  `Start ${trialDays}-Day Free Trial (₹0)`
                )}
              </button>

              <button
                type="button"
                className="btn btn-primary px-4 py-2 fw-semibold fs-14 shadow-sm"
                onClick={() => executeOnboardingCheckout(false)}
                disabled={submitting}
              >
                {submitting && !isTrialMode ? (
                  <span className="d-inline-flex align-items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : finalPaidAmount <= 0 ? (
                  `Activate ${selectedPlan?.plan_name} Now (₹0)`
                ) : (
                  `Pay ₹${Number(finalPaidAmount).toLocaleString('en-IN')} & Activate`
                )}
              </button>
            </>
          ) : isPureFreeOrTrial ? (
            <button
              type="button"
              className="btn btn-primary px-4 py-2 fw-semibold fs-14 shadow-sm"
              onClick={() => executeOnboardingCheckout(true)}
              disabled={submitting}
            >
              {submitting ? (
                <span className="d-inline-flex align-items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Activating...</span>
                </span>
              ) : trialPayable > 0 ? (
                `Activate Free Trial & Pay ₹${Number(trialPayable).toLocaleString('en-IN')} Add-ons`
              ) : trialDays > 0 ? (
                `Activate ${trialDays}-Day Free Trial (₹0)`
              ) : (
                'Activate Free Plan (₹0)'
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary px-4 py-2 fw-semibold fs-14 shadow-sm"
              onClick={() => executeOnboardingCheckout(false)}
              disabled={submitting}
            >
              {submitting ? (
                <span className="d-inline-flex align-items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </span>
              ) : finalPaidAmount <= 0 ? (
                `Activate ${selectedPlan?.plan_name} Now (₹0)`
              ) : (
                `Pay ₹${Number(finalPaidAmount).toLocaleString('en-IN')} & Activate`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

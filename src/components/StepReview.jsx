'use client';

import React, { useState } from 'react';
import {
  Check,
  Tag,
  Loader2,
  Sparkles,
  AlertCircle,
  School,
  Building2,
  Calendar,
  UserCheck,
} from 'lucide-react';
import saasApi from '../lib/api';

export default function StepReview({
  selectedPlan,
  catalog = {},
  selectedStorageId = null,
  selectedMachines = {},
  selectedCards = {},
  selectedNotifications = {},
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
}) {
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const trialDays =
    selectedPlan?.free_trial_days !== undefined && selectedPlan?.free_trial_days !== null
      ? parseInt(selectedPlan.free_trial_days, 10)
      : 0;
  const isPureFreeOrTrial =
    selectedPlan?.billing_cycle === 'trial' || parseFloat(selectedPlan?.price || 0) === 0;
  const hasTrialOption = trialDays > 0 && !isPureFreeOrTrial;
  const basePrice = parseFloat(selectedPlan?.price || 0);
  const cycle = selectedPlan?.billing_cycle || 'annual';

  // Add-ons data & calculations
  const storagePlans = catalog?.storage_plans || [];
  const attendanceMachines = catalog?.attendance_machines || [];
  const rfidCards = catalog?.rfid_cards || [];
  const notificationRecords = catalog?.notification_records || [];

  const selectedStorage = storagePlans.find((s) => s.id === Number(selectedStorageId)) || null;
  const storagePrice = selectedStorage
    ? (cycle === 'monthly' ? parseFloat(selectedStorage.monthly_price || 0) : parseFloat(selectedStorage.annual_price || 0))
    : 0;

  const machinesList = Object.entries(selectedMachines || {}).map(([id, qty]) => {
    const m = attendanceMachines.find((item) => Number(item.id) === Number(id));
    if (!m || qty <= 0) return null;
    const unitPrice = parseFloat(m.unit_price || 0);
    return { ...m, quantity: qty, unitPrice, total: unitPrice * qty };
  }).filter(Boolean);

  const machinesTotal = machinesList.reduce((sum, item) => sum + item.total, 0);

  const cardsList = Object.entries(selectedCards || {}).map(([id, qty]) => {
    const c = rfidCards.find((item) => Number(item.id) === Number(id));
    if (!c || qty <= 0) return null;
    const unitPrice = parseFloat(c.unit_price || 0);
    return { ...c, quantity: qty, unitPrice, total: unitPrice * qty };
  }).filter(Boolean);

  const cardsTotal = cardsList.reduce((sum, item) => sum + item.total, 0);

  const notificationsList = Object.entries(selectedNotifications || {}).map(([id, cfg]) => {
    if (!cfg?.selected || !cfg?.quantity) return null;
    const n = notificationRecords.find((item) => Number(item.id) === Number(id));
    if (!n) return null;
    const unitPrice = parseFloat(n.cost || 0);
    const total = Math.round(unitPrice * cfg.quantity * 100) / 100;
    return { ...n, quantity: cfg.quantity, unitPrice, total };
  }).filter(Boolean);

  const notificationsTotal = notificationsList.reduce((sum, item) => sum + item.total, 0);

  const addonsTotal = storagePrice + machinesTotal + cardsTotal + notificationsTotal;
  const subtotal = basePrice + addonsTotal;
  const discountAmount = appliedCoupon ? parseFloat(appliedCoupon.discountAmount || 0) : 0;
  const finalAmount = Math.max(0, subtotal - discountAmount);
  const trialPayable = addonsTotal;

  // GST Breakdown (18% inclusive inside the plan & addons: 9% CGST + 9% SGST)
  const taxableBase = finalAmount > 0 ? Math.round((finalAmount / 1.18) * 100) / 100 : 0;
  const totalGst = finalAmount > 0 ? Math.round((finalAmount - taxableBase) * 100) / 100 : 0;
  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const sgst = Math.round((totalGst - cgst) * 100) / 100;

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:5174';

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setValidatingCoupon(true);
      setCouponError('');
      const res = await saasApi.validateCoupon(couponCode.trim(), subtotal);
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

  const handleCompleteRegistration = async (paymentProof = {}, isTrialAction = false) => {
    try {
      setSubmitting(true);
      setErrorMessage('');

      setStatusMessage('Verifying contact and account availability...');
      try {
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
      } catch (checkErr) {
        const errMsg = checkErr.response?.data?.message || checkErr.message;
        if (errMsg) {
          setErrorMessage(errMsg);
          setSubmitting(false);
          setStatusMessage('');
          return;
        }
      }

      if (isTrialAction) {
        setStatusMessage('Verifying free trial eligibility with backend server...');
        try {
          const eligRes = await saasApi.checkTrialEligibility({
            plan_id: selectedPlan.id,
            email: adminData.email,
            school_code: schoolProfileData.school_code,
            phone: campusContactData.phone_number || adminData.phone,
          });
          if (eligRes?.data && eligRes.data.is_eligible === false) {
            setErrorMessage(eligRes.data.reason || 'You are not eligible for a free trial on this plan.');
            setSubmitting(false);
            setStatusMessage('');
            return;
          }
        } catch (eligErr) {
          const errMsg = eligErr.response?.data?.message || eligErr.message;
          setErrorMessage(errMsg || 'Failed to verify free trial eligibility.');
          setSubmitting(false);
          setStatusMessage('');
          return;
        }
      }

      setStatusMessage('Provisioning institutional environment, campus schema, and database...');
      const payload = {
        plan_id: selectedPlan.id,
        is_trial: isTrialAction,
        amount_paid: isTrialAction ? (addonsTotal > 0 ? addonsTotal : 0) : finalAmount,
        storage_plan_id: selectedStorageId || null,
        storage_qty: 1,
        selected_machines: machinesList.map((m) => ({ id: m.id, quantity: m.quantity })),
        selected_cards: cardsList.map((c) => ({ id: c.id, quantity: c.quantity })),
        selected_notifications: notificationsList.map((n) => ({ id: n.id, quantity: n.quantity, type: n.type })),
        shipping_address: campusContactData.address,
        coupon_code: !isTrialAction && appliedCoupon ? appliedCoupon.code : null,
        school: {
          school_name: schoolProfileData.school_name,
          school_code: schoolProfileData.school_code || null,
          school_type: schoolProfileData.school_type || null,
          affiliation_board: schoolProfileData.affiliation_board || null,
          medium_of_instruction: schoolProfileData.medium_of_instruction || null,
          established_year: schoolProfileData.established_year || null,
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
        payment_gateway: isTrialAction ? (addonsTotal > 0 ? 'razorpay' : 'free_trial') : 'razorpay',
        payment_transaction_id: paymentProof.paymentId || (isTrialAction && addonsTotal === 0 ? `TRIAL_${trialDays || 14}D_${Date.now()}` : null),
        razorpay_order_id: paymentProof.orderId || null,
        razorpay_payment_id: paymentProof.paymentId || null,
        razorpay_signature: paymentProof.signature || null,
      };

      const res = await saasApi.registerSchool(payload);
      const resData = res?.data || {};

      setStatusMessage('✨ Registration successful! Handing over session to School Portal...');

      const handoverToken = resData.handover_token;
      if (handoverToken) {
        setTimeout(() => {
          window.location.href = `${portalUrl}/auth/callback?token=${encodeURIComponent(handoverToken)}`;
        }, 1200);
      } else {
        setTimeout(() => {
          window.location.href = `${portalUrl}/account/login/adminlogin?registered=1&email=${encodeURIComponent(adminData.email)}`;
        }, 1500);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setErrorMessage(
        err.response?.data?.message || 'Registration failed. Please verify your details and try again.'
      );
      setSubmitting(false);
      setStatusMessage('');
    }
  };

  const handleActivateTrial = async () => {
    if (setIsTrialMode) setIsTrialMode(true);

    if (addonsTotal > 0) {
      // Need to checkout and pay for configured add-ons via Razorpay
      try {
        setSubmitting(true);
        setErrorMessage('');
        setStatusMessage('Initializing payment gateway for selected add-ons & hardware...');

        const orderRes = await saasApi.createOrder({
          plan_id: selectedPlan.id,
          is_trial: true,
          storage_plan_id: selectedStorageId || null,
          storage_qty: 1,
          selected_machines: machinesList.map((m) => ({ id: m.id, quantity: m.quantity })),
          selected_cards: cardsList.map((c) => ({ id: c.id, quantity: c.quantity })),
          selected_notifications: notificationsList.map((n) => ({ id: n.id, quantity: n.quantity, type: n.type })),
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          admin_email: adminData.email,
          admin_phone: adminData.phone,
          school_email: campusContactData.email,
          school_phone: campusContactData.phone_number,
        });

        const orderData = orderRes?.data;
        if (!orderData?.order_id) {
          throw new Error('Failed to create payment order for add-ons.');
        }

        if (typeof window === 'undefined' || !window.Razorpay) {
          throw new Error('Payment gateway SDK is loading. Please try again in a few moments.');
        }

        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Growvidya Platform',
          description: `Add-ons & Free Trial: ${selectedPlan.plan_name}`,
          order_id: orderData.order_id,
          prefill: {
            name: `${adminData.first_name} ${adminData.last_name || ''}`.trim(),
            email: adminData.email,
            contact: adminData.phone || '',
          },
          theme: { color: '#0d6efd' },
          handler: async (response) => {
            await handleCompleteRegistration(
              {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
              true
            );
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              setStatusMessage('');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        console.error('Payment error for add-ons:', err);
        setErrorMessage(err.message || 'Payment processing failed. Please try again.');
        setSubmitting(false);
        setStatusMessage('');
      }
    } else {
      await handleCompleteRegistration({}, true);
    }
  };

  const handlePayAndActivate = async () => {
    if (setIsTrialMode) setIsTrialMode(false);

    try {
      setSubmitting(true);
      setErrorMessage('');

      setStatusMessage('Verifying contact and account availability...');
      try {
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
      } catch (checkErr) {
        const errMsg = checkErr.response?.data?.message || checkErr.message;
        if (errMsg) {
          setErrorMessage(errMsg);
          setSubmitting(false);
          setStatusMessage('');
          return;
        }
      }

      setStatusMessage('Initializing secure Razorpay payment gateway...');

      const orderRes = await saasApi.createOrder({
        plan_id: selectedPlan.id,
        is_trial: false,
        storage_plan_id: selectedStorageId || null,
        storage_qty: 1,
        selected_machines: machinesList.map((m) => ({ id: m.id, quantity: m.quantity })),
        selected_cards: cardsList.map((c) => ({ id: c.id, quantity: c.quantity })),
        selected_notifications: notificationsList.map((n) => ({ id: n.id, quantity: n.quantity, type: n.type })),
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        admin_email: adminData.email,
        admin_phone: adminData.phone,
        school_email: campusContactData.email,
        school_phone: campusContactData.phone_number,
      });

      const orderData = orderRes?.data;
      if (!orderData?.order_id) {
        throw new Error('Failed to create payment order. Please contact support.');
      }

      if (typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Payment gateway SDK is loading. Please try again in a few moments.');
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Growvidya Platform',
        description: `Activation: ${selectedPlan.plan_name}`,
        order_id: orderData.order_id,
        prefill: {
          name: `${adminData.first_name} ${adminData.last_name || ''}`.trim(),
          email: adminData.email,
          contact: adminData.phone || '',
        },
        theme: {
          color: '#0d6efd',
        },
        handler: async (response) => {
          await handleCompleteRegistration(
            {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            },
            false
          );
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setStatusMessage('');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
      setSubmitting(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div className="p-2.5 bg-primary-subtle text-primary rounded-3">
          <Sparkles size={26} />
        </div>
        <div>
          <h4 className="fw-bold text-dark mb-0">Review &amp; Institutional Activation</h4>
          <p className="text-muted fs-13 mb-0">
            Review all six onboarding sections and launch your institutional portal.
          </p>
        </div>
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
                  className="rounded border bg-white p-0.5"
                />
              )}
            </div>
            <div className="fs-13 d-flex flex-column gap-1.5">
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
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5">
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
            <div className="fs-13 d-flex flex-column gap-1.5">
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
            <div className="fs-13 d-flex flex-column gap-1.5">
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
                  className="rounded-circle border p-0.5 bg-white"
                />
              )}
            </div>
            <div className="fs-13 d-flex flex-column gap-1.5">
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
                <strong>Gender:</strong>{' '}
                {adminData.gender_name ||
                  (String(adminData.gender) === '1'
                    ? 'Male'
                    : String(adminData.gender) === '2'
                    ? 'Female'
                    : String(adminData.gender) === '3'
                    ? 'Others'
                    : 'Not Specified')}
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Plan & Pricing Summary with Itemized Add-ons & GST Breakdown */}
        <div className="col-12">
          <div className="p-4 bg-white rounded-3 border">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1 fs-11 fw-bold text-uppercase mb-1">
                  Selected Package &amp; Customizations
                </span>
                <h5 className="fw-bold text-dark mb-0">{selectedPlan.plan_name}</h5>
                <span className="text-muted fs-13">
                  {hasTrialOption
                    ? `Billed ${cycle} • Includes ${trialDays}-Day Free Trial Bonus`
                    : isPureFreeOrTrial
                    ? `Free Evaluation Access (${trialDays > 0 ? `${trialDays} Days` : 'No Credit Card Required'})`
                    : `Billed ${cycle}`}
                </span>
              </div>
              <div className="text-end">
                <span className="fs-20 fw-bold text-primary">
                  {subtotal === 0 ? 'Free' : `₹${Number(subtotal).toLocaleString('en-IN')}`}
                </span>
                {subtotal > 0 && (
                  <div className="text-muted fs-11">
                    (18% GST Included)
                  </div>
                )}
              </div>
            </div>

            {/* Coupon Code Input for Paid Subtotals */}
            {subtotal > 0 && (
              <div className="p-3 bg-light rounded-3 border mb-3">
                <div className="row g-2 align-items-center justify-content-between">
                  <div className="col-12 col-md-6">
                    <div className="d-flex align-items-center gap-1.5 fw-bold text-dark fs-13 mb-1">
                      <Tag size={15} className="text-primary flex-shrink-0" />
                      <span>Have a Coupon or Promo Code?</span>
                    </div>
                    <div className="text-muted fs-12">
                      Apply your institutional discount code to reduce your subscription fee.
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
                        disabled={Boolean(appliedCoupon)}
                      />
                      {appliedCoupon ? (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={handleRemoveCoupon}
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleApplyCoupon}
                          disabled={validatingCoupon || !couponCode.trim()}
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
                        ✓ Coupon <strong>{appliedCoupon.code}</strong> applied! You save ₹{Number(discountAmount).toLocaleString('en-IN')}.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pricing & GST Tax Breakdown */}
            <div className="pt-2">
              <h6 className="fw-bold text-dark fs-13 text-uppercase mb-2.5">
                Itemized Receipt &amp; Tax Breakdown:
              </h6>

              <div className="d-flex flex-column gap-2 fs-14">
                <div className="d-flex justify-content-between text-muted">
                  <span>Base Platform License ({selectedPlan.plan_name}):</span>
                  <span>{basePrice === 0 ? '₹0.00' : `₹${Number(basePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
                </div>

                {selectedStorage && (
                  <div className="d-flex justify-content-between text-dark">
                    <span>Cloud Storage Expansion ({selectedStorage.plan_name}):</span>
                    <span>+₹{Number(storagePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {machinesList.map((m) => (
                  <div key={m.id} className="d-flex justify-content-between text-dark">
                    <span>Attendance Terminal ({m.machine_name} x {m.quantity}):</span>
                    <span>+₹{Number(m.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                {cardsList.map((c) => (
                  <div key={c.id} className="d-flex justify-content-between text-dark">
                    <span>Smart RFID Cards ({c.card_name} x {c.quantity}):</span>
                    <span>+₹{Number(c.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                {notificationsList.map((n) => (
                  <div key={n.id} className="d-flex justify-content-between text-dark">
                    <span>Notification Credits ({n.type?.toUpperCase()} x {n.quantity.toLocaleString()}):</span>
                    <span>+₹{Number(n.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                {discountAmount > 0 && (
                  <div className="d-flex justify-content-between text-success">
                    <span>Coupon Discount ({appliedCoupon?.code}):</span>
                    <span>- ₹{Number(discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {finalAmount > 0 && (
                  <>
                    <div className="d-flex justify-content-between text-muted pt-2 border-top">
                      <span>Net Taxable Base Amount:</span>
                      <span>₹{taxableBase.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="d-flex justify-content-between text-muted ps-2 border-start border-2 border-primary-subtle">
                      <span>CGST (9% Included):</span>
                      <span>₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="d-flex justify-content-between text-muted ps-2 border-start border-2 border-primary-subtle">
                      <span>SGST (9% Included):</span>
                      <span>₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="d-flex justify-content-between text-muted fst-italic fs-12 ps-2">
                      <span>Total Included GST (18% inside package):</span>
                      <span>₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}

                {finalAmount === 0 && (
                  <div className="d-flex justify-content-between text-muted fst-italic fs-13 pt-1 border-top">
                    <span>Applicable GST / Taxes:</span>
                    <span>₹0.00 (Free Evaluation Access)</span>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-baseline pt-2 border-top mt-1">
                  <div>
                    <span className="fw-bold text-dark fs-16 d-block">
                      Total Package Payable:
                    </span>
                    {finalAmount > 0 && (
                      <span className="text-muted fs-11">(All taxes &amp; 18% GST inclusive)</span>
                    )}
                  </div>
                  <span className="display-6 fw-bold text-success">
                    ₹{Number(finalAmount).toLocaleString('en-IN')}
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
          className="btn btn-outline-secondary px-4 py-2.5 fw-semibold fs-14"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </button>

        <div className="d-flex flex-wrap align-items-center gap-3 ms-auto">
          {/* Dual Action Buttons for Plans offering both Free Trial and Paid Upfront */}
          {hasTrialOption ? (
            <>
              <button
                type="button"
                className="btn btn-outline-success px-4 py-2.5 fw-semibold fs-14"
                onClick={handleActivateTrial}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="d-inline-flex align-items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  addonsTotal > 0
                    ? `Start ${trialDays}-Day Free Trial (Pay ₹${Number(trialPayable).toLocaleString('en-IN')} for Hardware/Add-ons)`
                    : `Start ${trialDays}-Day Free Trial (₹0)`
                )}
              </button>

              <button
                type="button"
                className="btn btn-primary px-4 py-2.5 fw-semibold fs-14 shadow-sm"
                onClick={handlePayAndActivate}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="d-inline-flex align-items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  `Pay ₹${Number(finalAmount).toLocaleString('en-IN')} & Activate`
                )}
              </button>
            </>
          ) : isPureFreeOrTrial || trialDays > 0 ? (
            /* Pure Trial or 100% Free Plan */
            <button
              type="button"
              className="btn btn-primary px-4 py-2.5 fw-semibold fs-14 shadow-sm"
              onClick={handleActivateTrial}
              disabled={submitting}
            >
              {submitting ? (
                <span className="d-inline-flex align-items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Activating...</span>
                </span>
              ) : (
                addonsTotal > 0
                  ? `Activate Free Plan & Pay ₹${Number(trialPayable).toLocaleString('en-IN')} Add-ons`
                  : trialDays > 0 ? `Activate ${trialDays}-Day Free Trial` : 'Activate Free Plan'
              )}
            </button>
          ) : (
            /* Standard Paid Plan without Free Trial */
            <button
              type="button"
              className="btn btn-primary px-4 py-2.5 fw-semibold fs-14 shadow-sm"
              onClick={handlePayAndActivate}
              disabled={submitting}
            >
              {submitting ? (
                <span className="d-inline-flex align-items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </span>
              ) : (
                `Pay ₹${Number(finalAmount).toLocaleString('en-IN')} & Activate`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

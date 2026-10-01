'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Tag,
  Loader2,
  Sparkles,
  AlertCircle,
  School,
  Building2,
  Calendar,
  UserCheck,
  CreditCard,
  Phone,
  Mail,
  Globe,
  MapPin,
  Award,
  BookOpen,
  Languages,
} from 'lucide-react';
import saasApi from '../lib/api';

export default function StepReview({
  selectedPlan,
  schoolProfileData,
  campusContactData,
  academicYearData,
  adminData,
  onBack,
}) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isTrial = selectedPlan.billing_cycle === 'trial' || parseFloat(selectedPlan.price) === 0;
  const basePrice = parseFloat(selectedPlan.price || 0);
  const discountAmount = appliedCoupon ? parseFloat(appliedCoupon.discountAmount || 0) : 0;
  const finalAmount = Math.max(0, basePrice - discountAmount);

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:5174';

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setValidatingCoupon(true);
      setCouponError('');
      const res = await saasApi.validateCoupon(couponCode.trim(), basePrice);
      if (res?.data) {
        setAppliedCoupon(res.data);
      } else {
        setCouponError(res?.message || 'Invalid coupon code.');
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Failed to validate coupon.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCompleteRegistration = async (paymentProof = {}) => {
    try {
      setSubmitting(true);
      setErrorMessage('');
      setStatusMessage('Provisioning institutional environment, campus schema, and database...');
      const payload = {
        plan_id: selectedPlan.id,
        is_trial: isTrial,
        amount_paid: finalAmount,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
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
        payment_gateway: isTrial ? 'trial' : 'razorpay',
        payment_transaction_id: paymentProof.paymentId || (isTrial ? `TRIAL_${Date.now()}` : null),
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

  const handleInitiatePayment = async () => {
    if (isTrial) {
      await handleCompleteRegistration();
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage('Initializing secure Razorpay payment gateway...');
      setErrorMessage('');

      const orderRes = await saasApi.createOrder({
        plan_id: selectedPlan.id,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
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
          await handleCompleteRegistration({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
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
              <div className="text-success fs-12 fw-semibold mt-1">
                ✓ Unrestricted Super Administrator Privileges
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Plan & Pricing Summary */}
        <div className="col-12">
          <div className="p-4 bg-white rounded-3 border">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1 fs-11 fw-bold text-uppercase mb-1">
                  Selected Package
                </span>
                <h5 className="fw-bold text-dark mb-0">{selectedPlan.plan_name}</h5>
                <span className="text-muted fs-13">
                  {isTrial ? '14-Day Free Evaluation Access (No Credit Card Required)' : `Billed ${selectedPlan.billing_cycle || 'monthly'}`}
                </span>
              </div>
              <div className="text-end">
                <span className="fs-20 fw-bold text-primary">
                  {isTrial ? '₹0' : `₹${Number(basePrice).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>

            {/* Coupon Code Input for Paid Plans */}
            {!isTrial && (
              <div className="row g-2 align-items-center mb-3">
                <div className="col-sm-8 col-md-6">
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted">
                      <Tag size={16} />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter promo / coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={Boolean(appliedCoupon)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim() || Boolean(appliedCoupon)}
                    >
                      {validatingCoupon ? 'Checking...' : appliedCoupon ? 'Applied' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <div className="text-danger fs-12 mt-1">{couponError}</div>}
                  {appliedCoupon && (
                    <div className="text-success fs-12 mt-1">
                      ✓ Coupon {appliedCoupon.code} applied! ₹{Number(discountAmount).toLocaleString('en-IN')} off.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Total Calculation */}
            <div className="pt-2 border-top">
              {!isTrial && discountAmount > 0 && (
                <div className="d-flex justify-content-between text-muted fs-14 mb-1">
                  <span>Discount:</span>
                  <span className="text-success">- ₹{Number(discountAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="d-flex justify-content-between align-items-baseline">
                <span className="fw-bold text-dark fs-16">Total Amount Payable:</span>
                <span className="display-6 fw-bold text-success">
                  {isTrial ? '₹0' : `₹${Number(finalAmount).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Navigation Buttons */}
      <div className="d-flex justify-content-between pt-4 border-top">
        <button
          type="button"
          className="btn btn-outline-secondary px-4 py-2.5 fw-semibold d-flex align-items-center gap-2"
          onClick={onBack}
          disabled={submitting}
        >
          <ArrowLeft size={16} />
          <span>Back: Super Admin</span>
        </button>

        <button
          type="button"
          className={`btn ${isTrial ? 'btn-success' : 'btn-primary'} px-5 py-2.5 fw-semibold d-flex align-items-center gap-2 shadow-sm`}
          onClick={handleInitiatePayment}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Processing Activation...</span>
            </>
          ) : isTrial ? (
            <>
              <span>🚀 Activate 14-Day Free Trial</span>
            </>
          ) : (
            <>
              <span>💳 Pay ₹{Number(finalAmount).toLocaleString('en-IN')} &amp; Activate</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

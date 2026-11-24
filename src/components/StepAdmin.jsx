'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  UserCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import saasApi from '../lib/api';

export default function StepAdmin({
  formData,
  setFormData,
  onNext,
  onBack,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(formData.picture || null);
  const [genders, setGenders] = useState([]);
  const [loadingGenders, setLoadingGenders] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [errors, setErrors] = useState({});

  // Email OTP Verification State
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpSentEmail, setOtpSentEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');
  const [otpErrorMsg, setOtpErrorMsg] = useState('');

  const cleanCurrentEmail = (formData.email || '').trim().toLowerCase();
  const isValidEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanCurrentEmail);
  const isCurrentEmailVerified = Boolean(
    formData.email_verified &&
      formData.email_verification_token &&
      formData.verified_email &&
      String(formData.verified_email).trim().toLowerCase() === cleanCurrentEmail
  );
  const isOtpModalOpen = Boolean(showOtpModal && otpSent && !isCurrentEmailVerified);
  const otpModalRef = useRef(null);
  const emailInputRef = useRef(null);

  useEffect(() => {
    fetchGenders();
  }, []);

  const handleCloseOtpModal = () => {
    setShowOtpModal(false);
    setOtpCode('');
    setOtpErrorMsg('');
    setOtpSuccessMsg('');
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 0);
  };

  // Lock page scroll and trap focus inside the OTP verification modal
  useEffect(() => {
    if (!isOtpModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'Tab' && otpModalRef.current) {
        const focusable = otpModalRef.current.querySelectorAll(
          'input:not([disabled]), button:not([disabled])'
        );
        if (focusable.length === 0) return;
        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];
        if (!otpModalRef.current.contains(document.activeElement)) {
          e.preventDefault();
          firstEl.focus();
        } else if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOtpModalOpen]);

  const fetchGenders = async () => {
    try {
      setLoadingGenders(true);
      const res = await saasApi.getGenders();
      setGenders(res?.data || []);
    } catch (err) {
      console.error('Failed to load genders:', err);
    } finally {
      setLoadingGenders(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      const nextClean = value.trim().toLowerCase();
      const prevVerified = (formData.verified_email || '').trim().toLowerCase();
      setFormData((prev) => ({
        ...prev,
        email: value,
        ...(nextClean !== prevVerified
          ? {
              email_verified: false,
              verified_email: '',
              email_verification_token: '',
            }
          : {}),
      }));
      if (nextClean !== otpSentEmail) {
        setOtpSent(false);
        setShowOtpModal(false);
        setOtpCode('');
        setOtpSuccessMsg('');
        setOtpErrorMsg('');
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name] || errors.general) {
      setErrors((prev) => ({ ...prev, [name]: null, general: null }));
    }
  };

  const handleSendOtp = async (emailOverride) => {
    const targetEmail = String(emailOverride !== undefined ? emailOverride : formData.email || '')
      .trim()
      .toLowerCase();

    if (!targetEmail) {
      setErrors((prev) => ({ ...prev, email: 'Login email address is required.' }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setErrors((prev) => ({ ...prev, email: 'Please provide a valid email format.' }));
      return;
    }

    try {
      setSendingOtp(true);
      setOtpErrorMsg('');
      setOtpSuccessMsg('');
      setErrors((prev) => ({ ...prev, email: null, general: null }));

      const res = await saasApi.sendRegistrationOtp({
        email: targetEmail,
        first_name: formData.first_name || '',
      });

      setOtpSent(true);
      setShowOtpModal(true);
      setOtpSentEmail(targetEmail);
      setOtpCode('');
      setOtpSuccessMsg(res?.message || '');
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || 'Failed to send verification OTP. Please try again.';
      setOtpErrorMsg(errMsg);
      if (!showOtpModal) {
        setErrors((prev) => ({ ...prev, email: errMsg }));
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleEmailBlur = () => {
    if (
      cleanCurrentEmail &&
      isValidEmailFormat &&
      !isCurrentEmailVerified &&
      (!otpSent || otpSentEmail !== cleanCurrentEmail) &&
      !sendingOtp
    ) {
      handleSendOtp(cleanCurrentEmail);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || !/^\d{6}$/.test(cleanOtp)) {
      setOtpErrorMsg('Please enter the 6-digit OTP sent to your email.');
      return;
    }

    try {
      setVerifyingOtp(true);
      setOtpErrorMsg('');
      setOtpSuccessMsg('');

      const res = await saasApi.verifyRegistrationOtp({
        email: otpSentEmail,
        otp: cleanOtp,
      });

      const token = res?.data?.email_verification_token || '';
      setFormData((prev) => ({
        ...prev,
        email_verified: true,
        verified_email: otpSentEmail,
        email_verification_token: token,
      }));
      setShowOtpModal(false);
      setOtpSent(false);
      setOtpCode('');
      setOtpSuccessMsg(res?.message || '');
      setErrors((prev) => ({ ...prev, email: null }));
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || 'Invalid or expired OTP. Please try again.';
      setOtpErrorMsg(errMsg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleGenderChange = (e) => {
    const selectedId = e.target.value;
    const selectedObj = genders.find((g) => String(g.id) === String(selectedId));
    setFormData((prev) => ({
      ...prev,
      gender: selectedId,
      gender_name: selectedObj ? selectedObj.gender : '',
    }));
    if (errors.gender) {
      setErrors((prev) => ({ ...prev, gender: null }));
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo file size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
      setFormData((prev) => ({ ...prev, picture: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setFormData((prev) => ({ ...prev, picture: null }));
  };

  const handleValidateAndNext = async () => {
    const newErrors = {};

    if (!formData.first_name || !formData.first_name.trim()) {
      newErrors.first_name = 'First name is required.';
    }

    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Login email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email format.';
    } else if (!isCurrentEmailVerified) {
      newErrors.email = 'Please verify your email address with the OTP sent to your email before continuing.';
    }

    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setCheckingAvailability(true);
      const res = await saasApi.checkAvailability({
        admin_email: formData.email.trim(),
        admin_phone: formData.phone.trim(),
      });

      if (res?.data && !res.data.available) {
        const field = res.data.field;
        if (field === 'admin_email') {
          setErrors((prev) => ({ ...prev, email: res.data.message }));
        } else if (field === 'admin_phone') {
          setErrors((prev) => ({ ...prev, phone: res.data.message }));
        } else {
          setErrors((prev) => ({ ...prev, general: res.data.message }));
        }
        return;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Unable to verify availability. Please try again.';
      if (errorMsg.toLowerCase().includes('email')) {
        setErrors((prev) => ({ ...prev, email: errorMsg }));
      } else if (errorMsg.toLowerCase().includes('phone')) {
        setErrors((prev) => ({ ...prev, phone: errorMsg }));
      } else {
        setErrors((prev) => ({ ...prev, general: errorMsg }));
      }
      return;
    } finally {
      setCheckingAvailability(false);
    }

    onNext();
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div className="p-3 bg-primary-subtle text-primary rounded-3">
          <UserCheck size={26} />
        </div>
        <div>
          <h4 className="fw-bold text-dark mb-0">Super Admin Account</h4>
          <p className="text-muted fs-13 mb-0">
            Create the primary administrator credentials and profile to govern your school portal.
          </p>
        </div>
      </div>

      {errors.general && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 fs-13 mb-3">
          <span>{errors.general}</span>
        </div>
      )}

      <div className="row g-3">
        {/* Administrator Profile Photo */}
        <div className="col-12 mb-2 pb-3 border-bottom">
          <label className="form-label d-block">Administrator Profile Photo</label>
          <div className="d-flex align-items-center gap-3">
            {photoPreview ? (
              <div
                className="rounded-circle border p-1 bg-white d-flex align-items-center justify-content-center overflow-hidden shadow-2xs"
                style={{ width: '75px', height: '75px' }}
              >
                <img
                  src={photoPreview}
                  alt="Admin Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              </div>
            ) : (
              <div
                className="rounded-circle border border-dashed bg-light text-muted d-flex flex-column align-items-center justify-content-center"
                style={{ width: '75px', height: '75px' }}
              >
                <User size={28} className="text-secondary" />
              </div>
            )}
            <div>
              <input
                type="file"
                id="admin-photo-upload"
                className="d-none"
                accept="image/*"
                onChange={handlePhotoUpload}
              />
              <div className="d-flex gap-2 align-items-center mb-1">
                <label htmlFor="admin-photo-upload" className="btn btn-outline-primary btn-sm fw-semibold mb-0">
                  {photoPreview ? 'Change Photo' : 'Upload Profile Photo'}
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleRemovePhoto}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="text-muted fs-11">Recommended: Square portrait photo under 2MB.</div>
            </div>
          </div>
        </div>

        {/* First & Last Name */}
        <div className="col-12 col-md-6">
          <label className="form-label">
            First Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
            name="first_name"
            value={formData.first_name || ''}
            onChange={handleChange}
            placeholder="e.g. Ramesh"
          />
          {errors.first_name && <div className="text-danger fs-12 mt-1">{errors.first_name}</div>}
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">Last Name</label>
          <input
            type="text"
            className="form-control"
            name="last_name"
            value={formData.last_name || ''}
            onChange={handleChange}
            placeholder="e.g. Sharma"
          />
        </div>

        {/* Login Email & Phone */}
        <div className="col-12 col-md-6">
          <label className="form-label d-flex align-items-center justify-content-between">
            <span>
              Login Email Address <span className="text-danger">*</span>
            </span>
            {isCurrentEmailVerified && (
              <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1 px-2 py-1 fs-11">
                <CheckCircle2 size={13} />
                Verified
              </span>
            )}
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Mail size={16} />
            </span>
            <input
              ref={emailInputRef}
              type="email"
              className={`form-control ${
                errors.email ? 'is-invalid' : isCurrentEmailVerified ? 'border-success' : ''
              }`}
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              onBlur={handleEmailBlur}
              placeholder="principal@school.edu.in"
            />
            {!isCurrentEmailVerified && (
              <button
                type="button"
                className="btn btn-outline-primary fw-semibold d-inline-flex align-items-center gap-1"
                onClick={() => handleSendOtp(cleanCurrentEmail)}
                disabled={sendingOtp || !isValidEmailFormat}
              >
                {sendingOtp ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : otpSent && otpSentEmail === cleanCurrentEmail ? (
                  <>
                    <RefreshCw size={14} />
                    <span>Resend OTP</span>
                  </>
                ) : (
                  <span>Send OTP</span>
                )}
              </button>
            )}
          </div>
          {errors.email && <div className="text-danger fs-12 mt-1">{errors.email}</div>}
          <div className="text-muted fs-11 mt-1">
            This will be your primary portal login ID. An OTP will be sent to verify this email.
          </div>

          {isCurrentEmailVerified && otpSuccessMsg && (
            <div className="text-success fs-12 fw-medium mt-1 d-flex align-items-center gap-1">
              <CheckCircle2 size={14} />
              <span>{otpSuccessMsg}</span>
            </div>
          )}
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">
            Phone Number <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Phone size={16} />
            </span>
            <input
              type="tel"
              className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              placeholder="+91 98765 00000"
            />
          </div>
          {errors.phone && <div className="text-danger fs-12 mt-1">{errors.phone}</div>}
        </div>

        {/* Gender (Dynamically loaded from database) */}
        <div className="col-12 col-md-4">
          <label className="form-label">Gender</label>
          <select
            className="form-select"
            name="gender"
            value={formData.gender || ''}
            onChange={handleGenderChange}
            disabled={loadingGenders}
          >
            <option value="">
              {loadingGenders ? 'Loading genders...' : 'Select Gender'}
            </option>
            {genders.map((g) => (
              <option key={g.id} value={g.id}>
                {g.gender}
              </option>
            ))}
          </select>
        </div>

        {/* Password */}
        <div className="col-12 col-md-4">
          <label className="form-label">
            Password <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Lock size={16} />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              name="password"
              value={formData.password || ''}
              onChange={handleChange}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <div className="text-danger fs-12 mt-1">{errors.password}</div>}
        </div>

        {/* Confirm Password */}
        <div className="col-12 col-md-4">
          <label className="form-label">
            Confirm Password <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Lock size={16} />
            </span>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className={`form-control ${errors.confirm_password ? 'is-invalid' : ''}`}
              name="confirm_password"
              value={formData.confirm_password || ''}
              onChange={handleChange}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirm_password && (
            <div className="text-danger fs-12 mt-1">{errors.confirm_password}</div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="d-flex justify-content-between align-items-center gap-2 pt-4 border-top mt-4">
        <button
          type="button"
          className="btn btn-outline-secondary px-4 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
          onClick={onBack}
        >
          <ArrowLeft size={16} className="flex-shrink-0" />
          <span>Back</span>
        </button>

        <button
          type="button"
          className="btn btn-primary px-4 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
          onClick={handleValidateAndNext}
          disabled={checkingAvailability || isOtpModalOpen}
        >
          {checkingAvailability ? (
            <>
              <Loader2 size={16} className="animate-spin flex-shrink-0" />
              <span>Checking...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight size={16} className="flex-shrink-0" />
            </>
          )}
        </button>
      </div>

      {/* Email OTP Verification Modal */}
      {isOtpModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-otp-modal-title"
          className="d-flex align-items-center justify-content-center p-3"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            ref={otpModalRef}
            className="card border-0 shadow-lg rounded-4 p-4 w-100 bg-white"
            style={{ maxWidth: '420px' }}
          >
            {/* Modal Header: Back Button on Left + Title */}
            <div className="d-flex align-items-center gap-2 pb-3 mb-3 border-bottom">
              <button
                type="button"
                onClick={handleCloseOtpModal}
                className="btn btn-light btn-sm d-inline-flex align-items-center justify-content-center rounded-circle p-2 border"
                title="Back to change email"
                aria-label="Back to change email"
              >
                <ArrowLeft size={16} />
              </button>
              <h5 id="email-otp-modal-title" className="fw-bold text-dark mb-0">
                OTP Verification
              </h5>
            </div>

            {/* Middle Portion */}
            <div className="text-center mb-3">
              <p className="text-muted fs-14 mb-1">
                We have sent a verification code to
              </p>
              <div className="fw-bold text-dark fs-14 text-break">
                {otpSentEmail}
              </div>
            </div>

            {otpErrorMsg && (
              <div className="alert alert-danger py-2 px-3 fs-12 mb-3 text-center">
                {otpErrorMsg}
              </div>
            )}

            {/* OTP Input */}
            <div className="mb-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                className={`form-control form-control-lg text-center fw-bold ${
                  otpErrorMsg ? 'is-invalid' : ''
                }`}
                style={{ letterSpacing: '8px', fontSize: '1.25rem' }}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(digitsOnly);
                  if (otpErrorMsg) setOtpErrorMsg('');
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    otpCode.length === 6 &&
                    !verifyingOtp
                  ) {
                    e.preventDefault();
                    handleVerifyOtp();
                  }
                }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3"
              onClick={handleVerifyOtp}
              disabled={verifyingOtp || sendingOtp || otpCode.length !== 6}
            >
              {verifyingOtp ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify OTP</span>
              )}
            </button>

            {/* Resend Button */}
            <div className="text-center">
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none fw-semibold d-inline-flex align-items-center gap-1"
                onClick={() => handleSendOtp(otpSentEmail)}
                disabled={sendingOtp || verifyingOtp}
              >
                {sendingOtp ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    <span>Resend</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, UserCheck, Eye, EyeOff, Lock, Mail, Phone, Upload, User, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    fetchGenders();
  }, []);

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
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
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
      const errorMsg = err.response?.data?.message;
      if (errorMsg) {
        if (errorMsg.toLowerCase().includes('email')) {
          setErrors((prev) => ({ ...prev, email: errorMsg }));
          return;
        } else if (errorMsg.toLowerCase().includes('phone')) {
          setErrors((prev) => ({ ...prev, phone: errorMsg }));
          return;
        }
      }
    } finally {
      setCheckingAvailability(false);
    }

    onNext();
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div className="p-2.5 bg-primary-subtle text-primary rounded-3">
          <UserCheck size={26} />
        </div>
        <div>
          <h4 className="fw-bold text-dark mb-0">Super Admin Account</h4>
          <p className="text-muted fs-13 mb-0">
            Create the primary administrator credentials and profile to govern your school portal.
          </p>
        </div>
      </div>

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
          <label className="form-label">
            Login Email Address <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Mail size={16} />
            </span>
            <input
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="principal@school.edu.in"
            />
          </div>
          {errors.email && <div className="text-danger fs-12 mt-1">{errors.email}</div>}
          <div className="text-muted fs-11 mt-1">This will be your primary portal login ID.</div>
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
      <div className="d-flex justify-content-between pt-4 border-top mt-4">
        <button
          type="button"
          className="btn btn-outline-secondary px-4 py-2.5 fw-semibold d-flex align-items-center gap-2"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          <span>Back: Academic Year</span>
        </button>

        <button
          type="button"
          className="btn btn-primary px-4 py-2.5 fw-semibold d-flex align-items-center gap-2"
          onClick={handleValidateAndNext}
          disabled={checkingAvailability}
        >
          {checkingAvailability ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Checking Availability...</span>
            </>
          ) : (
            <>
              <span>Continue: Review &amp; Activate</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

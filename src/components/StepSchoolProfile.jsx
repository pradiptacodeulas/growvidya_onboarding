'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Upload, School as SchoolIcon, BookOpen, Calendar, Hash, Award, Languages } from 'lucide-react';

export default function StepSchoolProfile({
  formData,
  setFormData,
  onNext,
  onBack,
}) {
  const [logoPreview, setLogoPreview] = useState(formData.school_logo || null);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      setFormData((prev) => ({ ...prev, school_logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData((prev) => ({ ...prev, school_logo: null }));
  };

  const handleValidateAndNext = () => {
    const newErrors = {};
    if (!formData.school_name || !formData.school_name.trim()) {
      newErrors.school_name = 'School legal name is required.';
    }

    if (formData.established_year) {
      const year = parseInt(formData.established_year, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear + 1) {
        newErrors.established_year = `Please enter a valid year between 1800 and ${currentYear + 1}.`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext();
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div className="p-2.5 bg-primary-subtle text-primary rounded-3">
          <SchoolIcon size={26} />
        </div>
        <div>
          <h4 className="fw-bold text-dark mb-0">School Profile</h4>
          <p className="text-muted fs-13 mb-0">
            Define your institution&apos;s legal identity, affiliation board, and branding.
          </p>
        </div>
      </div>

      <div className="row g-3">
        {/* School Legal Name */}
        <div className="col-12 col-md-8">
          <label className="form-label">
            School Legal Name <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <SchoolIcon size={16} />
            </span>
            <input
              type="text"
              className={`form-control ${errors.school_name ? 'is-invalid' : ''}`}
              name="school_name"
              value={formData.school_name || ''}
              onChange={handleChange}
              placeholder="e.g. St. Xavier International Academy"
            />
          </div>
          {errors.school_name && <div className="text-danger fs-12 mt-1">{errors.school_name}</div>}
        </div>

        {/* School Code */}
        <div className="col-12 col-md-4">
          <label className="form-label">
            School Code <span className="text-muted fs-12 fw-normal">(Optional)</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Hash size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              name="school_code"
              value={formData.school_code || ''}
              onChange={(e) => handleChange({ target: { name: 'school_code', value: e.target.value.toUpperCase() } })}
              placeholder="e.g. SXIA-01"
            />
          </div>
          <div className="text-muted fs-11 mt-1">Leave empty to auto-generate.</div>
        </div>

        {/* School Type */}
        <div className="col-12 col-md-6">
          <label className="form-label">School Type</label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <BookOpen size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              name="school_type"
              value={formData.school_type || ''}
              onChange={handleChange}
              placeholder="e.g. Private K-12, Day Boarding, Public School, Play School"
            />
          </div>
        </div>

        {/* Affiliation Board (Strict User Input, No Dropdown) */}
        <div className="col-12 col-md-6">
          <label className="form-label">
            Affiliation Board
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Award size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              name="affiliation_board"
              value={formData.affiliation_board || ''}
              onChange={handleChange}
              placeholder="e.g. CBSE, ICSE, Cambridge, State Board, IB"
            />
          </div>
          <div className="text-muted fs-11 mt-1">Enter your school&apos;s governing or educational affiliation board.</div>
        </div>

        {/* Medium of Instruction */}
        <div className="col-12 col-md-6">
          <label className="form-label">Medium of Instruction</label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Languages size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              name="medium_of_instruction"
              value={formData.medium_of_instruction || ''}
              onChange={handleChange}
              placeholder="e.g. English, Hindi, Bengali, Bilingual"
            />
          </div>
          <div className="text-muted fs-11 mt-1">Enter your school&apos;s medium of instruction.</div>
        </div>

        {/* Establish Year */}
        <div className="col-12 col-md-6">
          <label className="form-label">Establishment Year</label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Calendar size={16} />
            </span>
            <input
              type="number"
              className={`form-control ${errors.established_year ? 'is-invalid' : ''}`}
              name="established_year"
              value={formData.established_year || ''}
              onChange={handleChange}
              placeholder="e.g. 1998, 2012"
              min="1800"
              max={new Date().getFullYear() + 1}
            />
          </div>
          {errors.established_year && (
            <div className="text-danger fs-12 mt-1">{errors.established_year}</div>
          )}
        </div>

        {/* Campus Architecture / Registration Type */}
        <div className="col-12 mt-4 pt-3 border-top">
          <label className="form-label d-block fw-bold text-dark mb-2">
            Campus Architecture / Registration Type
          </label>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div
                className={`p-3 rounded-3 border transition-all ${
                  (formData.registration_type || 'single') === 'single'
                    ? 'border-primary bg-primary-subtle'
                    : 'border-light-subtle bg-white'
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => setFormData((prev) => ({ ...prev, registration_type: 'single' }))}
              >
                <div className="d-flex align-items-center gap-2 mb-1">
                  <input
                    type="radio"
                    id="reg_type_single"
                    name="registration_type"
                    checked={(formData.registration_type || 'single') === 'single'}
                    onChange={() => setFormData((prev) => ({ ...prev, registration_type: 'single' }))}
                    className="form-check-input mt-0"
                  />
                  <label htmlFor="reg_type_single" className="fw-bold mb-0 text-dark" style={{ cursor: 'pointer' }}>
                    Single Campus
                  </label>
                  <span className="badge bg-secondary-subtle text-secondary small ms-auto">Standard</span>
                </div>
                <p className="text-muted fs-12 mb-0 ms-4">
                  For standalone schools operating a single campus.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div
                className={`p-3 rounded-3 border transition-all ${
                  formData.registration_type === 'multiple'
                    ? 'border-primary bg-primary-subtle'
                    : 'border-light-subtle bg-white'
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => setFormData((prev) => ({ ...prev, registration_type: 'multiple' }))}
              >
                <div className="d-flex align-items-center gap-2 mb-1">
                  <input
                    type="radio"
                    id="reg_type_multiple"
                    name="registration_type"
                    checked={formData.registration_type === 'multiple'}
                    onChange={() => setFormData((prev) => ({ ...prev, registration_type: 'multiple' }))}
                    className="form-check-input mt-0"
                  />
                  <label htmlFor="reg_type_multiple" className="fw-bold mb-0 text-dark" style={{ cursor: 'pointer' }}>
                    Multiple Campuses / School Group
                  </label>
                  <span className="badge bg-primary text-white small ms-auto">Multi-Branch</span>
                </div>
                <p className="text-muted fs-12 mb-0 ms-4">
                  Creates Main Campus and unlocks the dedicated Super Admin Organization Dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Official School Logo */}
        <div className="col-12 mt-4 pt-3 border-top">
          <label className="form-label d-block">Official School Logo / Crest</label>
          <div className="d-flex align-items-center gap-3">
            {logoPreview ? (
              <div
                className="rounded-3 border p-2 bg-white d-flex align-items-center justify-content-center position-relative shadow-2xs"
                style={{ width: '80px', height: '80px' }}
              >
                <img
                  src={logoPreview}
                  alt="Official School Logo"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div
                className="rounded-3 border border-dashed bg-light text-muted d-flex flex-column align-items-center justify-content-center"
                style={{ width: '80px', height: '80px' }}
              >
                <Upload size={24} className="text-secondary" />
                <span className="fs-10 text-muted mt-1">Logo</span>
              </div>
            )}
            <div>
              <input
                type="file"
                id="school-logo-upload"
                className="d-none"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              <div className="d-flex gap-2 align-items-center mb-1">
                <label htmlFor="school-logo-upload" className="btn btn-outline-primary btn-sm fw-semibold mb-0">
                  {logoPreview ? 'Change Logo' : 'Upload School Logo'}
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleRemoveLogo}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="text-muted fs-11">Recommended: PNG, JPG, or SVG under 2MB.</div>
            </div>
          </div>
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
          <span>Back: Plan</span>
        </button>

        <button
          type="button"
          className="btn btn-primary px-4 py-2.5 fw-semibold d-flex align-items-center gap-2"
          onClick={handleValidateAndNext}
        >
          <span>Continue: Campus &amp; Contact</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

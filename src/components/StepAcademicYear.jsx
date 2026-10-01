'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react';

export default function StepAcademicYear({
  formData,
  setFormData,
  onNext,
  onBack,
}) {
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleValidateAndNext = () => {
    const newErrors = {};

    if (!formData.academic_year || !formData.academic_year.trim()) {
      newErrors.academic_year = 'Academic Year / Session Name is required.';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Session Start Date is required.';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'Session End Date is required.';
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        newErrors.end_date = 'Session End Date must be after Session Start Date.';
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
          <Calendar size={26} />
        </div>
        <div>
          <h4 className="fw-bold text-dark mb-0">Academic Year</h4>
          <p className="text-muted fs-13 mb-0">
            Configure your school&apos;s initial academic session and schedule.
          </p>
        </div>
      </div>

      <div className="row g-3">
        {/* Academic Year / Session Name */}
        <div className="col-12">
          <label className="form-label">
            Academic Year / Session Name <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Calendar size={16} />
            </span>
            <input
              type="text"
              className={`form-control ${errors.academic_year ? 'is-invalid' : ''}`}
              name="academic_year"
              value={formData.academic_year || ''}
              onChange={handleChange}
              placeholder="e.g. 2026 - 2027"
            />
          </div>
          {errors.academic_year && (
            <div className="text-danger fs-12 mt-1">{errors.academic_year}</div>
          )}
          <div className="text-muted fs-11 mt-1">
            Display name for this session (e.g. 2026 - 2027 or 2026).
          </div>
        </div>

        {/* Session Start Date */}
        <div className="col-12 col-md-6">
          <label className="form-label">
            Session Start Date <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Clock size={16} />
            </span>
            <input
              type="date"
              className={`form-control ${errors.start_date ? 'is-invalid' : ''}`}
              name="start_date"
              value={formData.start_date || ''}
              onChange={handleChange}
            />
          </div>
          {errors.start_date && (
            <div className="text-danger fs-12 mt-1">{errors.start_date}</div>
          )}
        </div>

        {/* Session End Date */}
        <div className="col-12 col-md-6">
          <label className="form-label">
            Session End Date <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Clock size={16} />
            </span>
            <input
              type="date"
              className={`form-control ${errors.end_date ? 'is-invalid' : ''}`}
              name="end_date"
              value={formData.end_date || ''}
              onChange={handleChange}
            />
          </div>
          {errors.end_date && (
            <div className="text-danger fs-12 mt-1">{errors.end_date}</div>
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
          <span>Back: Campus &amp; Contact</span>
        </button>

        <button
          type="button"
          className="btn btn-primary px-4 py-2.5 fw-semibold d-flex align-items-center gap-2"
          onClick={handleValidateAndNext}
        >
          <span>Continue: Super Admin</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

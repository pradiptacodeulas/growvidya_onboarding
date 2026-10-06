'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Building2, MapPin, Phone, Mail, Globe, Hash, Loader2 } from 'lucide-react';
import saasApi from '../lib/api';

export default function StepCampusContact({
  formData,
  setFormData,
  schoolName = '',
  onNext,
  onBack,
}) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const initLocations = async () => {
      try {
        setLoadingCountries(true);
        const res = await saasApi.getCountries();
        const countryList = res?.data || [];
        setCountries(countryList);

        if (formData.country) {
          setLoadingStates(true);
          const statesRes = await saasApi.getStates(formData.country);
          const stateList = statesRes?.data || [];
          setStates(stateList);

          if (formData.state) {
            setLoadingCities(true);
            const citiesRes = await saasApi.getCities(formData.state);
            setCities(citiesRes?.data || []);
          }
        }
      } catch (err) {
        console.error('Failed to initialize locations:', err);
      } finally {
        setLoadingCountries(false);
        setLoadingStates(false);
        setLoadingCities(false);
      }
    };

    initLocations();
  }, []);

  const handleCountryChange = async (e) => {
    const selectedCountryId = e.target.value;
    const selectedCountryObj = countries.find((c) => String(c.id) === String(selectedCountryId));

    // Clear dependent states and cities immediately
    setStates([]);
    setCities([]);
    setFormData((prev) => ({
      ...prev,
      country: selectedCountryId,
      country_name: selectedCountryObj ? selectedCountryObj.name : '',
      state: '',
      state_name: '',
      city: '',
      city_name: '',
    }));

    setErrors((prev) => ({ ...prev, country: null, state: null, city: null }));

    if (selectedCountryId) {
      try {
        setLoadingStates(true);
        const res = await saasApi.getStates(selectedCountryId);
        setStates(res?.data || []);
      } catch (err) {
        console.error('Failed to load states for country:', err);
      } finally {
        setLoadingStates(false);
      }
    }
  };

  const handleStateChange = async (e) => {
    const selectedStateId = e.target.value;
    const selectedStateObj = states.find((s) => String(s.id) === String(selectedStateId));

    // Clear dependent cities immediately
    setCities([]);
    setFormData((prev) => ({
      ...prev,
      state: selectedStateId,
      state_name: selectedStateObj ? selectedStateObj.name : '',
      city: '',
      city_name: '',
    }));

    setErrors((prev) => ({ ...prev, state: null, city: null }));

    if (selectedStateId) {
      try {
        setLoadingCities(true);
        const res = await saasApi.getCities(selectedStateId);
        setCities(res?.data || []);
      } catch (err) {
        console.error('Failed to load cities for state:', err);
      } finally {
        setLoadingCities(false);
      }
    }
  };

  const handleCityChange = (e) => {
    const selectedCityId = e.target.value;
    const selectedCityObj = cities.find((ci) => String(ci.id) === String(selectedCityId));

    setFormData((prev) => ({
      ...prev,
      city: selectedCityId,
      city_name: selectedCityObj ? selectedCityObj.name : '',
    }));

    if (errors.city) {
      setErrors((prev) => ({ ...prev, city: null }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleValidateAndNext = async () => {
    const newErrors = {};

    // 1. Official Helpline Phone (Required)
    if (!formData.phone_number || !formData.phone_number.trim()) {
      newErrors.phone_number = 'Official helpline phone is required.';
    } else {
      const cleanDigits = formData.phone_number.replace(/[^0-9]/g, '');
      if (cleanDigits.length < 7 || cleanDigits.length > 15) {
        newErrors.phone_number = 'Please enter a valid phone number (7-15 digits).';
      }
    }

    // 2. Official School Email (Required)
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Official school email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid institution email format.';
    }

    // 3. Address Section (Required: Physical Address, Country, State, City, Pincode)
    if (!formData.address || !formData.address.trim()) {
      newErrors.address = 'Campus physical address is required.';
    }

    if (!formData.country) {
      newErrors.country = 'Please select a country.';
    }

    if (!formData.state) {
      newErrors.state = 'Please select a state / province.';
    }

    if (!formData.city) {
      newErrors.city = 'Please select a city.';
    }

    if (!formData.postal_code || !formData.postal_code.trim()) {
      newErrors.postal_code = 'Pincode / postal code is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Check availability for official school email and helpline phone
    try {
      setCheckingAvailability(true);
      const res = await saasApi.checkAvailability({
        school_email: formData.email.trim(),
        school_phone: formData.phone_number.trim(),
      });

      if (res?.data && !res.data.available) {
        const field = res.data.field;
        if (field === 'school_email') {
          setErrors((prev) => ({ ...prev, email: res.data.message }));
        } else if (field === 'school_phone') {
          setErrors((prev) => ({ ...prev, phone_number: res.data.message }));
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
          setErrors((prev) => ({ ...prev, phone_number: errorMsg }));
          return;
        }
      }
    } finally {
      setCheckingAvailability(false);
    }

    onNext();
  };

  const defaultFooterPlaceholder = `Copyright © ${new Date().getFullYear()} ${schoolName ? schoolName : 'Your School Name'} - All Rights Reserved`;

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div className="p-2.5 bg-primary-subtle text-primary rounded-3">
          <Building2 size={26} />
        </div>
        <div>
          <h4 className="fw-bold text-dark mb-0">Campus &amp; Contact</h4>
          <p className="text-muted fs-13 mb-0">
            Provide communication channels, campus address, and portal footer notice.
          </p>
        </div>
      </div>

      {errors.general && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 fs-13 mb-3">
          <span>{errors.general}</span>
        </div>
      )}

      <div className="row g-3">
        {/* Official Helpline Phone */}
        <div className="col-12 col-md-6">
          <label className="form-label">
            Official Helpline Phone <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Phone size={16} />
            </span>
            <input
              type="tel"
              className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
              name="phone_number"
              value={formData.phone_number || ''}
              onChange={handleChange}
              placeholder="+91 98765 43210"
            />
          </div>
          {errors.phone_number && <div className="text-danger fs-12 mt-1">{errors.phone_number}</div>}
          <div className="text-muted fs-11 mt-1">Primary phone shown on invoices and student IDs.</div>
        </div>

        {/* Official School Email */}
        <div className="col-12 col-md-6">
          <label className="form-label">
            Official School Email <span className="text-danger">*</span>
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
              placeholder="contact@school.edu.in"
            />
          </div>
          {errors.email && <div className="text-danger fs-12 mt-1">{errors.email}</div>}
        </div>

        {/* Official Website */}
        <div className="col-12">
          <label className="form-label">Official Website</label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Globe size={16} />
            </span>
            <input
              type="url"
              className="form-control"
              name="website"
              value={formData.website || ''}
              onChange={handleChange}
              placeholder="https://www.yourschool.edu.in"
            />
          </div>
        </div>

        {/* Campus Physical Address */}
        <div className="col-12">
          <label className="form-label">
            Campus Physical Address <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <MapPin size={16} />
            </span>
            <input
              type="text"
              className={`form-control ${errors.address ? 'is-invalid' : ''}`}
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="Building name, Street address, Landmark, Campus area"
            />
          </div>
          {errors.address && <div className="text-danger fs-12 mt-1">{errors.address}</div>}
        </div>

        {/* Country */}
        <div className="col-12 col-md-4">
          <label className="form-label">
            Country <span className="text-danger">*</span>
          </label>
          <select
            className={`form-select ${errors.country ? 'is-invalid' : ''}`}
            name="country"
            value={formData.country || ''}
            onChange={handleCountryChange}
            disabled={loadingCountries}
          >
            <option value="">
              {loadingCountries ? 'Loading countries...' : 'Select Country'}
            </option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.country && <div className="text-danger fs-12 mt-1">{errors.country}</div>}
        </div>

        {/* State (Loaded dynamically with respect to selected country) */}
        <div className="col-12 col-md-4">
          <label className="form-label">
            State / Province <span className="text-danger">*</span>
          </label>
          <select
            className={`form-select ${errors.state ? 'is-invalid' : ''}`}
            name="state"
            value={formData.state || ''}
            onChange={handleStateChange}
            disabled={!formData.country || loadingStates}
          >
            <option value="">
              {!formData.country
                ? 'Select Country First'
                : loadingStates
                ? 'Loading states...'
                : states.length === 0
                ? 'No states found'
                : 'Select State'}
            </option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.state && <div className="text-danger fs-12 mt-1">{errors.state}</div>}
        </div>

        {/* City (Loaded dynamically with respect to selected state - strictly dropdown, no fallback) */}
        <div className="col-12 col-md-4">
          <label className="form-label">
            City <span className="text-danger">*</span>
          </label>
          <select
            className={`form-select ${errors.city ? 'is-invalid' : ''}`}
            name="city"
            value={formData.city || ''}
            onChange={handleCityChange}
            disabled={!formData.state || loadingCities}
          >
            <option value="">
              {!formData.state
                ? 'Select State First'
                : loadingCities
                ? 'Loading cities...'
                : cities.length === 0
                ? 'No cities found'
                : 'Select City'}
            </option>
            {cities.map((ci) => (
              <option key={ci.id} value={ci.id}>
                {ci.name}
              </option>
            ))}
          </select>
          {errors.city && <div className="text-danger fs-12 mt-1">{errors.city}</div>}
        </div>

        {/* Pincode */}
        <div className="col-12 col-md-6">
          <label className="form-label">
            Pincode / Postal Code <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Hash size={16} />
            </span>
            <input
              type="text"
              className={`form-control ${errors.postal_code ? 'is-invalid' : ''}`}
              name="postal_code"
              value={formData.postal_code || ''}
              onChange={handleChange}
              placeholder="e.g. 110001"
            />
          </div>
          {errors.postal_code && <div className="text-danger fs-12 mt-1">{errors.postal_code}</div>}
        </div>

        {/* Footer / Copyright Note */}
        <div className="col-12 col-md-6">
          <label className="form-label">Footer / Copyright Note</label>
          <input
            type="text"
            className="form-control"
            name="footer"
            value={formData.footer || ''}
            onChange={handleChange}
            placeholder={defaultFooterPlaceholder}
          />
          <div className="text-muted fs-11 mt-1">
            Displayed on print receipts, report cards, portal footer, and official documents.
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
          <span>Back: School Profile</span>
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
              <span>Continue: Academic Year</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

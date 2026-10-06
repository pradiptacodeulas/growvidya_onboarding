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

    if (errors.country) {
      setErrors((prev) => ({ ...prev, country: null }));
    }

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

    if (errors.state) {
      setErrors((prev) => ({ ...prev, state: null }));
    }

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

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid institution email format.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Check availability if school email or phone number is provided
    const hasEmail = Boolean(formData.email && formData.email.trim());
    const hasPhone = Boolean(formData.phone_number && formData.phone_number.trim());

    if (hasEmail || hasPhone) {
      try {
        setCheckingAvailability(true);
        const res = await saasApi.checkAvailability({
          school_email: hasEmail ? formData.email.trim() : null,
          school_phone: hasPhone ? formData.phone_number.trim() : null,
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

      <div className="row g-3">
        {/* Official Helpline Phone */}
        <div className="col-12 col-md-6">
          <label className="form-label">Official Helpline Phone</label>
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
          <label className="form-label">Official School Email</label>
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
          <label className="form-label">Campus Physical Address</label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <MapPin size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="Building name, Street address, Landmark, Campus area"
            />
          </div>
        </div>

        {/* Country */}
        <div className="col-12 col-md-4">
          <label className="form-label">Country</label>
          <select
            className="form-select"
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
        </div>

        {/* State (Loaded dynamically with respect to selected country) */}
        <div className="col-12 col-md-4">
          <label className="form-label">State / Province</label>
          <select
            className="form-select"
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
        </div>

        {/* City (Loaded dynamically with respect to selected state - strictly dropdown, no fallback) */}
        <div className="col-12 col-md-4">
          <label className="form-label">City</label>
          <select
            className="form-select"
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
        </div>

        {/* Pincode */}
        <div className="col-12 col-md-6">
          <label className="form-label">Pincode / Postal Code</label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted">
              <Hash size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              name="postal_code"
              value={formData.postal_code || ''}
              onChange={handleChange}
              placeholder="e.g. 110001"
            />
          </div>
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

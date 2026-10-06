'use client';

import React from 'react';
import {
  Check,
  Users,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  BellRing,
  Tag,
} from 'lucide-react';

export default function StepPlan({
  plans = [],
  selectedPlan,
  setSelectedPlan,
  billingCycle,
  setBillingCycle,
  onNext,
}) {
  if (!selectedPlan) {
    return (
      <div className="card border-0 shadow-sm rounded-4 p-4 text-center">
        <h5 className="fw-bold mb-2">No Plan Selected</h5>
        <p className="text-muted fs-14 mb-4">Please choose a plan to continue with your school registration.</p>
        <div className="row g-3 justify-content-center">
          {plans.map((p) => (
            <div key={p.id} className="col-md-6 col-lg-4">
              <div
                className="card h-100 border p-3 text-start cursor-pointer hover-shadow"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSelectedPlan(p);
                  if (setBillingCycle) setBillingCycle(p.billing_cycle || 'annual');
                }}
              >
                <h6 className="fw-bold text-dark">{p.plan_name}</h6>
                <div className="fs-18 fw-bold text-primary mb-2">
                  {parseFloat(p.price) === 0 ? 'Free' : `₹${Number(p.price).toLocaleString('en-IN')}`}
                </div>
                <button type="button" className="btn btn-outline-primary btn-sm w-100 mt-auto">
                  Select This Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const trialDays =
    selectedPlan.free_trial_days !== undefined && selectedPlan.free_trial_days !== null
      ? parseInt(selectedPlan.free_trial_days, 10)
      : 0;

  const basePrice = parseFloat(selectedPlan.price || 0);
  const cycle = selectedPlan.billing_cycle || billingCycle || 'annual';

  // Extract SMS & Push quotas if configured
  const smsItem = (selectedPlan.items || []).find(
    (it) =>
      (it.item_code && it.item_code.toUpperCase().includes('SMS')) ||
      (it.item_name && it.item_name.toLowerCase().includes('sms'))
  );

  const pushItem = (selectedPlan.items || []).find(
    (it) =>
      it.item_code === 'PUSH_NOTIF' ||
      (it.item_name && it.item_name.toLowerCase().includes('push'))
  );

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5">
      {/* Plan Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fs-12 fw-bold text-uppercase mb-2">
            Selected Package
          </span>
          <h3 className="fw-bold text-dark mb-1">{selectedPlan.plan_name}</h3>
          <p className="text-muted fs-14 mb-0">
            {selectedPlan.description || 'Full institutional management platform.'}
          </p>
        </div>

        <div className="text-md-end">
          <div className="d-flex align-items-baseline gap-2 justify-content-md-end">
            <span className="display-6 fw-bold text-primary">
              {basePrice === 0 ? 'Free' : `₹${Number(basePrice).toLocaleString('en-IN')}`}
            </span>
            <span className="text-muted fs-14 fw-semibold">
              {basePrice === 0 ? (trialDays > 0 ? ` / ${trialDays}-day trial` : '') : ` / ${cycle}`}
            </span>
          </div>
          {trialDays > 0 ? (
            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fs-11 fw-semibold mt-1">
              <ShieldCheck size={12} className="me-1 inline" />
              Includes {trialDays}-Day Free Trial
            </span>
          ) : (
            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fs-11 fw-semibold mt-1">
              <ShieldCheck size={12} className="me-1 inline" />
              Instant activation
            </span>
          )}
        </div>
      </div>

      {/* Plan Capabilities & Limits */}
      <h6 className="fw-bold text-dark fs-13 text-uppercase mb-3">Included Institutional Capacity:</h6>
      <div className="row g-3 mb-4">
        {selectedPlan.max_students !== undefined && selectedPlan.max_students !== null && (
          <div className="col-sm-6 col-lg-3">
            <div className="p-3 bg-light rounded-3 border h-100">
              <div className="d-flex align-items-center gap-2 mb-1">
                <Users size={18} className="text-primary" />
                <span className="fs-12 text-muted fw-semibold">Student Capacity</span>
              </div>
              <div className="fs-16 fw-bold text-dark">
                {selectedPlan.max_students > 0
                  ? `Up to ${Number(selectedPlan.max_students).toLocaleString()}`
                  : 'Unlimited'}
              </div>
            </div>
          </div>
        )}

        {trialDays > 0 && (
          <div className="col-sm-6 col-lg-3">
            <div className="p-3 bg-light rounded-3 border h-100">
              <div className="d-flex align-items-center gap-2 mb-1">
                <ShieldCheck size={18} className="text-success" />
                <span className="fs-12 text-muted fw-semibold">Free Trial Duration</span>
              </div>
              <div className="fs-16 fw-bold text-dark">
                {trialDays} Days Free
              </div>
            </div>
          </div>
        )}

        {smsItem && (
          <div className="col-sm-6 col-lg-3">
            <div className="p-3 bg-light rounded-3 border h-100">
              <div className="d-flex align-items-center gap-2 mb-1">
                <MessageSquare size={18} className="text-info" />
                <span className="fs-12 text-muted fw-semibold">SMS Included</span>
              </div>
              <div className="fs-16 fw-bold text-dark">
                {smsItem.quota_limit
                  ? `${Number(smsItem.quota_limit).toLocaleString()} SMS`
                  : 'SMS Enabled'}
              </div>
            </div>
          </div>
        )}

        {pushItem && (
          <div className="col-sm-6 col-lg-3">
            <div className="p-3 bg-light rounded-3 border h-100">
              <div className="d-flex align-items-center gap-2 mb-1">
                <BellRing size={18} className="text-warning" />
                <span className="fs-12 text-muted fw-semibold">Push Notifications</span>
              </div>
              <div className="fs-16 fw-bold text-dark">
                {pushItem.quota_limit
                  ? `${Number(pushItem.quota_limit).toLocaleString()} Push`
                  : 'Unlimited Push'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Other configured items */}
      {(selectedPlan.items || []).filter(
        (it) =>
          it.item_code !== 'PUSH_NOTIF' &&
          !it.item_code?.toUpperCase().includes('SMS') &&
          it.item_code !== 'EMAIL_ALERTS'
      ).length > 0 && (
        <div className="mb-4">
          <h6 className="fw-bold text-dark fs-13 text-uppercase mb-2">Configured Add-ons & Features:</h6>
          <div className="row g-2">
            {(selectedPlan.items || [])
              .filter(
                (it) =>
                  it.item_code !== 'PUSH_NOTIF' &&
                  !it.item_code?.toUpperCase().includes('SMS') &&
                  it.item_code !== 'EMAIL_ALERTS'
              )
              .map((it) => (
                <div key={it.id} className="col-md-6 d-flex align-items-center gap-2 text-dark fs-14">
                  <Check size={16} className="text-success flex-shrink-0" />
                  <span>
                    {it.item_name}{' '}
                    {it.item_type === 'addon' && parseFloat(it.price) > 0 && (
                      <span className="text-muted">(₹{Number(it.price).toLocaleString('en-IN')})</span>
                    )}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Note about coupon code application and flexible activation in Review step */}
      <div className="p-3 bg-light rounded-3 border mb-4 d-flex align-items-center gap-2 text-muted fs-13">
        <Tag size={16} className="text-primary flex-shrink-0" />
        <div>
          {trialDays > 0 ? (
            <>
              You can choose whether to start with the <strong>{trialDays}-day free trial</strong> or <strong>pay upfront to claim bonus validity</strong> in the final <strong className="text-dark">Review &amp; Activate</strong> step.
            </>
          ) : (
            <>
              Have an institutional discount coupon or promo code? You can easily apply it in the final <strong className="text-dark">Review &amp; Activate</strong> step before completing activation.
            </>
          )}
        </div>
      </div>

      {/* Navigation action */}
      <div className="d-flex justify-content-end pt-3 border-top mt-auto">
        <button
          type="button"
          className="btn btn-primary px-4 py-2.5 fw-semibold d-flex align-items-center gap-2"
          onClick={onNext}
        >
          <span>Continue: School Profile</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

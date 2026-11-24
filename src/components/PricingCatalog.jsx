'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Users,
  HardDrive,
  MessageSquare,
  BellRing,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import saasApi from '@/lib/api';

export default function PricingCatalog() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCycle, setActiveCycle] = useState('');

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await saasApi.getPlans();
      const list = Array.isArray(res?.data) ? res.data : [];
      setPlans(list);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to load subscription plans from the server.'
      );
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Derive distinct billing cycles strictly from live database plans
  const availableCycles = useMemo(() => {
    const map = new Map();
    plans.forEach((plan) => {
      const cycleKey = String(plan.billing_cycle || '').trim().toLowerCase();
      if (!cycleKey || map.has(cycleKey)) return;
      const meta = plan.cycle_meta || {};
      map.set(cycleKey, {
        cycle: cycleKey,
        label: meta.label || plan.billing_cycle,
        shortLabel: meta.shortLabel || meta.short_label || plan.billing_cycle,
        rank: meta.rank ?? meta.months ?? 0,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.rank - b.rank);
  }, [plans]);

  useEffect(() => {
    if (availableCycles.length === 0) return;
    const exists = availableCycles.some((c) => c.cycle === activeCycle);
    if (!exists) {
      const popularPlan = plans.find((p) => Number(p.is_popular) === 1 && p.billing_cycle);
      const preferredCycle = popularPlan
        ? String(popularPlan.billing_cycle).trim().toLowerCase()
        : '';
      if (preferredCycle && availableCycles.some((c) => c.cycle === preferredCycle)) {
        setActiveCycle(preferredCycle);
      } else {
        setActiveCycle(availableCycles[0].cycle);
      }
    }
  }, [availableCycles, activeCycle, plans]);

  const visiblePlans = useMemo(() => {
    if (!activeCycle) return plans;
    return plans
      .filter((p) => String(p.billing_cycle || '').trim().toLowerCase() === activeCycle)
      .sort(
        (a, b) =>
          (Number(a.tier_rank) || 0) - (Number(b.tier_rank) || 0) ||
          parseFloat(a.price || 0) - parseFloat(b.price || 0)
      );
  }, [plans, activeCycle]);

  const handleSelectPlan = (plan) => {
    if (!plan?.id) return;
    const cycle = String(plan.billing_cycle || '').trim().toLowerCase();
    const hasTrial =
      cycle === 'trial' ||
      parseFloat(plan.price) <= 0 ||
      parseInt(plan.free_trial_days, 10) > 0;

    const params = new URLSearchParams();
    params.set('plan_id', String(plan.id));
    if (cycle) params.set('cycle', cycle);
    params.set('trial', hasTrial ? '1' : '0');

    router.push(`/register?${params.toString()}`);
  };

  return (
    <>
      <Header />
      <main className="flex-grow-1 py-4 py-md-5">
        <div className="container" style={{ maxWidth: '1240px' }}>
          {/* Page Heading */}
          <div className="text-center mb-4">
            <h2 className="fw-bold text-dark mb-2">Choose Your Institutional Plan</h2>
            <p className="text-muted fs-15 mx-auto mb-0" style={{ maxWidth: '620px' }}>
              Select a subscription package below to configure and register your school portal.
            </p>
          </div>

          {/* Dynamic Billing Cycle Toggle */}
          {!loading && !error && availableCycles.length > 1 && (
            <div className="d-flex justify-content-center mb-4 pb-2">
              <div className="bg-white p-1 rounded-pill d-inline-flex flex-wrap justify-content-center gap-1 border shadow-sm">
                {availableCycles.map((cyc) => {
                  const isActive = activeCycle === cyc.cycle;
                  return (
                    <button
                      key={cyc.cycle}
                      type="button"
                      onClick={() => setActiveCycle(cyc.cycle)}
                      className={`btn rounded-pill px-4 py-2 fs-14 fw-semibold ${
                        isActive ? 'btn-primary text-white shadow-sm' : 'btn-white text-secondary'
                      }`}
                    >
                      {cyc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 my-4">
              <Loader2 size={38} className="animate-spin text-primary mb-3" />
              <h6 className="fw-bold text-dark mb-1">Loading Pricing Plans...</h6>
              <p className="text-muted fs-13 mb-0">Fetching active packages...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 text-center mx-auto" style={{ maxWidth: '540px' }}>
              <AlertCircle size={36} className="text-danger mx-auto mb-3" />
              <h5 className="fw-bold text-dark mb-2">Could Not Load Plans</h5>
              <p className="text-muted fs-14 mb-4">{error}</p>
              <div>
                <button
                  type="button"
                  onClick={loadPlans}
                  className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2"
                >
                  <RefreshCw size={15} />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && visiblePlans.length === 0 && (
            <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 text-center mx-auto" style={{ maxWidth: '540px' }}>
              <h5 className="fw-bold text-dark mb-2">No Active Plans Available</h5>
              <p className="text-muted fs-14 mb-0">
                There are currently no active subscription packages available.
              </p>
            </div>
          )}

          {/* Dynamic Pricing Cards */}
          {!loading && !error && visiblePlans.length > 0 && (
            <div className="row g-4 justify-content-center">
              {visiblePlans.map((plan) => {
                const isPopular = Number(plan.is_popular) === 1;
                const priceNum = parseFloat(plan.price || 0);
                const origPriceNum =
                  plan.original_price !== null && plan.original_price !== undefined
                    ? parseFloat(plan.original_price)
                    : 0;
                const hasOriginalDiscount = priceNum > 0 && origPriceNum > priceNum;
                const discountPercent =
                  Number(plan.discount_percent) ||
                  (hasOriginalDiscount
                    ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100)
                    : 0);
                const trialDays = Math.max(0, parseInt(plan.free_trial_days, 10) || 0);
                const includedStorageGb = Math.max(0, parseInt(plan.included_storage_gb, 10) || 0);
                const includedSmsCredits = Math.max(0, parseInt(plan.included_sms_credits, 10) || 0);
                const includedPushCredits = Math.max(0, parseInt(plan.included_push_credits, 10) || 0);
                const hasFreeTrial =
                  trialDays > 0 ||
                  String(plan.billing_cycle || '').trim().toLowerCase() === 'trial' ||
                  priceNum <= 0;
                const maxStudents = Number(plan.max_students) || 0;
                const cycleMeta = plan.cycle_meta || {};
                const cycleSuffix =
                  cycleMeta.shortLabel || cycleMeta.short_label || cycleMeta.label || plan.billing_cycle || '';
                const descriptionText = plan.description ? String(plan.description).trim() : '';
                const planItems = Array.isArray(plan.items) ? plan.items : [];

                return (
                  <div key={plan.id} className="col-12 col-md-6 col-lg-4 d-flex">
                    <div
                      className={`card w-100 rounded-4 bg-white d-flex flex-column position-relative ${
                        isPopular
                          ? 'border border-2 border-primary shadow'
                          : 'border shadow-sm'
                      }`}
                    >
                      {isPopular && (
                        <div className="position-absolute top-0 end-0 mt-3 me-3">
                          <span className="badge rounded-pill bg-primary text-white px-3 py-1 fs-11 fw-semibold">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="card-body p-4 d-flex flex-column">
                        {/* Plan Title & Optional DB Description */}
                        <div className="mb-3 pe-5">
                          <h4 className="fw-bold text-dark mb-1">{plan.plan_name}</h4>
                          {descriptionText && (
                            <p className="text-muted fs-13 mb-0">{descriptionText}</p>
                          )}
                        </div>

                        {/* Price Section */}
                        <div className="pb-3 mb-3 border-bottom">
                          {hasOriginalDiscount && (
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className="fs-14 text-muted text-decoration-line-through fw-semibold">
                                ₹{origPriceNum.toLocaleString('en-IN')}
                              </span>
                              {discountPercent > 0 && (
                                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 fs-11 fw-bold">
                                  {discountPercent}% OFF
                                </span>
                              )}
                            </div>
                          )}

                          <div className="d-flex align-items-baseline gap-1">
                            <span className="display-6 fw-bold text-dark">
                              {priceNum <= 0
                                ? '₹0'
                                : `₹${priceNum.toLocaleString('en-IN')}`}
                            </span>
                            {priceNum > 0 && cycleSuffix && (
                              <span className="text-muted fs-14 fw-medium">/ {cycleSuffix}</span>
                            )}
                          </div>

                          {trialDays > 0 && (
                            <div className="mt-2">
                              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 fs-11 fw-semibold d-inline-flex align-items-center gap-1">
                                <ShieldCheck size={13} />
                                <span>Includes {trialDays}-Day Free Trial</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Capacities & Included Modules from DB */}
                        <ul className="list-unstyled fs-14 mb-4 d-flex flex-column gap-2 flex-grow-1">
                          <li className="d-flex align-items-center gap-2 text-dark">
                            <Users size={16} className="text-primary flex-shrink-0" />
                            <span>
                              <strong>
                                {maxStudents > 0
                                  ? `Up to ${maxStudents.toLocaleString('en-IN')}`
                                  : 'Unlimited'}
                              </strong>{' '}
                              Students
                            </span>
                          </li>

                          {includedStorageGb > 0 && (
                            <li className="d-flex align-items-center gap-2 text-dark">
                              <HardDrive size={16} className="text-primary flex-shrink-0" />
                              <span>
                                <strong>{includedStorageGb} GB</strong> Cloud Storage
                              </span>
                            </li>
                          )}

                          {includedSmsCredits > 0 && (
                            <li className="d-flex align-items-center gap-2 text-dark">
                              <MessageSquare size={16} className="text-primary flex-shrink-0" />
                              <span>
                                <strong>{includedSmsCredits.toLocaleString('en-IN')}</strong> SMS Credits Included
                              </span>
                            </li>
                          )}

                          {includedPushCredits > 0 && (
                            <li className="d-flex align-items-center gap-2 text-dark">
                              <BellRing size={16} className="text-primary flex-shrink-0" />
                              <span>
                                <strong>{includedPushCredits.toLocaleString('en-IN')}</strong> Push Notification Credits
                              </span>
                            </li>
                          )}

                          {planItems.map((item) => (
                            <li
                              key={item.id || item.item_code}
                              className="d-flex align-items-start gap-2 text-dark"
                            >
                              <Check
                                size={16}
                                className="text-success flex-shrink-0 mt-1"
                              />
                              <div>
                                <span>{item.item_name}</span>
                                {item.description && String(item.description).trim() && (
                                  <div className="text-muted fs-12">
                                    {String(item.description).trim()}
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>

                        {/* Action Button: Show ONLY Free Trial button when free_trial_days > 0, else Paid button */}
                        <div className="mt-auto pt-2">
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(plan)}
                            className={`btn w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                              hasFreeTrial
                                ? 'btn-success shadow-sm'
                                : isPopular
                                ? 'btn-primary shadow-sm'
                                : 'btn-outline-primary'
                            }`}
                          >
                            <span>
                              {hasFreeTrial
                                ? trialDays > 0
                                  ? `Start ${trialDays}-Day Free Trial`
                                  : 'Start Free Trial'
                                : `Select ${plan.plan_name}`}
                            </span>
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

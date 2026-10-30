'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  Lock,
  Users,
  Building2,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  BellRing,
  Sparkles,
  HardDrive,
  Cpu,
  IdCard,
  Plus,
  Minus,
  Trash2,
  Receipt,
  ChevronDown,
  ChevronUp,
  Layers,
  Tag,
  Loader2,
} from 'lucide-react';
import saasApi from '../lib/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
const SERVER_BASE = API_BASE.replace(/\/api\/?$/, '');

const resolveImageUrl = (pic) => {
  if (!pic || String(pic).trim() === '' || pic === 'null' || pic === 'undefined') {
    return null;
  }
  const clean = String(pic).trim();
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
    return clean;
  }
  if (clean.startsWith('/')) {
    return `${SERVER_BASE}${clean}`;
  }
  return `${SERVER_BASE}/upload/${clean}`;
};

export default function StepPlan({
  plans = [],
  selectedPlan,
  setSelectedPlan,
  billingCycle,
  setBillingCycle,
  isTrialMode = false,
  setIsTrialMode,
  catalog = {},
  catalogLoading = false,
  selectedStorageId,
  setSelectedStorageId,
  selectedMachines = {},
  setSelectedMachines,
  selectedCards = {},
  setSelectedCards,
  selectedNotifications = {},
  setSelectedNotifications,
  couponCode = '',
  setCouponCode,
  appliedCoupon = null,
  setAppliedCoupon,
  onNext,
}) {
  const [showPlanSwitcher, setShowPlanSwitcher] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    storage: false,
    machines: false,
    cards: false,
    notifications: false,
  });

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Derive distinct paid billing cycles strictly from DB plans and server-generated cycle_meta
  const availableCycles = useMemo(() => {
    const map = new Map();
    plans.forEach((p) => {
      const c = String(p.billing_cycle || '').toLowerCase();
      if (c && c !== 'trial' && parseFloat(p.price) > 0 && !map.has(c) && p.cycle_meta) {
        map.set(c, { ...p.cycle_meta, cycle: p.cycle_meta.cycle || p.cycle_meta.code || c });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => (a.rank ?? a.months ?? 0) - (b.rank ?? b.months ?? 0)
    );
  }, [plans]);

  const trialPlan = useMemo(
    () =>
      plans.find(
        (p) => String(p.billing_cycle || '').toLowerCase() === 'trial' || parseFloat(p.price) <= 0
      ) || null,
    [plans]
  );

  const activePaidCycle = useMemo(() => {
    const current = String(billingCycle || selectedPlan?.billing_cycle || '').toLowerCase();
    if (current && current !== 'trial' && availableCycles.some((c) => c.cycle === current)) {
      return current;
    }
    const annualMatch = availableCycles.find((c) => c.cycle === 'annual');
    return annualMatch ? annualMatch.cycle : availableCycles[0]?.cycle || '';
  }, [billingCycle, selectedPlan?.billing_cycle, availableCycles]);

  const plansForActiveCycle = useMemo(() => {
    return plans
      .filter((p) => {
        const isTr = String(p.billing_cycle || '').toLowerCase() === 'trial' || parseFloat(p.price) <= 0;
        return !isTr && String(p.billing_cycle || '').toLowerCase() === activePaidCycle;
      })
      .sort(
        (a, b) =>
          (Number(a.tier_rank) || 0) - (Number(b.tier_rank) || 0) ||
          parseFloat(a.price || 0) - parseFloat(b.price || 0)
      );
  }, [plans, activePaidCycle]);

  const handleChoosePlan = (plan, activateAsTrial = true) => {
    if (!plan) return;
    if (setSelectedPlan) setSelectedPlan(plan);
    const planCycle = String(plan.billing_cycle || '').toLowerCase();
    if (setBillingCycle && planCycle) {
      setBillingCycle(planCycle);
    }
    const trialFlag = appliedCoupon
      ? false
      : Boolean(
        activateAsTrial ||
        planCycle === 'trial' ||
        parseFloat(plan.price) <= 0 ||
        parseInt(plan.free_trial_days, 10) > 0
      );
    if (setIsTrialMode) {
      setIsTrialMode(trialFlag);
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('plan_id', String(plan.id));
      if (planCycle) url.searchParams.set('cycle', planCycle);
      url.searchParams.set('trial', trialFlag ? '1' : '0');
      window.history.replaceState({}, '', url.toString());
    }
    setShowPlanSwitcher(false);
  };

  const handleSwitchCycleTab = (nextCycle) => {
    if (setBillingCycle) setBillingCycle(nextCycle);
    if (selectedPlan && String(selectedPlan.billing_cycle || '').toLowerCase() !== 'trial') {
      const candidates = plans.filter(
        (p) => String(p.billing_cycle || '').toLowerCase() === String(nextCycle).toLowerCase()
      );
      if (candidates.length > 0) {
        const sameGroupOrRank =
          candidates.find(
            (p) =>
              (selectedPlan.plan_group && p.plan_group === selectedPlan.plan_group) ||
              Number(p.tier_rank) === Number(selectedPlan.tier_rank)
          ) ||
          candidates.find((p) => Number(p.is_popular) === 1) ||
          candidates[0];
        if (sameGroupOrRank && setSelectedPlan) {
          setSelectedPlan(sameGroupOrRank);
          if (setIsTrialMode) setIsTrialMode(false);
        }
      }
    }
  };

  if (!selectedPlan) {
    return (
      <div className="card border-0 shadow-sm rounded-4 p-4 text-center">
        <h5 className="fw-bold mb-2">Choose Your Institutional Package</h5>
        <p className="text-muted fs-14 mb-4">
          Select a subscription tier from our active catalog to configure your school portal.
        </p>
        <div className="row g-3 justify-content-center">
          {plans.map((p) => {
            const pMeta = p.cycle_meta || {};
            return (
              <div key={p.id} className="col-md-6 col-lg-4">
                <div
                  className="card h-100 border p-3 text-start hover-shadow"
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    handleChoosePlan(
                      p,
                      String(p.billing_cycle || '').toLowerCase() === 'trial' || parseFloat(p.price) <= 0
                    )
                  }
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h6 className="fw-bold text-dark mb-0">{p.plan_name}</h6>
                    {pMeta.label && (
                      <span className="badge bg-light text-secondary border fs-11">{pMeta.label}</span>
                    )}
                  </div>
                  <div className="fs-18 fw-bold text-primary mb-2">
                    {parseFloat(p.price) <= 0
                      ? 'Free'
                      : `₹${Number(p.price).toLocaleString('en-IN')}`}
                    {pMeta.shortLabel && parseFloat(p.price) > 0 && (
                      <span className="fs-12 text-muted fw-normal"> / {pMeta.shortLabel}</span>
                    )}
                  </div>
                  <button type="button" className="btn btn-outline-primary btn-sm w-100 mt-auto">
                    Select Package
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const trialDays = Math.max(0, parseInt(selectedPlan.free_trial_days, 10) || 0);
  const includedStorageGb = Math.max(0, parseInt(selectedPlan.included_storage_gb, 10) || 0);
  const basePrice = parseFloat(selectedPlan.price || 0);
  const isPureTrialPlan =
    String(selectedPlan.billing_cycle || '').toLowerCase() === 'trial' || basePrice <= 0;
  const cycle = String(selectedPlan.billing_cycle || billingCycle || '').toLowerCase();
  const cycleMeta = selectedPlan.cycle_meta || {
    cycle,
    label: cycle,
    shortLabel: cycle,
    durationText: '',
  };

  // Storage add-on cycle aligns with selected paid cycle, or annual when on free trial
  const effectiveStorageCycle =
    isPureTrialPlan || isTrialMode ? activePaidCycle || 'annual' : cycle || 'annual';
  const storageCycleMeta =
    availableCycles.find((c) => c.cycle === effectiveStorageCycle) || cycleMeta;

  // Catalog items
  const storagePlans = catalog.storage_plans || [];
  const attendanceMachines = catalog.attendance_machines || [];
  const rfidCards = catalog.rfid_cards || [];
  const notificationRecords = catalog.notification_records || [];

  // Handlers for Storage
  const handleSelectStorage = (storageId) => {
    if (setSelectedStorageId) {
      setSelectedStorageId((prev) => (Number(prev) === Number(storageId) ? null : storageId));
    }
  };

  const handleClearStorage = () => {
    if (setSelectedStorageId) {
      setSelectedStorageId(null);
    }
  };

  // Handlers for Machines
  const handleAddMachine = (machine) => {
    if (!machine || !setSelectedMachines) return;
    setSelectedMachines((prev) => ({
      ...prev,
      [machine.id]: (prev[machine.id] || 0) + 1,
    }));
  };

  const handleIncreaseMachineQty = (machine) => {
    if (!machine || !setSelectedMachines) return;
    setSelectedMachines((prev) => ({
      ...prev,
      [machine.id]: (prev[machine.id] || 0) + 1,
    }));
  };

  const handleDecreaseMachineQty = (machine) => {
    if (!machine || !setSelectedMachines) return;
    setSelectedMachines((prev) => {
      const current = prev[machine.id] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[machine.id];
        return next;
      }
      return { ...prev, [machine.id]: current - 1 };
    });
  };

  const handleRemoveMachine = (machineId) => {
    if (!setSelectedMachines) return;
    setSelectedMachines((prev) => {
      const next = { ...prev };
      delete next[machineId];
      return next;
    });
  };

  // Handlers for RFID Cards (strictly enforcing min_order_qty from DB)
  const handleAddCard = (card) => {
    if (!card || !setSelectedCards) return;
    const minQty = Math.max(1, parseInt(card.min_order_qty, 10) || 1);
    setSelectedCards((prev) => ({
      ...prev,
      [card.id]: Math.max(minQty, (prev[card.id] || 0) + minQty),
    }));
  };

  const handleIncreaseCardQty = (card) => {
    if (!card || !setSelectedCards) return;
    const minQty = Math.max(1, parseInt(card.min_order_qty, 10) || 1);
    setSelectedCards((prev) => ({
      ...prev,
      [card.id]: Math.max(minQty, (prev[card.id] || 0) + 1),
    }));
  };

  const handleDecreaseCardQty = (card) => {
    if (!card || !setSelectedCards) return;
    const minQty = Math.max(1, parseInt(card.min_order_qty, 10) || 1);
    setSelectedCards((prev) => {
      const current = prev[card.id] || 0;
      if (current <= minQty) {
        const next = { ...prev };
        delete next[card.id];
        return next;
      }
      return { ...prev, [card.id]: current - 1 };
    });
  };

  const handleSetCardQty = (card, rawVal) => {
    if (!card || !setSelectedCards) return;
    const minQty = Math.max(1, parseInt(card.min_order_qty, 10) || 1);
    const parsed = parseInt(rawVal, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      handleRemoveCard(card.id);
      return;
    }
    setSelectedCards((prev) => ({
      ...prev,
      [card.id]: Math.max(minQty, parsed),
    }));
  };

  const handleRemoveCard = (cardId) => {
    if (!setSelectedCards) return;
    setSelectedCards((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  // Handlers for Notifications (strictly enforcing min_qty from notification_pricing_master)
  const handleToggleNotification = (record) => {
    if (!record || !setSelectedNotifications) return;
    const minQty = Math.max(1, parseInt(record.min_qty, 10) || 1);
    setSelectedNotifications((prev) => {
      const existing = prev[record.id];
      if (existing && existing.selected) {
        return {
          ...prev,
          [record.id]: { ...existing, selected: false, quantity: 0 },
        };
      }
      return {
        ...prev,
        [record.id]: {
          selected: true,
          quantity: Math.max(minQty, parseInt(existing?.quantity, 10) || minQty),
        },
      };
    });
  };

  const handleIncreaseNotificationQty = (record) => {
    if (!record || !setSelectedNotifications) return;
    const minQty = Math.max(1, parseInt(record.min_qty, 10) || 1);
    setSelectedNotifications((prev) => {
      const existing = prev[record.id] || { selected: true, quantity: minQty };
      const current = Math.max(minQty, parseInt(existing.quantity, 10) || minQty);
      return {
        ...prev,
        [record.id]: { selected: true, quantity: current + minQty },
      };
    });
  };

  const handleDecreaseNotificationQty = (record) => {
    if (!record || !setSelectedNotifications) return;
    const minQty = Math.max(1, parseInt(record.min_qty, 10) || 1);
    setSelectedNotifications((prev) => {
      const existing = prev[record.id];
      if (!existing) return prev;
      const current = parseInt(existing.quantity, 10) || minQty;
      if (current <= minQty) {
        return {
          ...prev,
          [record.id]: { ...existing, selected: false, quantity: 0 },
        };
      }
      return {
        ...prev,
        [record.id]: { ...existing, selected: true, quantity: current - minQty },
      };
    });
  };

  const handleSetNotificationQty = (record, rawVal) => {
    if (!record || !setSelectedNotifications) return;
    const minQty = Math.max(1, parseInt(record.min_qty, 10) || 1);
    const parsed = parseInt(rawVal, 10);
    setSelectedNotifications((prev) => ({
      ...prev,
      [record.id]: {
        selected: true,
        quantity: Number.isNaN(parsed) ? minQty : Math.max(minQty, parsed),
      },
    }));
  };

  // Subtotal calculations (100% Server-Driven, Zero GST)
  const selectedStorage = useMemo(() => {
    return storagePlans.find((s) => Number(s.id) === Number(selectedStorageId)) || null;
  }, [storagePlans, selectedStorageId]);

  const storagePrice = useMemo(() => {
    if (!selectedStorage) return 0;
    return Number(selectedStorage?.cycle_prices?.[effectiveStorageCycle] ?? 0);
  }, [selectedStorage, effectiveStorageCycle]);

  const machinesTotal = useMemo(() => {
    return Object.entries(selectedMachines).reduce((sum, [id, qty]) => {
      const m = attendanceMachines.find((item) => Number(item.id) === Number(id));
      if (!m || qty <= 0) return sum;
      return sum + Math.round(parseFloat(m.unit_price || 0) * qty * 100) / 100;
    }, 0);
  }, [selectedMachines, attendanceMachines]);

  const selectedCardsList = useMemo(() => {
    return Object.entries(selectedCards)
      .map(([id, qty]) => {
        const c = rfidCards.find((item) => Number(item.id) === Number(id));
        if (!c || qty <= 0) return null;
        const unitPrice = parseFloat(c.unit_price || 0);
        return {
          id: c.id,
          card_name: c.card_name,
          quantity: qty,
          unitPrice,
          total: Math.round(unitPrice * qty * 100) / 100,
        };
      })
      .filter(Boolean);
  }, [selectedCards, rfidCards]);

  const totalCardsQty = useMemo(() => {
    return selectedCardsList.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedCardsList]);

  const cardsTotal = useMemo(() => {
    return selectedCardsList.reduce((sum, item) => sum + item.total, 0);
  }, [selectedCardsList]);

  const notificationsTotal = useMemo(() => {
    return Object.entries(selectedNotifications).reduce((sum, [id, cfg]) => {
      if (!cfg?.selected || !cfg?.quantity) return sum;
      const n = notificationRecords.find((item) => Number(item.id) === Number(id));
      if (!n) return sum;
      const rate = parseFloat(n.cost || n.unit_price || 0);
      return sum + Math.round(rate * cfg.quantity * 100) / 100;
    }, 0);
  }, [selectedNotifications, notificationRecords]);

  const addonsTotal =
    Math.round((storagePrice + machinesTotal + cardsTotal + notificationsTotal) * 100) / 100;
  const effectiveBasePrice = isPureTrialPlan ? 0 : basePrice;
  const subtotalAmount = Math.round((effectiveBasePrice + addonsTotal) * 100) / 100;

  const computeScopedDiscount = (planAmt) => {
    if (!appliedCoupon) return 0;
    const scope = String(
      appliedCoupon.applicable_scope || appliedCoupon.applicableScope || 'plan_only'
    ).toLowerCase();
    const eligibleSubtotal =
      scope === 'all'
        ? planAmt + addonsTotal
        : scope === 'software_and_storage'
          ? planAmt + storagePrice
          : planAmt;

    if (eligibleSubtotal <= 0) return 0;
    const minOrder = parseFloat(
      appliedCoupon.min_order_amount ?? appliedCoupon.minOrderAmount ?? 0
    );
    if (minOrder > 0 && eligibleSubtotal < minOrder) return 0;

    let disc = 0;
    const dVal = parseFloat(appliedCoupon.discount_value ?? appliedCoupon.discountValue ?? 0);
    const dType = String(
      appliedCoupon.discount_type || appliedCoupon.discountType || ''
    ).toLowerCase();

    if (dType === 'percentage' && dVal > 0) {
      disc = (eligibleSubtotal * dVal) / 100;
      const maxD = parseFloat(
        appliedCoupon.max_discount ??
        appliedCoupon.max_discount_amount ??
        appliedCoupon.maxDiscountAmount ??
        0
      );
      if (maxD > 0 && disc > maxD) disc = maxD;
    } else if (dVal > 0) {
      disc = dVal;
    } else if (
      appliedCoupon.discountAmount !== undefined ||
      appliedCoupon.discount_amount !== undefined
    ) {
      disc = parseFloat(appliedCoupon.discountAmount ?? appliedCoupon.discount_amount ?? 0);
    }

    return Math.min(eligibleSubtotal, Math.round(disc * 100) / 100);
  };

  const discountAmount = computeScopedDiscount(effectiveBasePrice);
  const grandTotal = Math.max(0, Math.round((subtotalAmount - discountAmount) * 100) / 100);

  const handleApplyCoupon = async () => {
    if (!couponCode || !couponCode.trim()) return;
    try {
      setValidatingCoupon(true);
      setCouponError('');
      const activePlanAmt = effectiveBasePrice;
      const activeSub = Math.round((activePlanAmt + addonsTotal) * 100) / 100;

      const res = await saasApi.validateCoupon({
        code: couponCode.trim(),
        amount: activeSub,
        plan_amount: activePlanAmt,
        storage_amount: storagePrice,
      });

      if (res?.data) {
        if (setAppliedCoupon) setAppliedCoupon(res.data);
        if (setIsTrialMode) setIsTrialMode(false);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('trial', '0');
          window.history.replaceState({}, '', url.toString());
        }
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
    if (setIsTrialMode) setIsTrialMode(true);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('trial', '1');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Extract SMS & Push items if listed on plan items
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

  const planItems = (selectedPlan.items || []).filter(
    (it) => it !== smsItem && it !== pushItem
  );

  return (
    <div className="row g-4">
      {/* LEFT COLUMN: Plan Switcher, Selected Plan Details & Add-ons Customization */}
      <div className="col-12 col-md-7 col-lg-8 d-flex flex-column gap-4">
        {/* ============================================================ */}
        {/* CONTAINER 1: SELECTED PLAN DETAILS CONTAINER                 */}
        {/* ============================================================ */}
        <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5">
          {/* Plan Header */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
            <div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fs-12 fw-bold text-uppercase mb-2">
                Selected Package • {cycleMeta.label}
              </span>
              <h3 className="fw-bold text-dark mb-1">{selectedPlan.plan_name}</h3>
              <p className="text-muted fs-14 mb-0">
                {selectedPlan.description || 'Full institutional management platform.'}
              </p>
            </div>

            <div className="text-md-end">
              {basePrice > 0 && Number(selectedPlan.original_price) > Number(selectedPlan.price) && (
                <div className="d-flex align-items-center gap-2 justify-content-md-end mb-1">
                  <span className="fs-15 text-muted text-decoration-line-through fw-semibold">
                    ₹{Number(selectedPlan.original_price).toLocaleString('en-IN')}
                  </span>
                  <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 fs-11 fw-bold">
                    {Math.round(
                      ((Number(selectedPlan.original_price) - Number(selectedPlan.price)) /
                        Number(selectedPlan.original_price)) *
                      100
                    )}
                    % OFF
                  </span>
                </div>
              )}
              <div className="d-flex align-items-baseline gap-2 justify-content-md-end">
                <span className="display-6 fw-bold text-primary">
                  {basePrice <= 0 ? 'Free' : `₹${Number(basePrice).toLocaleString('en-IN')}`}
                </span>
                <span className="text-muted fs-14 fw-semibold">
                  {basePrice <= 0
                    ? trialDays > 0
                      ? `/ ${trialDays} days`
                      : ''
                    : `/ ${cycleMeta.shortLabel || cycleMeta.label}`}
                </span>
              </div>
              {trialDays > 0 ? (
                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 fs-11 fw-semibold mt-1">
                  <ShieldCheck size={12} className="me-1 inline" />
                  {isPureTrialPlan ? `${trialDays}-Day Free Evaluation` : `Includes ${trialDays}-Day Free Trial`}
                </span>
              ) : (
                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 fs-11 fw-semibold mt-1">
                  <ShieldCheck size={12} className="me-1 inline" />
                  Instant Online Activation • Flat Net Price
                </span>
              )}
            </div>
          </div>

          {/* Plan Capabilities & Limits (100% Dynamic from DB) */}
          <h6 className="fw-bold text-dark fs-13 text-uppercase mb-3">Included Institutional Capacity:</h6>
          <div className={`row g-3 ${planItems.length > 0 ? 'mb-4' : ''}`}>
            <div className="col-sm-6 col-lg-3">
              <div className="p-3 bg-light rounded-3 border h-100">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <Users size={18} className="text-primary" />
                  <span className="fs-12 text-muted fw-semibold">Student Capacity</span>
                </div>
                <div className="fs-16 fw-bold text-dark">
                  {Number(selectedPlan.max_students) > 0
                    ? `Up to ${Number(selectedPlan.max_students).toLocaleString('en-IN')} Students`
                    : 'Unlimited Students'}
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="p-3 bg-light rounded-3 border h-100">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <Building2 size={18} className="text-success" />
                  <span className="fs-12 text-muted fw-semibold">Teachers &amp; Branches</span>
                </div>
                <div className="fs-16 fw-bold text-dark">Unlimited</div>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="p-3 bg-light rounded-3 border h-100">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <HardDrive size={18} className="text-primary" />
                  <span className="fs-12 text-muted fw-semibold">Cloud Storage</span>
                </div>
                <div className="fs-16 fw-bold text-dark">{includedStorageGb} GB Included</div>
              </div>
            </div>

            {trialDays > 0 && (
              <div className="col-sm-6 col-lg-3">
                <div className="p-3 bg-light rounded-3 border h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <ShieldCheck size={18} className="text-success" />
                    <span className="fs-12 text-muted fw-semibold">Free Trial Duration</span>
                  </div>
                  <div className="fs-16 fw-bold text-dark">{trialDays} Days Free</div>
                </div>
              </div>
            )}

            {smsItem && (
              <div className="col-sm-6 col-lg-3">
                <div className="p-3 bg-light rounded-3 border h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <MessageSquare size={18} className="text-info" />
                    <span className="fs-12 text-muted fw-semibold">SMS Gateway</span>
                  </div>
                  <div className="fs-16 fw-bold text-dark">{smsItem.item_name}</div>
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
                  <div className="fs-16 fw-bold text-dark">{pushItem.item_name}</div>
                </div>
              </div>
            )}
          </div>

          {/* Plan Features */}
          {planItems.length > 0 && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="fw-bold text-dark fs-13 text-uppercase mb-0 d-flex align-items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <span>Included Platform Features:</span>
                </h6>
              </div>

              <div className="row g-3">
                {planItems.map((it) => (
                  <div key={it.id || it.item_code} className="col-12 col-md-6">
                    <div
                      className={`p-3 rounded-3 bg-light border d-flex ${it.description ? 'align-items-start' : 'align-items-center'
                        } gap-3 h-100`}
                    >
                      <div
                        className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: '28px', height: '28px', minWidth: '28px' }}
                      >
                        <Check size={16} strokeWidth={2.5} className="text-success" />
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <span className="fw-semibold text-dark fs-14">{it.item_name}</span>
                        {it.description && (
                          <p className="text-muted fs-12 mb-0 mt-1 lh-sm">{it.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* CONTAINER 2: ADD-ONS & HARDWARE CUSTOMIZATION CONTAINER      */}
        {/* ============================================================ */}
        <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-2">
            <div>
              <span className="badge bg-secondary-subtle text-dark border rounded-pill px-3 py-1 fs-12 fw-bold text-uppercase mb-2">
                Package Customization
              </span>
              <h4 className="fw-bold text-dark mb-1">Optional Add-ons &amp; Hardware</h4>
              <p className="text-muted fs-14 mb-0">
                Expand beyond your {includedStorageGb} GB base cloud storage, add biometric hardware &amp; smart RFID cards, or preload SMS &amp; Push notification credits.
              </p>
            </div>
            {addonsTotal > 0 && (
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2 fs-13 fw-semibold">
                +₹{addonsTotal.toLocaleString('en-IN')} Add-ons Selected
              </span>
            )}
          </div>

          {/* 1. CLOUD STORAGE TIERS */}
          <div className="border rounded-3 p-3 p-md-4 mb-4 bg-light-subtle">
            <div
              className="d-flex align-items-center justify-content-between"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSection('storage')}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
                  style={{ width: '40px', height: '40px' }}
                >
                  <HardDrive size={20} />
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-0 fs-16">Dedicated Cloud Storage Upgrades</h5>
                  <p className="text-muted fs-13 mb-0">
                    Stacks directly onto your {includedStorageGb} GB base cloud storage ({storageCycleMeta.label || effectiveStorageCycle} cycle)
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                {selectedStorage && (
                  <span className="badge bg-primary text-white rounded-pill px-3 py-1 fs-12 fw-semibold">
                    {selectedStorage.plan_name} (+₹{storagePrice.toLocaleString('en-IN')})
                  </span>
                )}
                {collapsedSections.storage ? (
                  <ChevronDown size={20} className="text-muted" />
                ) : (
                  <ChevronUp size={20} className="text-muted" />
                )}
              </div>
            </div>

            {!collapsedSections.storage && (
              <div className="mt-4 pt-3 border-top">
                {catalogLoading ? (
                  <div className="text-center py-3 text-muted fs-14">Loading cloud storage tiers...</div>
                ) : storagePlans.length === 0 ? (
                  <div className="text-center py-3 text-muted fs-14">
                    No additional storage tiers available at this time.
                  </div>
                ) : (
                  <>
                    <div className="row g-3">
                      {storagePlans.map((st) => {
                        const isSelected = Number(selectedStorageId) === Number(st.id);
                        const price = Number(st?.cycle_prices?.[effectiveStorageCycle] ?? 0);

                        return (
                          <div key={st.id} className="col-12 col-sm-6 col-xl-3">
                            <div
                              className={`p-3 rounded-3 border h-100 transition-all ${isSelected
                                  ? 'bg-primary-subtle border-primary shadow-sm'
                                  : 'bg-white hover-shadow border-light-subtle'
                                }`}
                              style={{ cursor: 'pointer', transition: 'all 0.15s ease-in-out' }}
                              onClick={() => handleSelectStorage(st.id)}
                            >
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="fw-bold fs-15 text-dark">{st.plan_name}</span>
                                <div
                                  className={`rounded-circle d-flex align-items-center justify-content-center border ${isSelected
                                      ? 'bg-primary text-white border-primary'
                                      : 'bg-light border-secondary-subtle'
                                    }`}
                                  style={{ width: '20px', height: '20px' }}
                                >
                                  {isSelected && <Check size={12} strokeWidth={3} />}
                                </div>
                              </div>
                              <div className="fs-13 text-muted mb-2">
                                Capacity:{' '}
                                <strong>
                                  +{st.storage_capacity}{' '}
                                  {st.unit_code || (Number(st.capacity_unit_id) === 3 ? 'TB' : 'GB')}
                                </strong>
                              </div>
                              <div className="fs-16 fw-bold text-primary">
                                ₹{price.toLocaleString('en-IN')}
                                <span className="fs-12 text-muted fw-normal">
                                  {' '}
                                  / {storageCycleMeta.shortLabel || storageCycleMeta.label || effectiveStorageCycle}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedStorageId && (
                      <div className="d-flex justify-content-end mt-3">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
                          onClick={handleClearStorage}
                        >
                          <Trash2 size={14} />
                          <span>Remove Storage Add-on</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* 2. BIOMETRIC ATTENDANCE TERMINALS */}
          <div className="border rounded-3 p-3 p-md-4 mb-4 bg-light-subtle">
            <div
              className="d-flex align-items-center justify-content-between"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSection('machines')}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 bg-success-subtle text-success d-flex align-items-center justify-content-center"
                  style={{ width: '40px', height: '40px' }}
                >
                  <Cpu size={20} />
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-0 fs-16">Biometric Attendance Terminals</h5>
                  <p className="text-muted fs-13 mb-0">
                    Fingerprint, Facial Recognition, and RFID integrated attendance hardware (one-time purchase)
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                {machinesTotal > 0 && (
                  <span className="badge bg-success text-white rounded-pill px-3 py-1 fs-12 fw-semibold">
                    +₹{machinesTotal.toLocaleString('en-IN')}
                  </span>
                )}
                {collapsedSections.machines ? (
                  <ChevronDown size={20} className="text-muted" />
                ) : (
                  <ChevronUp size={20} className="text-muted" />
                )}
              </div>
            </div>

            {!collapsedSections.machines && (
              <div className="mt-4 pt-3 border-top">
                {attendanceMachines.length === 0 ? (
                  <div className="text-center py-4 bg-white rounded-3 border text-muted">
                    <Cpu size={28} className="text-secondary opacity-50 mb-2" />
                    <p className="mb-0 fs-13">No biometric machines currently listed in catalog.</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {attendanceMachines.map((m) => {
                      const qty = selectedMachines[m.id] || 0;
                      const isAdded = qty > 0;
                      const imgUrl = resolveImageUrl(m.machine_image);

                      return (
                        <div key={m.id} className="col-12 col-md-6">
                          <div
                            className={`p-3 rounded-3 border h-100 d-flex flex-column ${isAdded ? 'bg-white border-success shadow-sm' : 'bg-white border-light-subtle'
                              }`}
                          >
                            <div className="d-flex gap-3 align-items-start mb-3">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={m.machine_name}
                                  className="rounded-3 border object-fit-cover"
                                  style={{ width: '64px', height: '64px', minWidth: '64px' }}
                                />
                              ) : (
                                <div
                                  className="rounded-3 bg-light border d-flex align-items-center justify-content-center text-muted"
                                  style={{ width: '64px', height: '64px', minWidth: '64px' }}
                                >
                                  <Cpu size={28} className="text-secondary" />
                                </div>
                              )}

                              <div className="flex-grow-1 min-w-0">
                                <h6 className="fw-bold text-dark mb-1 fs-15">{m.machine_name}</h6>
                                <div className="fs-12 text-muted mb-1">
                                  {m.brand && <span className="me-2">Brand: {m.brand}</span>}
                                  {m.model_number && <span>Model: {m.model_number}</span>}
                                </div>
                                {(m.user_capacity || m.log_capacity) && (
                                  <div className="fs-12 text-muted mb-1">
                                    {m.user_capacity && (
                                      <span className="me-2">
                                        Capacity: {Number(m.user_capacity).toLocaleString('en-IN')} Users
                                      </span>
                                    )}
                                    {m.log_capacity && (
                                      <span>({Number(m.log_capacity).toLocaleString('en-IN')} Logs)</span>
                                    )}
                                  </div>
                                )}
                                <div className="fs-16 fw-bold text-success">
                                  ₹{parseFloat(m.unit_price || 0).toLocaleString('en-IN')}
                                  <span className="fs-11 text-muted fw-normal"> / unit</span>
                                </div>
                              </div>
                            </div>

                            <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-auto">
                              {!isAdded ? (
                                <button
                                  type="button"
                                  className="btn btn-outline-success btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-2"
                                  onClick={() => handleAddMachine(m)}
                                >
                                  <Plus size={14} />
                                  <span>Add Terminal</span>
                                </button>
                              ) : (
                                <div className="d-flex align-items-center justify-content-between w-100">
                                  <span className="fs-13 fw-semibold text-dark">
                                    Subtotal: ₹{(parseFloat(m.unit_price || 0) * qty).toLocaleString('en-IN')}
                                  </span>
                                  <div className="d-flex align-items-center gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary p-1 rounded-circle d-flex align-items-center justify-content-center"
                                      style={{ width: '28px', height: '28px' }}
                                      onClick={() => handleDecreaseMachineQty(m)}
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span className="fw-bold fs-14 px-2">{qty}</span>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary p-1 rounded-circle d-flex align-items-center justify-content-center"
                                      style={{ width: '28px', height: '28px' }}
                                      onClick={() => handleIncreaseMachineQty(m)}
                                    >
                                      <Plus size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm text-danger ms-2 p-1"
                                      onClick={() => handleRemoveMachine(m.id)}
                                      title="Remove machine"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. RFID SMART IDENTITY CARDS */}
          <div className="border rounded-3 p-3 p-md-4 mb-4 bg-light-subtle">
            <div
              className="d-flex align-items-center justify-content-between"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSection('cards')}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 bg-warning-subtle text-warning d-flex align-items-center justify-content-center"
                  style={{ width: '40px', height: '40px' }}
                >
                  <IdCard size={20} />
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-0 fs-16">Smart RFID Student &amp; Staff Identity Cards</h5>
                  <p className="text-muted fs-13 mb-0">
                    Pre-encoded NFC/RFID cards compatible with biometric access gates
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                {cardsTotal > 0 && (
                  <span className="badge bg-warning text-dark rounded-pill px-3 py-1 fs-12 fw-semibold">
                    +₹{cardsTotal.toLocaleString('en-IN')}
                  </span>
                )}
                {collapsedSections.cards ? (
                  <ChevronDown size={20} className="text-muted" />
                ) : (
                  <ChevronUp size={20} className="text-muted" />
                )}
              </div>
            </div>

            {!collapsedSections.cards && (
              <div className="mt-4 pt-3 border-top">
                {rfidCards.length === 0 ? (
                  <div className="text-center py-4 bg-white rounded-3 border text-muted">
                    <IdCard size={28} className="text-secondary opacity-50 mb-2" />
                    <p className="mb-0 fs-13">No RFID cards currently listed in catalog.</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {rfidCards.map((c) => {
                      const minQty = Math.max(1, parseInt(c.min_order_qty, 10) || 1);
                      const qty = selectedCards[c.id] || 0;
                      const isAdded = qty > 0;
                      const imgUrl = resolveImageUrl(c.card_image || c.rfid_image);

                      return (
                        <div key={c.id} className="col-12 col-md-6">
                          <div
                            className={`p-3 rounded-3 border h-100 d-flex flex-column ${isAdded ? 'bg-white border-warning shadow-sm' : 'bg-white border-light-subtle'
                              }`}
                          >
                            <div className="d-flex gap-3 align-items-start mb-3">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={c.card_name}
                                  className="rounded-3 border object-fit-cover"
                                  style={{ width: '64px', height: '64px', minWidth: '64px' }}
                                />
                              ) : (
                                <div
                                  className="rounded-3 bg-light border d-flex align-items-center justify-content-center text-muted"
                                  style={{ width: '64px', height: '64px', minWidth: '64px' }}
                                >
                                  <IdCard size={28} className="text-secondary" />
                                </div>
                              )}

                              <div className="flex-grow-1 min-w-0">
                                <h6 className="fw-bold text-dark mb-1 fs-15">{c.card_name}</h6>
                                <div className="fs-12 text-muted mb-1">
                                  {c.frequency && <span className="me-2">Freq: {c.frequency}</span>}
                                  <span>Min order: {minQty} pcs</span>
                                </div>
                                <div className="fs-16 fw-bold text-warning-emphasis">
                                  ₹{parseFloat(c.unit_price || 0).toLocaleString('en-IN')}
                                  <span className="fs-11 text-muted fw-normal"> / card</span>
                                </div>
                              </div>
                            </div>

                            <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-auto">
                              {!isAdded ? (
                                <button
                                  type="button"
                                  className="btn btn-outline-warning text-dark btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-2"
                                  onClick={() => handleAddCard(c)}
                                >
                                  <Plus size={14} />
                                  <span>Order Cards (Min. {minQty} pcs)</span>
                                </button>
                              ) : (
                                <div className="d-flex align-items-center justify-content-between w-100 gap-2">
                                  <span className="fs-13 fw-semibold text-dark">
                                    ₹{(parseFloat(c.unit_price || 0) * qty).toLocaleString('en-IN')}
                                  </span>
                                  <div className="d-flex align-items-center gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary p-1 rounded-circle d-flex align-items-center justify-content-center"
                                      style={{ width: '28px', height: '28px' }}
                                      onClick={() => handleDecreaseCardQty(c)}
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <input
                                      type="number"
                                      min={minQty}
                                      className="form-control form-control-sm text-center fw-bold px-1"
                                      style={{ width: '68px', height: '30px' }}
                                      value={qty}
                                      onChange={(e) => handleSetCardQty(c, e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary p-1 rounded-circle d-flex align-items-center justify-content-center"
                                      style={{ width: '28px', height: '28px' }}
                                      onClick={() => handleIncreaseCardQty(c)}
                                    >
                                      <Plus size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm text-danger ms-1 p-1"
                                      onClick={() => handleRemoveCard(c.id)}
                                      title="Remove cards"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. PREPAID SMS & PUSH NOTIFICATION CREDITS */}
          <div className="border rounded-3 p-3 p-md-4 bg-light-subtle">
            <div
              className="d-flex align-items-center justify-content-between"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSection('notifications')}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 bg-info-subtle text-info d-flex align-items-center justify-content-center"
                  style={{ width: '40px', height: '40px' }}
                >
                  <BellRing size={20} />
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-0 fs-16">Prepaid SMS &amp; Push Notification Credits</h5>
                  <p className="text-muted fs-13 mb-0">
                    Metered communication credits added directly to your school wallet (credits never expire)
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                {notificationsTotal > 0 && (
                  <span className="badge bg-info text-dark rounded-pill px-3 py-1 fs-12 fw-semibold">
                    +₹{notificationsTotal.toLocaleString('en-IN')}
                  </span>
                )}
                {collapsedSections.notifications ? (
                  <ChevronDown size={20} className="text-muted" />
                ) : (
                  <ChevronUp size={20} className="text-muted" />
                )}
              </div>
            </div>

            {!collapsedSections.notifications && (
              <div className="mt-4 pt-3 border-top">
                {notificationRecords.length === 0 ? (
                  <div className="text-center py-4 bg-white rounded-3 border text-muted">
                    <BellRing size={28} className="text-secondary opacity-50 mb-2" />
                    <p className="mb-0 fs-13">No notification credit packs currently listed in catalog.</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {notificationRecords.map((n) => {
                      const minQty = Math.max(1, parseInt(n.min_qty, 10) || 1);
                      const cfg = selectedNotifications[n.id] || { selected: false, quantity: minQty };
                      const isSelected = Boolean(cfg.selected);
                      const qty = isSelected ? Math.max(minQty, parseInt(cfg.quantity, 10) || minQty) : minQty;
                      const cost = parseFloat(n.cost || n.unit_price || 0);
                      const sub = Math.round(cost * qty * 100) / 100;

                      return (
                        <div key={n.id} className="col-12 col-md-6">
                          <div
                            className={`p-3 rounded-3 border h-100 ${isSelected ? 'bg-white border-info shadow-sm' : 'bg-white border-light-subtle'
                              }`}
                          >
                            <div className="d-flex align-items-center justify-content-between mb-1">
                              <span className="fw-bold fs-15 text-dark text-capitalize">
                                {n.pack_name || n.name || `${n.type || n.channel} Credits`}
                              </span>
                              <div className="form-check form-switch mb-0">
                                <input
                                  className="form-check-input"
                                  style={{ cursor: 'pointer' }}
                                  type="checkbox"
                                  role="switch"
                                  id={`notif-switch-${n.id}`}
                                  checked={isSelected}
                                  onChange={() => handleToggleNotification(n)}
                                />
                              </div>
                            </div>
                            <div className="text-muted fs-11 mb-2">
                              Min. {minQty.toLocaleString('en-IN')} credits
                            </div>
                            <p className="text-muted fs-12 mb-2">
                              {n.message || 'Prepaid institutional communication credits'}
                            </p>
                            <div className="d-flex align-items-baseline gap-2 mb-3">
                              <span className="fs-16 fw-bold text-info">₹{cost.toFixed(2)}</span>
                              <span className="text-muted fs-12">/ credit</span>
                            </div>

                            {isSelected && (
                              <div className="pt-2 border-top d-flex align-items-center justify-content-between gap-2">
                                <span className="fs-13 fw-semibold text-dark">
                                  Subtotal: ₹{sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <div className="d-flex align-items-center gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary p-1 rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: '28px', height: '28px' }}
                                    onClick={() => handleDecreaseNotificationQty(n)}
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <input
                                    type="number"
                                    min={minQty}
                                    step={minQty}
                                    className="form-control form-control-sm text-center fw-bold px-1"
                                    style={{ width: '76px', height: '30px' }}
                                    value={qty}
                                    onChange={(e) => handleSetNotificationQty(n, e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary p-1 rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: '28px', height: '28px' }}
                                    onClick={() => handleIncreaseNotificationQty(n)}
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* END LEFT COLUMN */}

      {/* ============================================================ */}
      {/* RIGHT COLUMN: STICKY LIVE PRICING & INVESTMENT BREAKDOWN     */}
      {/* ============================================================ */}
      <div className="col-12 col-md-5 col-lg-4" style={{ alignSelf: 'stretch' }}>
        <div className="card border-0 shadow-sm rounded-4 p-4 border-start border-4 border-primary sticky-pricing-sidebar">
          <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
            <Receipt size={20} className="text-primary flex-shrink-0" />
            <h5 className="fw-bold text-dark mb-0 fs-16">Order Summary</h5>
          </div>

          {/* Itemized Rows */}
          <div className="d-flex flex-column gap-2 mb-3">
            {/* Base Plan Row */}
            <div className="d-flex justify-content-between align-items-start py-2 border-bottom">
              <div className="pe-2">
                <div className="fw-semibold text-dark fs-14">
                  {selectedPlan.plan_name}
                  <span className="text-muted fs-12 ms-2">({cycleMeta.label})</span>
                </div>
                <div className="text-muted fs-12">
                  {Number(selectedPlan.max_students) > 0
                    ? `Up to ${Number(selectedPlan.max_students).toLocaleString('en-IN')} students`
                    : 'Unlimited students'}
                  {` • ${includedStorageGb} GB storage`}
                </div>
              </div>
              <div className="text-end flex-shrink-0">
                {isPureTrialPlan ? (
                  <div>
                    <span className="fw-bold text-success fs-14">₹0.00</span>
                    <div className="badge bg-success-subtle text-success fs-10 px-2 py-1 d-block mt-1">
                      Free Trial
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="fw-bold text-dark fs-14">
                      ₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    {(isTrialMode || trialDays > 0) && (
                      <div className="badge bg-success-subtle text-success fs-10 px-2 py-1 d-block mt-1">
                        Free Trial
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Storage Add-on Row */}
            {selectedStorage && (
              <div className="d-flex justify-content-between align-items-start py-2 border-bottom">
                <div className="pe-2">
                  <div className="fw-semibold text-dark fs-14 d-flex align-items-center gap-2">
                    <HardDrive size={15} className="text-primary flex-shrink-0" />
                    <span>Cloud Storage: {selectedStorage.plan_name}</span>
                  </div>
                  <div className="text-muted fs-12">
                    +{selectedStorage.storage_capacity}{' '}
                    {selectedStorage.unit_code || (Number(selectedStorage.capacity_unit_id) === 3 ? 'TB' : 'GB')} (
                    {storageCycleMeta.label || effectiveStorageCycle})
                  </div>
                </div>
                <div className="text-end flex-shrink-0">
                  <span className="fw-bold text-primary fs-14">
                    +₹{storagePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Biometric Machines Rows */}
            {Object.entries(selectedMachines).map(([id, qty]) => {
              const m = attendanceMachines.find((item) => Number(item.id) === Number(id));
              if (!m || qty <= 0) return null;
              const sub = Math.round(parseFloat(m.unit_price || 0) * qty * 100) / 100;

              return (
                <div key={`m-${id}`} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <div className="pe-2">
                    <div className="fw-semibold text-dark fs-14 d-flex align-items-center gap-2">
                      <Cpu size={15} className="text-success flex-shrink-0" />
                      <span>
                        {m.machine_name} (×{qty})
                      </span>
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <span className="fw-bold text-success fs-14">
                      +₹{sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* RFID Cards Consolidated Row */}
            {selectedCardsList.length > 0 && (
              <div className="d-flex justify-content-between align-items-start py-2 border-bottom">
                <div className="pe-2">
                  <div className="fw-semibold text-dark fs-14 d-flex align-items-center gap-2">
                    <IdCard size={15} className="text-warning-emphasis flex-shrink-0" />
                    <span>
                      {selectedCardsList.length === 1
                        ? `Smart RFID Cards: ${selectedCardsList[0].card_name} (×${selectedCardsList[0].quantity})`
                        : `Smart RFID Cards (Total: ${totalCardsQty} cards)`}
                    </span>
                  </div>
                  <div className="text-muted fs-12 mt-1">
                    {selectedCardsList.length === 1
                      ? `₹${selectedCardsList[0].unitPrice.toLocaleString('en-IN')} / card`
                      : selectedCardsList.map((c, idx) => (
                        <span key={c.id}>
                          {idx > 0 && <span className="mx-2 text-secondary">•</span>}
                          {c.card_name}: {c.quantity} pcs @ ₹{c.unitPrice.toLocaleString('en-IN')}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="text-end flex-shrink-0">
                  <span className="fw-bold text-warning-emphasis fs-14">
                    +₹{cardsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Notification Bundles Rows */}
            {Object.entries(selectedNotifications).map(([id, cfg]) => {
              if (!cfg?.selected || !cfg?.quantity) return null;
              const n = notificationRecords.find((item) => Number(item.id) === Number(id));
              if (!n) return null;
              const rate = parseFloat(n.cost || n.unit_price || 0);
              const sub = Math.round(rate * cfg.quantity * 100) / 100;

              return (
                <div key={`n-${id}`} className="d-flex justify-content-between align-items-start py-2 border-bottom">
                  <div className="pe-2">
                    <div className="fw-semibold text-dark fs-14 d-flex align-items-center gap-2">
                      <BellRing size={15} className="text-info flex-shrink-0" />
                      <span className="text-capitalize">
                        {n.pack_name || n.name || `${n.type || n.channel} Credits`} (
                        {Number(cfg.quantity).toLocaleString('en-IN')})
                      </span>
                    </div>
                    <div className="text-muted fs-12">₹{rate.toFixed(2)} / credit</div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <span className="fw-bold text-info fs-14">
                      +₹{sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}

            {addonsTotal === 0 && (
              <div className="text-muted fs-12 py-1 fst-italic">
                No optional add-ons selected. Base software license &amp; quotas included.
              </div>
            )}
          </div>

          {/* Coupon Code Input in Order Summary */}
          {(effectiveBasePrice > 0 || addonsTotal > 0) && (
            <div className="mb-3 pt-2 border-top">
              <label className="form-label fs-12 fw-bold text-dark d-flex align-items-center gap-1 mb-1">
                <Tag size={13} className="text-primary" />
                <span>Have a Coupon Code?</span>
              </label>
              <div className="input-group input-group-sm">
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
                    className="btn btn-outline-danger"
                    onClick={handleRemoveCoupon}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode || !couponCode.trim()}
                  >
                    {validatingCoupon ? (
                      <>
                        <Loader2 size={13} className="animate-spin me-1 inline" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      'Apply'
                    )}
                  </button>
                )}
              </div>
              {couponError && <div className="text-danger fs-11 mt-1">{couponError}</div>}
              {appliedCoupon && (
                <div className="text-success fs-11 fw-semibold mt-1">
                  ✓ Coupon <strong>{appliedCoupon.code}</strong> applied — You save ₹
                  {discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}!
                </div>
              )}
            </div>
          )}

          {/* Flat Net Payable Summary (Zero GST) */}
          <div className="p-3 bg-light rounded-3 mb-3">
            <div className="d-flex justify-content-between align-items-center fs-13 mb-2">
              <span className="text-muted">Software License:</span>
              <span className="fw-semibold text-dark">
                ₹{effectiveBasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-center fs-13 mb-2">
              <span className="text-muted">Selected Add-ons:</span>
              <span className="fw-semibold text-dark">
                ₹{addonsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="d-flex justify-content-between align-items-center fs-13 mb-2 text-success fw-semibold">
                <span>Coupon Discount ({appliedCoupon?.code}):</span>
                <span>
                  -₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="d-flex justify-content-between align-items-center pt-2 border-top">
              <div>
                <span className="fs-15 fw-bold text-dark">Net Payable Total:</span>
                <div className="fs-11 text-muted">
                  {appliedCoupon
                    ? 'Coupon discount applied • Proceed with discounted payment'
                    : isTrialMode || isPureTrialPlan
                      ? trialDays > 0
                        ? `Includes ${trialDays}-day free trial option`
                        : 'Free evaluation access'
                      : 'Flat net pricing • No extra charges'}
                </div>
              </div>
              <div className="fs-20 fw-bold text-primary">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Free trial notification note */}
          {(isTrialMode || isPureTrialPlan) && !appliedCoupon && grandTotal === 0 && (
            <div className="p-3 rounded-3 bg-success-subtle text-success border border-success-subtle fs-12 mb-3 d-flex align-items-center gap-2">
              <ShieldCheck size={16} className="flex-shrink-0" />
              <span>
                <strong>100% Free Trial:</strong> ₹0 payable today. Instant portal setup
                {trialDays > 0 ? ` for ${trialDays} days.` : '.'}
              </span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              className="btn btn-success w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 fs-15 shadow-sm"
              onClick={onNext}
            >
              <span>
                Continue: {trialDays > 0 ? `for ${trialDays} days ` : ''}Free Trial
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

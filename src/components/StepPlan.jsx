'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  Users,
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
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
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
  onNext,
}) {
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

  // Catalog items
  const storagePlans = catalog.storage_plans || [];
  const attendanceMachines = catalog.attendance_machines || [];
  const rfidCards = catalog.rfid_cards || [];
  const notificationRecords = catalog.notification_records || [];

  // Handlers for Storage
  const handleSelectStorage = (storageId) => {
    if (setSelectedStorageId) {
      setSelectedStorageId((prev) => (prev === storageId ? null : storageId));
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

  // Handlers for RFID Cards
  const handleAddCard = (card) => {
    if (!card || !setSelectedCards) return;
    const minQty = parseInt(card.min_order_qty || 1, 10);
    setSelectedCards((prev) => ({
      ...prev,
      [card.id]: Math.max(minQty, (prev[card.id] || 0) + 1),
    }));
  };

  const handleIncreaseCardQty = (card) => {
    if (!card || !setSelectedCards) return;
    setSelectedCards((prev) => ({
      ...prev,
      [card.id]: (prev[card.id] || 0) + 1,
    }));
  };

  const handleDecreaseCardQty = (card) => {
    if (!card || !setSelectedCards) return;
    const minQty = parseInt(card.min_order_qty || 1, 10);
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

  const handleRemoveCard = (cardId) => {
    if (!setSelectedCards) return;
    setSelectedCards((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  // Handlers for Notifications
  const handleToggleNotification = (recordId, defaultQty = 1000) => {
    if (!setSelectedNotifications) return;
    setSelectedNotifications((prev) => {
      const existing = prev[recordId];
      if (existing && existing.selected) {
        return {
          ...prev,
          [recordId]: { ...existing, selected: false, quantity: 0 },
        };
      }
      return {
        ...prev,
        [recordId]: {
          selected: true,
          quantity: existing?.quantity && existing.quantity > 0 ? existing.quantity : defaultQty,
        },
      };
    });
  };

  const handleIncreaseNotificationQty = (recordId, step = 500) => {
    if (!setSelectedNotifications) return;
    setSelectedNotifications((prev) => {
      const existing = prev[recordId] || { selected: true, quantity: 0 };
      const current = parseInt(existing.quantity, 10) || 0;
      return {
        ...prev,
        [recordId]: { selected: true, quantity: current + step },
      };
    });
  };

  const handleDecreaseNotificationQty = (recordId, step = 500) => {
    if (!setSelectedNotifications) return;
    setSelectedNotifications((prev) => {
      const existing = prev[recordId];
      if (!existing) return prev;
      const current = parseInt(existing.quantity, 10) || 0;
      const nextQty = Math.max(0, current - step);
      return {
        ...prev,
        [recordId]: { ...existing, selected: nextQty > 0, quantity: nextQty },
      };
    });
  };

  // Subtotal calculations
  const selectedStorage = useMemo(() => {
    return storagePlans.find((s) => s.id === Number(selectedStorageId)) || null;
  }, [storagePlans, selectedStorageId]);

  const storagePrice = useMemo(() => {
    if (!selectedStorage) return 0;
    return cycle === 'monthly'
      ? parseFloat(selectedStorage.monthly_price || 0)
      : parseFloat(selectedStorage.annual_price || 0);
  }, [selectedStorage, cycle]);

  const machinesTotal = useMemo(() => {
    return Object.entries(selectedMachines).reduce((sum, [id, qty]) => {
      const m = attendanceMachines.find((item) => Number(item.id) === Number(id));
      if (!m || qty <= 0) return sum;
      return sum + parseFloat(m.unit_price || 0) * qty;
    }, 0);
  }, [selectedMachines, attendanceMachines]);

  const cardsTotal = useMemo(() => {
    return Object.entries(selectedCards).reduce((sum, [id, qty]) => {
      const c = rfidCards.find((item) => Number(item.id) === Number(id));
      if (!c || qty <= 0) return sum;
      return sum + parseFloat(c.unit_price || 0) * qty;
    }, 0);
  }, [selectedCards, rfidCards]);

  const notificationsTotal = useMemo(() => {
    return Object.entries(selectedNotifications).reduce((sum, [id, cfg]) => {
      if (!cfg?.selected || !cfg?.quantity) return sum;
      const n = notificationRecords.find((item) => Number(item.id) === Number(id));
      if (!n) return sum;
      return sum + Math.round(parseFloat(n.cost || 0) * cfg.quantity * 100) / 100;
    }, 0);
  }, [selectedNotifications, notificationRecords]);

  const addonsTotal = storagePrice + machinesTotal + cardsTotal + notificationsTotal;
  const effectiveBasePrice = isTrialMode ? 0 : basePrice;
  const grandTotal = effectiveBasePrice + addonsTotal;
  const taxableBase = grandTotal > 0 ? Math.round((grandTotal / 1.18) * 100) / 100 : 0;
  const totalGst = grandTotal > 0 ? Math.round((grandTotal - taxableBase) * 100) / 100 : 0;

  // Extract SMS & Push quotas if configured in plan
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

  // Dynamic features/modules from database items (excluding SMS and Push displayed in capacity cards)
  const planItems = (selectedPlan.items || []).filter(
    (it) => it !== smsItem && it !== pushItem
  );

  return (
    <div className="d-flex flex-column gap-4">
      {/* ============================================================ */}
      {/* CONTAINER 1: SELECTED PLAN DETAILS CONTAINER                 */}
      {/* ============================================================ */}
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
                  Included
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
                  Included
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Plan Features & Modules (Dynamically loaded from database items) */}
        {planItems.length > 0 && (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold text-dark fs-13 text-uppercase mb-0 d-flex align-items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <span>Included Features &amp; Modules:</span>
              </h6>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fs-12 fw-semibold">
                {planItems.length} {planItems.length === 1 ? 'Module' : 'Modules'} Included
              </span>
            </div>

            <div className="row g-3">
              {planItems.map((it) => (
                <div key={it.id || it.item_code} className="col-12 col-md-6">
                  <div
                    className={`p-3 rounded-3 bg-light border d-flex ${
                      it.description ? 'align-items-start' : 'align-items-center'
                    } gap-3 h-100`}
                  >
                    <div
                      className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '28px', height: '28px', minWidth: '28px' }}
                    >
                      <Check size={16} strokeWidth={2.5} className="text-success" />
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <span className="fw-semibold text-dark fs-14">{it.item_name}</span>
                      </div>
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
              Customize your package with cloud storage, biometric attendance terminals, smart RFID cards, and notification packs.
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
            className="d-flex align-items-center justify-content-between cursor-pointer"
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
                  Expand document, student photo, and examination media archiving capacity
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {selectedStorage && (
                <span className="badge bg-primary text-white rounded-pill px-2.5 py-1 fs-12 fw-semibold">
                  {selectedStorage.plan_name} (+₹{storagePrice.toLocaleString('en-IN')})
                </span>
              )}
              {collapsedSections.storage ? <ChevronDown size={20} className="text-muted" /> : <ChevronUp size={20} className="text-muted" />}
            </div>
          </div>

          {!collapsedSections.storage && (
            <div className="mt-4 pt-3 border-top">
              {storagePlans.length === 0 ? (
                <div className="text-center py-3 text-muted fs-14">
                  No additional storage tiers available at this time.
                </div>
              ) : (
                <>
                  <div className="row g-3">
                    {storagePlans.map((st) => {
                      const isSelected = Number(selectedStorageId) === Number(st.id);
                      const price =
                        cycle === 'monthly'
                          ? parseFloat(st.monthly_price || 0)
                          : parseFloat(st.annual_price || 0);

                      return (
                        <div key={st.id} className="col-12 col-sm-6 col-lg-3">
                          <div
                            className={`p-3 rounded-3 border h-100 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-primary-subtle border-primary shadow-sm'
                                : 'bg-white hover-shadow border-light-subtle'
                            }`}
                            style={{ cursor: 'pointer', transition: 'all 0.15s ease-in-out' }}
                            onClick={() => handleSelectStorage(st.id)}
                          >
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className="fw-bold fs-15 text-dark">{st.plan_name}</span>
                              <div
                                className={`rounded-circle d-flex align-items-center justify-content-center border ${
                                  isSelected ? 'bg-primary text-white border-primary' : 'bg-light border-secondary-subtle'
                                }`}
                                style={{ width: '20px', height: '20px' }}
                              >
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                            </div>
                            <div className="fs-13 text-muted mb-2">
                              Capacity: <strong>{st.storage_capacity} GB</strong>
                            </div>
                            <div className="fs-16 fw-bold text-primary">
                              ₹{price.toLocaleString('en-IN')}
                              <span className="fs-12 text-muted fw-normal"> /{cycle === 'monthly' ? 'mo' : 'yr'}</span>
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
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
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
            className="d-flex align-items-center justify-content-between cursor-pointer"
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
                  Fingerprint, Facial Recognition, and RFID integrated attendance hardware
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {machinesTotal > 0 && (
                <span className="badge bg-success text-white rounded-pill px-2.5 py-1 fs-12 fw-semibold">
                  +₹{machinesTotal.toLocaleString('en-IN')}
                </span>
              )}
              {collapsedSections.machines ? <ChevronDown size={20} className="text-muted" /> : <ChevronUp size={20} className="text-muted" />}
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
                          className={`p-3 rounded-3 border h-100 d-flex flex-column ${
                            isAdded ? 'bg-white border-success shadow-sm' : 'bg-white border-light-subtle'
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
                                className="btn btn-outline-success btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-1.5"
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
            className="d-flex align-items-center justify-content-between cursor-pointer"
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
                <span className="badge bg-warning text-dark rounded-pill px-2.5 py-1 fs-12 fw-semibold">
                  +₹{cardsTotal.toLocaleString('en-IN')}
                </span>
              )}
              {collapsedSections.cards ? <ChevronDown size={20} className="text-muted" /> : <ChevronUp size={20} className="text-muted" />}
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
                    const qty = selectedCards[c.id] || 0;
                    const isAdded = qty > 0;
                    const imgUrl = resolveImageUrl(c.card_image || c.rfid_image);

                    return (
                      <div key={c.id} className="col-12 col-md-6">
                        <div
                          className={`p-3 rounded-3 border h-100 d-flex flex-column ${
                            isAdded ? 'bg-white border-warning shadow-sm' : 'bg-white border-light-subtle'
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
                                {c.min_order_qty && <span>Min order: {c.min_order_qty} pcs</span>}
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
                                className="btn btn-outline-warning text-dark btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-1.5"
                                onClick={() => handleAddCard(c)}
                              >
                                <Plus size={14} />
                                <span>Order Cards ({c.min_order_qty || 1} pcs)</span>
                              </button>
                            ) : (
                              <div className="d-flex align-items-center justify-content-between w-100">
                                <span className="fs-13 fw-semibold text-dark">
                                  Subtotal: ₹{(parseFloat(c.unit_price || 0) * qty).toLocaleString('en-IN')}
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
                                  <span className="fw-bold fs-14 px-2">{qty}</span>
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
                                    className="btn btn-sm text-danger ms-2 p-1"
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

        {/* 4. NOTIFICATION CREDITS */}
        <div className="border rounded-3 p-3 p-md-4 bg-light-subtle">
          <div
            className="d-flex align-items-center justify-content-between cursor-pointer"
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
                <h5 className="fw-bold text-dark mb-0 fs-16">Notification &amp; SMS Broadcast Bundles</h5>
                <p className="text-muted fs-13 mb-0">
                  Transactional SMS credits, WhatsApp gateway, and emergency alerts
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {notificationsTotal > 0 && (
                <span className="badge bg-info text-dark rounded-pill px-2.5 py-1 fs-12 fw-semibold">
                  +₹{notificationsTotal.toLocaleString('en-IN')}
                </span>
              )}
              {collapsedSections.notifications ? <ChevronDown size={20} className="text-muted" /> : <ChevronUp size={20} className="text-muted" />}
            </div>
          </div>

          {!collapsedSections.notifications && (
            <div className="mt-4 pt-3 border-top">
              {notificationRecords.length === 0 ? (
                <div className="text-center py-4 bg-white rounded-3 border text-muted">
                  <BellRing size={28} className="text-secondary opacity-50 mb-2" />
                  <p className="mb-0 fs-13">No notification packs currently listed in catalog.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {notificationRecords.map((n) => {
                    const cfg = selectedNotifications[n.id] || { selected: false, quantity: 1000 };
                    const isSelected = Boolean(cfg.selected);
                    const qty = cfg.quantity || 1000;
                    const cost = parseFloat(n.cost || 0);
                    const sub = Math.round(cost * qty * 100) / 100;

                    return (
                      <div key={n.id} className="col-12 col-md-6">
                        <div
                          className={`p-3 rounded-3 border h-100 ${
                            isSelected ? 'bg-white border-info shadow-sm' : 'bg-white border-light-subtle'
                          }`}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="fw-bold fs-15 text-dark text-capitalize">{n.type} Package</span>
                            <div className="form-check form-switch mb-0">
                              <input
                                className="form-check-input cursor-pointer"
                                type="checkbox"
                                role="switch"
                                id={`notif-switch-${n.id}`}
                                checked={isSelected}
                                onChange={() => handleToggleNotification(n.id)}
                              />
                            </div>
                          </div>
                          <p className="text-muted fs-12 mb-2">{n.message || 'Institutional communication credits'}</p>
                          <div className="d-flex align-items-baseline gap-2 mb-3">
                            <span className="fs-16 fw-bold text-info">₹{cost.toFixed(2)}</span>
                            <span className="text-muted fs-12">/ message credit</span>
                          </div>

                          {isSelected && (
                            <div className="pt-2 border-top d-flex align-items-center justify-content-between">
                              <span className="fs-13 fw-semibold text-dark">Subtotal: ₹{sub.toLocaleString('en-IN')}</span>
                              <div className="d-flex align-items-center gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary p-1 rounded-circle d-flex align-items-center justify-content-center"
                                  style={{ width: '28px', height: '28px' }}
                                  onClick={() => handleDecreaseNotificationQty(n.id)}
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="fw-bold fs-13 px-2">{qty}</span>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary p-1 rounded-circle d-flex align-items-center justify-content-center"
                                  style={{ width: '28px', height: '28px' }}
                                  onClick={() => handleIncreaseNotificationQty(n.id)}
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

      {/* ============================================================ */}
      {/* CONTAINER 3: LIVE PRICING & DYNAMIC BREAKDOWN CONTAINER      */}
      {/* ============================================================ */}
      <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 border-start border-4 border-primary">
        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <Receipt size={22} className="text-primary" />
            <h5 className="fw-bold text-dark mb-0">Configured Investment Breakdown</h5>
          </div>
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fs-12 fw-bold">
            Live Pricing
          </span>
        </div>

        <p className="text-muted fs-13 mb-3">
          This breakdown updates dynamically in real-time as you customize plan options and add-ons below:
        </p>

        {/* Itemized Rows */}
        <div className="d-flex flex-column gap-2 mb-3">
          {/* Base Plan Row */}
          <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
              <div className="fw-semibold text-dark fs-14">
                {selectedPlan.plan_name} Software Package
                <span className="text-muted fs-12 ms-2 text-capitalize">({cycle})</span>
              </div>
              <div className="text-muted fs-12">
                Up to {selectedPlan.max_students ? Number(selectedPlan.max_students).toLocaleString() : 'Unlimited'} students
                {trialDays > 0 && ` • Includes ${trialDays}-day free trial`}
              </div>
            </div>
            <div className="text-end">
              {isTrialMode ? (
                <div>
                  <span className="fw-bold text-success fs-14">₹0.00</span>
                  <div className="badge bg-success-subtle text-success fs-10 px-2 py-0.5">Free Trial Active</div>
                </div>
              ) : (
                <span className="fw-bold text-dark fs-14">
                  ₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>

          {/* Storage Add-on Row */}
          {selectedStorage && (
            <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
              <div>
                <div className="fw-semibold text-dark fs-14 d-flex align-items-center gap-2">
                  <HardDrive size={15} className="text-primary" />
                  <span>Cloud Storage: {selectedStorage.plan_name} ({selectedStorage.storage_capacity} GB)</span>
                </div>
                <div className="text-muted fs-12">Institutional cloud backup &amp; archiving</div>
              </div>
              <div className="text-end">
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
            const sub = parseFloat(m.unit_price || 0) * qty;

            return (
              <div key={`m-${id}`} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <div className="fw-semibold text-dark fs-14 d-flex align-items-center gap-2">
                    <Cpu size={15} className="text-success" />
                    <span>{m.machine_name} (Qty: {qty})</span>
                  </div>
                  <div className="text-muted fs-12">₹{parseFloat(m.unit_price || 0).toLocaleString('en-IN')} / device</div>
                </div>
                <div className="text-end">
                  <span className="fw-bold text-success fs-14">
                    +₹{sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}

          {/* RFID Cards Rows */}
          {Object.entries(selectedCards).map(([id, qty]) => {
            const c = rfidCards.find((item) => Number(item.id) === Number(id));
            if (!c || qty <= 0) return null;
            const sub = parseFloat(c.unit_price || 0) * qty;

            return (
              <div key={`c-${id}`} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <div className="fw-semibold text-dark fs-14 d-flex align-items-center gap-2">
                    <IdCard size={15} className="text-warning-emphasis" />
                    <span>{c.card_name} (Qty: {qty} cards)</span>
                  </div>
                  <div className="text-muted fs-12">₹{parseFloat(c.unit_price || 0).toLocaleString('en-IN')} / card</div>
                </div>
                <div className="text-end">
                  <span className="fw-bold text-warning-emphasis fs-14">
                    +₹{sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Notification Bundles Rows */}
          {Object.entries(selectedNotifications).map(([id, cfg]) => {
            if (!cfg?.selected || !cfg?.quantity) return null;
            const n = notificationRecords.find((item) => Number(item.id) === Number(id));
            if (!n) return null;
            const sub = Math.round(parseFloat(n.cost || 0) * cfg.quantity * 100) / 100;

            return (
              <div key={`n-${id}`} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <div className="fw-semibold text-dark fs-14 d-flex align-items-center gap-2">
                    <BellRing size={15} className="text-info" />
                    <span className="text-capitalize">{n.type} Broadcast Credits ({cfg.quantity} credits)</span>
                  </div>
                  <div className="text-muted fs-12">₹{parseFloat(n.cost || 0).toFixed(2)} / credit</div>
                </div>
                <div className="text-end">
                  <span className="fw-bold text-info fs-14">
                    +₹{sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}

          {addonsTotal === 0 && (
            <div className="text-muted fs-12 py-1 fst-italic">
              No optional add-ons selected. Only standard base software license included.
            </div>
          )}
        </div>

        {/* Subtotal & Tax Calculation */}
        <div className="p-3 bg-light rounded-3 mb-3">
          <div className="d-flex justify-content-between align-items-center fs-14 mb-1">
            <span className="text-muted">Net Taxable Base:</span>
            <span className="fw-semibold text-dark">
              ₹{taxableBase.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="d-flex justify-content-between align-items-center fs-14 mb-2">
            <span className="text-muted">GST Included (18%):</span>
            <span className="fw-semibold text-dark">
              ₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="d-flex justify-content-between align-items-center pt-2 border-top">
            <div>
              <span className="fs-16 fw-bold text-dark">Total Configured Amount:</span>
              <div className="fs-11 text-muted">
                {isTrialMode
                  ? `(Software free for ${trialDays} days; hardware/add-ons payable)`
                  : '(All applicable taxes included)'}
              </div>
            </div>
            <div className="fs-22 fw-bold text-primary">
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Free trial notification note */}
        {isTrialMode && grandTotal === 0 && (
          <div className="p-2.5 rounded-3 bg-success-subtle text-success border border-success-subtle fs-12 mb-3 d-flex align-items-center gap-2">
            <ShieldCheck size={16} className="flex-shrink-0" />
            <span>
              <strong>100% Free Trial:</strong> ₹0 payable today. Instant activation for {trialDays} days.
            </span>
          </div>
        )}

        {/* Action Button */}
        <div className="d-flex justify-content-end pt-3 border-top mt-2">
          <button
            type="button"
            className="btn btn-primary px-4 py-2.5 fw-semibold d-flex align-items-center gap-2 fs-15 shadow-sm"
            onClick={onNext}
          >
            <span>Continue: School Profile</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

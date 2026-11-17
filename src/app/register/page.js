'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Stepper from '@/components/Stepper';
import StepPlan from '@/components/StepPlan';
import StepSchoolProfile from '@/components/StepSchoolProfile';
import StepCampusContact from '@/components/StepCampusContact';
import StepAcademicYear from '@/components/StepAcademicYear';
import StepAdmin from '@/components/StepAdmin';
import StepReview from '@/components/StepReview';
import saasApi from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';

const STEPS = [
  { title: 'Plan & Configure' },
  { title: 'School Profile' },
  { title: 'Campus & Contact' },
  { title: 'Academic Year' },
  { title: 'Super Admin' },
  { title: 'Review & Activate' },
];

const DRAFT_STORAGE_KEY = 'growvidya_onboarding_draft';

function parsePairsParam(raw) {
  const result = {};
  if (!raw || typeof raw !== 'string') return result;
  raw.split(',').forEach((entry) => {
    const [idStr, qtyStr] = entry.split(':');
    const id = parseInt(idStr, 10);
    const qty = parseInt(qtyStr, 10);
    if (!Number.isNaN(id) && id > 0 && !Number.isNaN(qty) && qty > 0) {
      result[id] = qty;
    }
  });
  return result;
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdParam = searchParams.get('plan_id') || searchParams.get('planId') || searchParams.get('plan');
  const cycleParam = searchParams.get('cycle') || searchParams.get('billing_cycle') || '';
  const trialRawParam = searchParams.get('trial');
  const trialParam = trialRawParam === null ? true : trialRawParam === '1' || trialRawParam === 'true';
  const resumeParam = searchParams.get('resume') || '';
  const storageIdParam = searchParams.get('storage_id') || '';
  const machinesParam = searchParams.get('machines') || '';
  const cardsParam = searchParams.get('cards') || '';
  const notificationsParam = searchParams.get('notifications') || '';
  const couponParam = searchParams.get('coupon') || '';
  const shippingParam = searchParams.get('shipping_address') || '';

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState(cycleParam);
  const [isTrialMode, setIsTrialMode] = useState(trialParam);

  // Configuration Catalog & Add-on state
  const [catalog, setCatalog] = useState({
    storage_plans: [],
    attendance_machines: [],
    rfid_cards: [],
    notification_records: [],
  });
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [selectedStorageId, setSelectedStorageId] = useState(null);
  const [selectedMachines, setSelectedMachines] = useState({});
  const [selectedCards, setSelectedCards] = useState({});
  const [selectedNotifications, setSelectedNotifications] = useState({});
  const [shippingAddress, setShippingAddress] = useState('');

  // Coupon state shared between Step 0 (Plan) and Review
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Section 2: School Profile Data
  const [schoolProfileData, setSchoolProfileData] = useState({
    school_name: '',
    school_code: '',
    school_type: '',
    affiliation_board: '',
    medium_of_instruction: '',
    established_year: '',
    registration_type: 'single',
    school_logo: null,
  });

  // Section 3: Campus & Contact Data
  const [campusContactData, setCampusContactData] = useState({
    phone_number: '',
    email: '',
    website: '',
    address: '',
    country: '',
    country_name: '',
    state: '',
    state_name: '',
    city: '',
    city_name: '',
    postal_code: '',
    footer: '',
  });

  // Section 4: Academic Year Data
  const [academicYearData, setAcademicYearData] = useState({
    academic_year: '',
    start_date: '',
    end_date: '',
  });

  // Section 5: Super Admin Account Data
  const [adminData, setAdminData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    gender_name: '',
    picture: null,
    password: '',
    confirm_password: '',
  });

  useEffect(() => {
    initializeWizard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planIdParam, cycleParam, trialRawParam]);

  const resetFormStatesToDefault = () => {
    setCurrentStep(0);
    setSelectedStorageId(null);
    setSelectedMachines({});
    setSelectedCards({});
    setSelectedNotifications({});
    setShippingAddress('');
    setCouponCode('');
    setAppliedCoupon(null);
    setSchoolProfileData({
      school_name: '',
      school_code: '',
      school_type: '',
      affiliation_board: '',
      medium_of_instruction: '',
      established_year: '',
      registration_type: 'single',
      school_logo: null,
    });
    setCampusContactData({
      phone_number: '',
      email: '',
      website: '',
      address: '',
      country: '',
      country_name: '',
      state: '',
      state_name: '',
      city: '',
      city_name: '',
      postal_code: '',
      footer: '',
    });
    setAcademicYearData({
      academic_year: '',
      start_date: '',
      end_date: '',
    });
    setAdminData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      gender: '',
      gender_name: '',
      picture: null,
      password: '',
      confirm_password: '',
    });
  };

  const initializeWizard = async () => {
    let savedDraft = null;
    const isExplicitResume = resumeParam === 'review' || resumeParam === 'plan';

    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          savedDraft = JSON.parse(raw);
        }

        if (isExplicitResume) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('resume');
          window.history.replaceState({}, '', cleanUrl.toString());
        }
      } catch (e) {
        console.warn('Could not manage onboarding draft in sessionStorage:', e);
      }
    }

    // If accessed directly without a selected plan_id and without a saved draft, redirect to Pricing Page
    if (!planIdParam && !savedDraft?.selectedPlanId) {
      router.replace('/');
      return;
    }

    const isSamePlanDraft =
      savedDraft &&
      (!planIdParam || String(savedDraft.selectedPlanId) === String(planIdParam));
    const hasUrlConfigOverrides = Boolean(
      storageIdParam || machinesParam || cardsParam || notificationsParam || couponParam || shippingParam
    );

    // Always preserve school/campus/academic/admin details entered across steps (even if user clicked "Change Plan")
    if (savedDraft) {
      if (savedDraft.schoolProfileData) setSchoolProfileData((prev) => ({ ...prev, ...savedDraft.schoolProfileData }));
      if (savedDraft.campusContactData) setCampusContactData((prev) => ({ ...prev, ...savedDraft.campusContactData }));
      if (savedDraft.academicYearData) setAcademicYearData((prev) => ({ ...prev, ...savedDraft.academicYearData }));
      if (savedDraft.adminData) setAdminData((prev) => ({ ...prev, ...savedDraft.adminData }));

      if ((isExplicitResume || isSamePlanDraft) && !hasUrlConfigOverrides) {
        if (savedDraft.selectedStorageId !== undefined) setSelectedStorageId(savedDraft.selectedStorageId);
        if (savedDraft.selectedMachines) setSelectedMachines(savedDraft.selectedMachines);
        if (savedDraft.selectedCards) setSelectedCards(savedDraft.selectedCards);
        if (savedDraft.selectedNotifications) setSelectedNotifications(savedDraft.selectedNotifications);
        if (savedDraft.shippingAddress) setShippingAddress(savedDraft.shippingAddress);
        if (savedDraft.couponCode) setCouponCode(savedDraft.couponCode);
        if (savedDraft.appliedCoupon) setAppliedCoupon(savedDraft.appliedCoupon);
      }

      if (resumeParam === 'review') {
        setCurrentStep(5);
      } else if (resumeParam === 'plan') {
        setCurrentStep(0);
      } else if (isSamePlanDraft && typeof savedDraft.currentStep === 'number' && !hasUrlConfigOverrides) {
        setCurrentStep(Math.min(5, Math.max(0, savedDraft.currentStep)));
      } else {
        setCurrentStep(0);
      }
    } else {
      resetFormStatesToDefault();
    }

    // Hydrate add-on configuration passed via URL query params (e.g. from public /configure page)
    const parsedStorageId = storageIdParam ? parseInt(storageIdParam, 10) || null : null;
    const parsedMachines = parsePairsParam(machinesParam);
    const parsedCards = parsePairsParam(cardsParam);
    const rawNotifs = parsePairsParam(notificationsParam);
    const parsedNotifs = {};
    Object.entries(rawNotifs).forEach(([id, qty]) => {
      parsedNotifs[id] = { selected: true, quantity: qty };
    });

    if (hasUrlConfigOverrides) {
      setSelectedStorageId(parsedStorageId);
      setSelectedMachines(parsedMachines);
      setSelectedCards(parsedCards);
      setSelectedNotifications(parsedNotifs);
      if (shippingParam) setShippingAddress(shippingParam);
      if (couponParam) setCouponCode(couponParam);
    }

    try {
      setLoading(true);
      setCatalogLoading(true);
      setLoadError('');

      const [plansRes, catalogRes] = await Promise.all([
        saasApi.getPlans(),
        saasApi.getConfigCatalog(),
      ]);

      const allPlans = Array.isArray(plansRes?.data) ? plansRes.data : [];
      const fetchedCatalog = catalogRes?.data || {};
      setPlans(allPlans);

      if (catalogRes?.data) {
        setCatalog(fetchedCatalog);
      }

      const resolveInitialTrialFlag = (planObj, activeCouponObj) => {
        const planSupportsTrial =
          String(planObj.billing_cycle || '').toLowerCase() === 'trial' ||
          parseFloat(planObj.price) <= 0 ||
          parseInt(planObj.free_trial_days, 10) > 0;
        if (!planSupportsTrial) return false;
        const cScope = String(
          activeCouponObj?.applicable_scope || activeCouponObj?.applicableScope || ''
        ).toLowerCase();
        if (activeCouponObj && (!cScope || cScope === 'plan_only')) {
          return false;
        }
        if (trialRawParam !== null) {
          return Boolean(trialParam);
        }
        if (isSamePlanDraft && savedDraft?.isTrialMode !== undefined) {
          return Boolean(savedDraft.isTrialMode);
        }
        return true;
      };

      // 1. Explicit URL plan_id parameter
      if (planIdParam) {
        let found = allPlans.find((p) => String(p.id) === String(planIdParam));
        if (found && cycleParam && cycleParam.toLowerCase() !== 'trial') {
          const foundCycle = String(found.billing_cycle || '').toLowerCase();
          const targetCycle = cycleParam.toLowerCase();
          if (foundCycle !== targetCycle) {
            const cycleMatch = allPlans.find(
              (p) =>
                String(p.billing_cycle || '').toLowerCase() === targetCycle &&
                ((found.plan_group && p.plan_group === found.plan_group) ||
                  String(p.plan_name || '').toLowerCase() === String(found.plan_name || '').toLowerCase())
            );
            if (cycleMatch) {
              found = cycleMatch;
            }
          }
        }
        if (found) {
          let hydratedCoupon = (!hasUrlConfigOverrides && isSamePlanDraft) ? savedDraft?.appliedCoupon : null;
          if (couponParam) {
            try {
              const foundCycle = String(found.billing_cycle || '').toLowerCase();
              const isPureTr = foundCycle === 'trial' || parseFloat(found.price) <= 0;
              const planAmt = isPureTr ? 0 : parseFloat(found.price || 0);
              const storageObj = (fetchedCatalog.storage_plans || []).find(
                (s) => Number(s.id) === Number(parsedStorageId)
              );
              const sCycle = isPureTr
                ? (allPlans.find((p) => String(p.billing_cycle).toLowerCase() !== 'trial')?.billing_cycle || '')
                : foundCycle;
              const sAmt = storageObj ? Number(storageObj?.cycle_prices?.[sCycle] ?? 0) : 0;
              const mAmt = Object.entries(parsedMachines).reduce((sum, [id, q]) => {
                const m = (fetchedCatalog.attendance_machines || []).find((x) => Number(x.id) === Number(id));
                return m ? sum + parseFloat(m.unit_price || 0) * q : sum;
              }, 0);
              const cAmt = Object.entries(parsedCards).reduce((sum, [id, q]) => {
                const c = (fetchedCatalog.rfid_cards || []).find((x) => Number(x.id) === Number(id));
                return c ? sum + parseFloat(c.unit_price || 0) * q : sum;
              }, 0);
              const nAmt = Object.entries(parsedNotifs).reduce((sum, [id, cfg]) => {
                const n = (fetchedCatalog.notification_records || []).find((x) => Number(x.id) === Number(id));
                return n && cfg?.selected ? sum + parseFloat(n.cost || n.unit_price || 0) * cfg.quantity : sum;
              }, 0);
              const couponRes = await saasApi.validateCoupon({
                code: couponParam.trim(),
                amount: Math.round((planAmt + sAmt + mAmt + cAmt + nAmt) * 100) / 100,
                plan_amount: planAmt,
                storage_amount: sAmt,
                check_only: true,
              });
              if (couponRes?.data) {
                hydratedCoupon = couponRes.data;
                setAppliedCoupon(couponRes.data);
              }
            } catch (_) {}
          }

          setSelectedPlan(found);
          setBillingCycle(found.billing_cycle || cycleParam);
          setIsTrialMode(resolveInitialTrialFlag(found, hydratedCoupon));
          return;
        }

        // Requested plan_id was not found among active plans — return user to Pricing Page
        router.replace('/');
        return;
      }

      // 2. Restore plan from saved draft
      if (savedDraft?.selectedPlanId) {
        const draftPlan = allPlans.find((p) => Number(p.id) === Number(savedDraft.selectedPlanId));
        if (draftPlan) {
          setSelectedPlan(draftPlan);
          setBillingCycle(savedDraft.billingCycle || draftPlan.billing_cycle || '');
          setIsTrialMode(resolveInitialTrialFlag(draftPlan, savedDraft.appliedCoupon));
          return;
        }
      }

      router.replace('/');
    } catch (err) {
      setLoadError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to initialize onboarding session.'
      );
    } finally {
      setLoading(false);
      setCatalogLoading(false);
    }
  };

  // Continuously persist onboarding progress in sessionStorage so refreshes, "Change Plan", or payment retries never wipe data
  useEffect(() => {
    if (loading || !selectedPlan?.id || typeof window === 'undefined') return;
    try {
      const draftSnapshot = {
        currentStep,
        selectedPlanId: selectedPlan.id,
        billingCycle: billingCycle || selectedPlan.billing_cycle || '',
        isTrialMode,
        selectedStorageId,
        selectedMachines,
        selectedCards,
        selectedNotifications,
        shippingAddress,
        couponCode,
        appliedCoupon,
        schoolProfileData,
        campusContactData,
        academicYearData,
        adminData,
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftSnapshot));
    } catch (_) {}
  }, [
    loading,
    currentStep,
    selectedPlan,
    billingCycle,
    isTrialMode,
    selectedStorageId,
    selectedMachines,
    selectedCards,
    selectedNotifications,
    shippingAddress,
    couponCode,
    appliedCoupon,
    schoolProfileData,
    campusContactData,
    academicYearData,
    adminData,
  ]);

  // Keep shipping address synced with campus address until explicitly customized
  useEffect(() => {
    if (!shippingAddress && campusContactData.address) {
      setShippingAddress(campusContactData.address);
    }
  }, [campusContactData.address, shippingAddress]);

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-50 py-5 my-5">
        <Loader2 size={40} className="animate-spin text-primary mb-3" />
        <h5 className="fw-bold text-dark">Initializing Onboarding Session...</h5>
        <p className="text-muted fs-14">Fetching institutional package details...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container py-5 my-4" style={{ maxWidth: '560px' }}>
        <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 text-center">
          <AlertCircle size={38} className="text-danger mx-auto mb-3" />
          <h5 className="fw-bold text-dark mb-2">Unable to Load Registration</h5>
          <p className="text-muted fs-14 mb-4">{loadError}</p>
          <div className="d-flex justify-content-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn btn-outline-secondary px-4 py-2 fw-semibold"
            >
              Back to Plans
            </button>
            <button
              type="button"
              onClick={initializeWizard}
              className="btn btn-primary px-4 py-2 fw-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedPlan) {
    return null;
  }

  return (
    <div className="container py-4 py-md-5" style={{ maxWidth: currentStep === 0 ? '1380px' : '1020px' }}>
      <Stepper currentStep={currentStep} steps={STEPS} />

      {/* Step 0: Plan & Configuration */}
      {currentStep === 0 && (
        <StepPlan
          plans={plans}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          billingCycle={billingCycle}
          setBillingCycle={setBillingCycle}
          isTrialMode={isTrialMode}
          setIsTrialMode={setIsTrialMode}
          catalog={catalog}
          catalogLoading={catalogLoading}
          selectedStorageId={selectedStorageId}
          setSelectedStorageId={setSelectedStorageId}
          selectedMachines={selectedMachines}
          setSelectedMachines={setSelectedMachines}
          selectedCards={selectedCards}
          setSelectedCards={setSelectedCards}
          selectedNotifications={selectedNotifications}
          setSelectedNotifications={setSelectedNotifications}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          appliedCoupon={appliedCoupon}
          setAppliedCoupon={setAppliedCoupon}
          adminData={adminData}
          campusContactData={campusContactData}
          onNext={() => setCurrentStep(1)}
        />
      )}

      {/* Step 1: School Profile */}
      {currentStep === 1 && (
        <StepSchoolProfile
          formData={schoolProfileData}
          setFormData={setSchoolProfileData}
          onNext={() => setCurrentStep(2)}
          onBack={() => setCurrentStep(0)}
        />
      )}

      {/* Step 2: Campus and Contact */}
      {currentStep === 2 && (
        <StepCampusContact
          formData={campusContactData}
          setFormData={setCampusContactData}
          schoolName={schoolProfileData.school_name}
          onNext={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {/* Step 3: Academic Year */}
      {currentStep === 3 && (
        <StepAcademicYear
          formData={academicYearData}
          setFormData={setAcademicYearData}
          onNext={() => setCurrentStep(4)}
          onBack={() => setCurrentStep(2)}
        />
      )}

      {/* Step 4: Super Admin */}
      {currentStep === 4 && (
        <StepAdmin
          formData={adminData}
          setFormData={setAdminData}
          onNext={() => setCurrentStep(5)}
          onBack={() => setCurrentStep(3)}
        />
      )}

      {/* Step 5: Review & Activate */}
      {currentStep === 5 && (
        <StepReview
          plans={plans}
          selectedPlan={selectedPlan}
          billingCycle={billingCycle}
          catalog={catalog}
          selectedStorageId={selectedStorageId}
          selectedMachines={selectedMachines}
          selectedCards={selectedCards}
          selectedNotifications={selectedNotifications}
          shippingAddress={shippingAddress}
          setShippingAddress={setShippingAddress}
          schoolProfileData={schoolProfileData}
          campusContactData={campusContactData}
          academicYearData={academicYearData}
          adminData={adminData}
          isTrialMode={isTrialMode}
          setIsTrialMode={setIsTrialMode}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          appliedCoupon={appliedCoupon}
          setAppliedCoupon={setAppliedCoupon}
          onBack={() => setCurrentStep(4)}
          onEditPlan={() => setCurrentStep(0)}
        />
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <>
      <Header />
      <main className="flex-grow-1">
        <Suspense
          fallback={
            <div className="text-center py-5">
              <Loader2 size={36} className="animate-spin text-primary mx-auto mb-2" />
              <div>Loading onboarding wizard...</div>
            </div>
          }
        >
          <RegisterContent />
        </Suspense>
      </main>
      <footer className="bg-white border-top py-3 text-center text-muted fs-13 mt-auto no-print">
        <div className="container">
          Copyright &copy; {new Date().getFullYear()} Growvidya School Management Platform. All rights reserved.
        </div>
      </footer>
    </>
  );
}

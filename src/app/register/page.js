'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Stepper from '@/components/Stepper';
import StepPlan from '@/components/StepPlan';
import StepSchoolProfile from '@/components/StepSchoolProfile';
import StepCampusContact from '@/components/StepCampusContact';
import StepAcademicYear from '@/components/StepAcademicYear';
import StepAdmin from '@/components/StepAdmin';
import StepReview from '@/components/StepReview';
import saasApi from '@/lib/api';
import { Loader2 } from 'lucide-react';

const STEPS = [
  { title: 'Plan & Configure' },
  { title: 'School Profile' },
  { title: 'Campus & Contact' },
  { title: 'Academic Year' },
  { title: 'Super Admin' },
  { title: 'Review & Activate' },
];

const DRAFT_STORAGE_KEY = 'growvidya_onboarding_draft';

function RegisterContent() {
  const searchParams = useSearchParams();
  const planIdParam = searchParams.get('plan_id') || searchParams.get('planId') || searchParams.get('plan');
  const cycleParam = searchParams.get('cycle') || searchParams.get('billing_cycle') || '';
  const trialRawParam = searchParams.get('trial');
  // All packages are available with a Free Trial by default for first-time users unless trial=0/false is explicitly passed
  const trialParam = trialRawParam === null ? true : trialRawParam === '1' || trialRawParam === 'true';
  const resumeParam = searchParams.get('resume') || '';

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
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
    if (typeof window !== 'undefined') {
      try {
        const navEntry = window.performance?.getEntriesByType?.('navigation')?.[0];
        const isReload =
          navEntry?.type === 'reload' || window.performance?.navigation?.type === 1;
        const isValidResume =
          (resumeParam === 'review' || resumeParam === 'plan') && !isReload;

        if (isValidResume) {
          const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
          if (raw) savedDraft = JSON.parse(raw);
          sessionStorage.removeItem(DRAFT_STORAGE_KEY);

          // Strip ?resume=... from URL so a subsequent refresh resets cleanly
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('resume');
          window.history.replaceState({}, '', cleanUrl.toString());
        } else {
          sessionStorage.removeItem(DRAFT_STORAGE_KEY);
          resetFormStatesToDefault();
        }
      } catch (e) {
        console.warn('Could not manage onboarding draft in sessionStorage:', e);
      }
    }

    if (savedDraft) {
      if (savedDraft.schoolProfileData) setSchoolProfileData((prev) => ({ ...prev, ...savedDraft.schoolProfileData }));
      if (savedDraft.campusContactData) setCampusContactData((prev) => ({ ...prev, ...savedDraft.campusContactData }));
      if (savedDraft.academicYearData) setAcademicYearData((prev) => ({ ...prev, ...savedDraft.academicYearData }));
      if (savedDraft.adminData) setAdminData((prev) => ({ ...prev, ...savedDraft.adminData }));
      if (savedDraft.selectedStorageId !== undefined) setSelectedStorageId(savedDraft.selectedStorageId);
      if (savedDraft.selectedMachines) setSelectedMachines(savedDraft.selectedMachines);
      if (savedDraft.selectedCards) setSelectedCards(savedDraft.selectedCards);
      if (savedDraft.selectedNotifications) setSelectedNotifications(savedDraft.selectedNotifications);
      if (savedDraft.shippingAddress) setShippingAddress(savedDraft.shippingAddress);
      if (savedDraft.couponCode) setCouponCode(savedDraft.couponCode);
      if (savedDraft.appliedCoupon) setAppliedCoupon(savedDraft.appliedCoupon);
      if (savedDraft.isTrialMode !== undefined && !planIdParam) setIsTrialMode(Boolean(savedDraft.isTrialMode));

      if (resumeParam === 'review') {
        setCurrentStep(5);
      } else {
        setCurrentStep(0);
      }
    }

    try {
      setLoading(true);
      setCatalogLoading(true);
      const [plansRes, catalogRes] = await Promise.all([
        saasApi.getPlans(),
        saasApi.getConfigCatalog().catch((err) => {
          console.error('Failed to load config catalog:', err);
          return { data: { storage_plans: [], attendance_machines: [], rfid_cards: [], notification_records: [] } };
        }),
      ]);

      const allPlans = plansRes?.data || [];
      setPlans(allPlans);

      if (catalogRes?.data) {
        setCatalog(catalogRes.data);
      }

      // 1. Explicit URL plan_id parameter takes priority
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
          setSelectedPlan(found);
          setBillingCycle(found.billing_cycle || cycleParam);
          setIsTrialMode(
            savedDraft?.appliedCoupon
              ? false
              : trialRawParam !== null
              ? Boolean(trialParam)
              : true
          );
          return;
        }
      }

      // 2. Restore plan from saved draft if present
      if (savedDraft?.selectedPlanId) {
        const draftPlan = allPlans.find((p) => Number(p.id) === Number(savedDraft.selectedPlanId));
        if (draftPlan) {
          setSelectedPlan(draftPlan);
          setBillingCycle(savedDraft.billingCycle || draftPlan.billing_cycle || '');
          if (savedDraft.appliedCoupon) {
            setIsTrialMode(false);
          } else if (savedDraft.isTrialMode !== undefined) {
            setIsTrialMode(Boolean(savedDraft.isTrialMode));
          } else {
            setIsTrialMode(true);
          }
          return;
        }
      }

      // 3. Default to popular paid plan, or trial plan, or first active plan from DB
      const matchingCyclePlans = cycleParam
        ? allPlans.filter((p) => String(p.billing_cycle || '').toLowerCase() === cycleParam.toLowerCase())
        : [];
      const defaultTrial = allPlans.find((p) => p.billing_cycle === 'trial' || parseFloat(p.price) === 0);
      const popularPaid = allPlans.find(
        (p) => p.billing_cycle !== 'trial' && parseFloat(p.price) > 0 && Number(p.is_popular) === 1
      );

      let chosen = null;
      if (matchingCyclePlans.length > 0) {
        chosen = matchingCyclePlans.find((p) => Number(p.is_popular) === 1) || matchingCyclePlans[0];
      } else {
        chosen = popularPaid || defaultTrial || allPlans[0] || null;
      }

      setSelectedPlan(chosen);
      if (chosen) {
        setBillingCycle(chosen.billing_cycle || '');
        setIsTrialMode(savedDraft?.appliedCoupon ? false : Boolean(trialParam));
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
      setCatalogLoading(false);
    }
  };

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
        <p className="text-muted fs-14">Fetching institutional packages from database...</p>
      </div>
    );
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
          selectedPlan={selectedPlan}
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

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

function RegisterContent() {
  const searchParams = useSearchParams();
  const planIdParam = searchParams.get('plan_id') || searchParams.get('planId') || searchParams.get('plan');
  const cycleParam = searchParams.get('cycle') || searchParams.get('billing_cycle') || '';

  const trialParam = searchParams.get('trial') === '1' || searchParams.get('trial') === 'true';

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

  // Section 4: Academic Year Data (No fallback or prefilled dummy dates)
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
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
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

      // Pre-select plan matching query params
      if (planIdParam) {
        const found = allPlans.find((p) => String(p.id) === String(planIdParam));
        if (found) {
          setSelectedPlan(found);
          setBillingCycle(found.billing_cycle || cycleParam);
          if (trialParam || found.billing_cycle === 'trial' || parseFloat(found.price) === 0) {
            setIsTrialMode(true);
          } else {
            setIsTrialMode(false);
          }
          return;
        }
      }

      // Default to trial plan if available, or first plan
      const defaultTrial = allPlans.find((p) => p.billing_cycle === 'trial' || parseFloat(p.price) === 0);
      const chosen = defaultTrial || allPlans[0] || null;
      setSelectedPlan(chosen);
      if (chosen) {
        if (trialParam || chosen.billing_cycle === 'trial' || parseFloat(chosen.price) === 0) {
          setIsTrialMode(true);
        } else {
          setIsTrialMode(false);
        }
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
      setCatalogLoading(false);
    }
  };

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
      <footer className="bg-white border-top py-3 text-center text-muted fs-13 mt-auto">
        <div className="container">
          Copyright &copy; {new Date().getFullYear()} Growvidya School Management Platform. All rights reserved.
        </div>
      </footer>
    </>
  );
}

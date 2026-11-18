'use client';

import React, { useEffect, useRef } from 'react';
import { Check, ShieldCheck, School, Building2, Calendar, UserCheck, CreditCard } from 'lucide-react';

export default function Stepper({ currentStep, steps = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeItem = container.querySelector('.step-item.active');
    if (activeItem && container.scrollWidth > container.clientWidth) {
      const targetLeft =
        activeItem.offsetLeft - container.clientWidth / 2 + activeItem.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }, [currentStep]);

  const getStepIcon = (index) => {
    switch (index) {
      case 0:
        return <ShieldCheck size={18} />;
      case 1:
        return <School size={18} />;
      case 2:
        return <Building2 size={18} />;
      case 3:
        return <Calendar size={18} />;
      case 4:
        return <UserCheck size={18} />;
      case 5:
        return <CreditCard size={18} />;
      default:
        return index + 1;
    }
  };

  return (
    <div ref={containerRef} className="stepper-container mb-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div
            key={index}
            className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
          >
            <div className="step-circle">
              {isCompleted ? <Check size={18} strokeWidth={2.5} /> : getStepIcon(index)}
            </div>
            <div className="step-title">{step.title}</div>
          </div>
        );
      })}
    </div>
  );
}

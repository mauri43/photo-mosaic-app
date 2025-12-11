import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum;
        const isCurrent = currentStep === stepNum;

        return (
          <div key={index} className="flex items-center flex-1">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-medium
                  transition-all duration-200
                  ${isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-blue-500 text-white ring-4 ring-blue-500/30'
                      : 'bg-gray-700 text-gray-400'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`
                  text-xs mt-2 text-center max-w-[80px]
                  ${isCurrent ? 'text-blue-400' : 'text-gray-500'}
                `}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  flex-1 h-1 mx-2 rounded
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

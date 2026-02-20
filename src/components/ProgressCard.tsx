import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  name: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
}

interface ProgressCardProps {
  steps: Step[];
  currentStep: number;
  title?: string;
  totalSteps?: number;
  message?: string;
}

export function ProgressCard({
  steps,
  currentStep,
  title = 'Processing',
  message,
}: ProgressCardProps) {
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {message && (
          <p className="text-xs text-muted-foreground">{message}</p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right">
          {currentStep} of {steps.length}
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={cn(
              'flex items-start gap-2.5 p-2 rounded-lg transition-colors',
              step.status === 'complete' && 'bg-green-500/5',
              step.status === 'in-progress' && 'bg-primary/5',
              step.status === 'error' && 'bg-red-500/5'
            )}
          >
            {/* Status icon */}
            <div className="flex-shrink-0 pt-0.5">
              {step.status === 'complete' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : step.status === 'in-progress' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : step.status === 'error' ? (
                <div className="w-3.5 h-3.5 rounded-full bg-red-500" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-border" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-xs font-medium',
                step.status === 'complete' && 'text-green-600 dark:text-green-400',
                step.status === 'in-progress' && 'text-primary',
                step.status === 'error' && 'text-red-600 dark:text-red-400',
                step.status === 'pending' && 'text-muted-foreground'
              )}>
                {step.name}
              </p>
              {step.description && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

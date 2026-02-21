// SidePanelLayout Component
// Provides stable, fixed layout with header, nav, content, and footer
// Prevents content jumps and ensures consistent alignment

import React, { ReactNode } from 'react';
import '../styles/sidepanel-layout.css';

export interface SidePanelLayoutProps {
  header?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function SidePanelLayout({
  header,
  tabs,
  children,
  footer,
  className = '',
}: SidePanelLayoutProps) {
  return (
    <div className={`sidepanel-container ${className}`}>
      {/* Header */}
      {header && <div className="sidepanel-header">{header}</div>}

      {/* Navigation Tabs */}
      {tabs && <div className="sidepanel-nav">{tabs}</div>}

      {/* Main Content - Scrollable */}
      <div className="sidepanel-content">
        <div className="sidepanel-panel">{children}</div>
      </div>

      {/* Footer */}
      {footer && <div className="sidepanel-footer">{footer}</div>}
    </div>
  );
}

// ─── Helper Components for SidePanelLayout ──────────────────────

export interface FormGroupProps {
  label?: string;
  labelIcon?: React.ReactNode;
  children: ReactNode;
  error?: string;
  required?: boolean;
}

export function FormGroup({
  label,
  labelIcon,
  children,
  error,
  required,
}: FormGroupProps) {
  return (
    <div className="sidepanel-form-group">
      {label && (
        <label className="sidepanel-form-label">
          {labelIcon && <span>{labelIcon}</span>}
          <span>
            {label}
            {required && <span className="text-red-500">*</span>}
          </span>
        </label>
      )}
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

export interface CardProps {
  title?: string;
  titleIcon?: React.ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Card({
  title,
  titleIcon,
  children,
  actions,
  footer,
  className = '',
}: CardProps) {
  return (
    <div className={`sidepanel-card ${className}`}>
      {(title || actions) && (
        <div className="sidepanel-card-header">
          {title && (
            <div className="sidepanel-card-title">
              {titleIcon && <span className="inline-block mr-1">{titleIcon}</span>}
              {title}
            </div>
          )}
          {actions && <div className="flex gap-1">{actions}</div>}
        </div>
      )}
      <div className="sidepanel-card-content">{children}</div>
      {footer && <div className="sidepanel-card-footer">{footer}</div>}
    </div>
  );
}

export interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  title?: string;
  children: ReactNode;
}

export function Alert({ type, icon, title, children }: AlertProps) {
  const alertClass = {
    info: 'sidepanel-alert-info',
    success: 'sidepanel-alert-success',
    warning: 'sidepanel-alert-warning',
    error: 'sidepanel-alert-error',
  }[type];

  return (
    <div className={`sidepanel-alert ${alertClass}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <div className="flex-1">
        {title && <div className="font-semibold text-xs mb-0.5">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export interface ProgressProps {
  value: number; // 0-100
  showLabel?: boolean;
  animated?: boolean;
}

export function Progress({
  value,
  showLabel = false,
  animated = true,
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div>
      {showLabel && (
        <div className="text-xs font-medium mb-1">{clampedValue}%</div>
      )}
      <div className="sidepanel-progress">
        <div
          className={`sidepanel-progress-bar ${animated ? 'transition-all duration-300' : ''}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="sidepanel-loading">
      <div className="sidepanel-spinner" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="sidepanel-empty-state">
      {icon && <div className="sidepanel-empty-state-icon">{icon}</div>}
      <div className="sidepanel-empty-state-title">{title}</div>
      {description && (
        <div className="sidepanel-empty-state-description">{description}</div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export interface ButtonGroupProps {
  children: ReactNode;
  vertical?: boolean;
}

export function ButtonGroup({ children, vertical = false }: ButtonGroupProps) {
  return (
    <div className={`sidepanel-button-group ${vertical ? 'flex-col' : 'flex-row'}`}>
      {children}
    </div>
  );
}

// Split layout for side-by-side panels
export interface SplitPanelProps {
  left: ReactNode;
  right: ReactNode;
  ratio?: 'equal' | '60-40' | '40-60';
}

export function SplitPanel({ left, right, ratio = 'equal' }: SplitPanelProps) {
  const ratioClasses = {
    equal: 'grid-cols-1 lg:grid-cols-2',
    '60-40': 'grid-cols-1 lg:grid-cols-[1.5fr_1fr]',
    '40-60': 'grid-cols-1 lg:grid-cols-[1fr_1.5fr]',
  };

  return (
    <div className={`sidepanel-split-container ${ratioClasses[ratio]}`}>
      <div className="sidepanel-split-panel">{left}</div>
      <div className="sidepanel-split-panel">{right}</div>
    </div>
  );
}

import React, { ReactNode, useState } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[v0] Error boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold mb-2">Something went wrong</h1>
              <p className="text-sm text-muted-foreground mb-4">
                {this.state.error?.message || 'An unexpected error occurred. Try refreshing the page.'}
              </p>
              {process.env.NODE_ENV === 'development' && (
                <pre className="mt-4 p-3 bg-background/50 border border-border rounded text-[10px] overflow-auto max-h-48 text-left">
                  {this.state.error?.stack}
                </pre>
              )}
            </div>
            <div className="flex gap-2 justify-center pt-4">
              <Button onClick={this.handleReset} size="sm">
                <RotateCw className="w-3.5 h-3.5 mr-1" />
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                size="sm"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

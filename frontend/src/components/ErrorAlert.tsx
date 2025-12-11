import { AlertCircle, X } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div className="fixed top-4 right-4 max-w-md bg-red-900/90 border border-red-700 rounded-lg p-4 shadow-lg z-50 animate-in slide-in-from-right">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-200">Error</h4>
          <p className="text-sm text-red-300 mt-1">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

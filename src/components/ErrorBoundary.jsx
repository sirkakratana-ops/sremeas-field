import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white rounded-2xl border border-rose-200 shadow-xs max-w-xl mx-auto my-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              មានបញ្ហាក្នុងការបង្ហាញទិន្នន័យ
            </h3>
            <p className="text-xs text-slate-500">
              សូមអភ័យទោស ប្រព័ន្ធបានជួបប្រទះបញ្ហាបច្ចេកទេសបណ្តោះអាសន្ន។
            </p>
          </div>
          {this.state.error && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-left overflow-auto max-h-32 text-[11px] font-mono text-slate-600">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <RotateCcw size={14} />
            <span>ព្យាយាមម្តងទៀត</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component, type ReactNode } from 'react';

interface Props {
  nodeId: string;
  nodeType: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for individual nodes.
 * Prevents a single node crash from breaking the entire canvas.
 */
export class NodeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `Node Error [${this.props.nodeType}:${this.props.nodeId}]:`,
      error,
      errorInfo
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-lg shadow-md border-2 border-red-300 p-4 w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-red-700">Node Error</span>
          </div>
          <p className="text-xs text-bridge-600 mb-3">
            This {this.props.nodeType} node encountered an error.
          </p>
          {this.state.error && (
            <p className="text-xs text-red-600 mb-3 font-mono bg-red-50 p-2 rounded overflow-hidden text-ellipsis">
              {this.state.error.message.slice(0, 100)}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="w-full px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

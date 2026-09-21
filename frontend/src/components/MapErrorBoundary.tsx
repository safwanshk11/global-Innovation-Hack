import { Component, type ReactNode } from "react";
import { MapPinOff } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Map failed to render, falling back to list-only view.", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-navy-600 bg-navy-800 p-6 text-center text-slate-400">
          <MapPinOff size={28} aria-hidden="true" />
          <p className="text-sm font-medium text-slate-300">Map unavailable right now</p>
          <p className="text-xs">The priority queue below still works without the map.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Component, type PropsWithChildren } from "react";
import { Button } from "../ui/Button";

interface ApplicationErrorBoundaryProps extends PropsWithChildren {
  onReload?: () => void;
}

interface ApplicationErrorBoundaryState {
  hasError: boolean;
}

export class ApplicationErrorBoundary extends Component<ApplicationErrorBoundaryProps, ApplicationErrorBoundaryState> {
  public state: ApplicationErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ApplicationErrorBoundaryState {
    return { hasError: true };
  }

  private reloadApplication = () => {
    if (this.props.onReload) {
      this.props.onReload();
      return;
    }

    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10 sm:px-6">
          <section className="w-full rounded-2xl border border-[#dce6f2] bg-white p-6 text-center shadow-sm sm:p-8" role="alert">
            <p className="text-sm font-semibold tracking-[0.08em] text-[#237a67]">Application Recovery</p>
            <h1 className="mt-2 text-2xl font-bold text-[#102a4c]">পৃষ্ঠা লোড করতে সমস্যা হয়েছে</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">Something went wrong while opening the admission service. Please reload the application and try again.</p>
            <Button className="mt-6" onClick={this.reloadApplication}>Reload Application</Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Container } from "../ui/Container";

export function NotFoundPage() {
  return (
    <Container>
      <main className="py-20 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-3 max-w-lg text-slate-600">The page you requested is not available in the admission portal.</p>
        <Link className="mt-6 inline-flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700" to="/">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Return to classes
        </Link>
      </main>
    </Container>
  );
}

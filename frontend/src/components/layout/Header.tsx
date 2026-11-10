import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Container } from "../ui/Container";

const navigation = [
  { to: "/", label: "Classes", end: true },
  { to: "/my-holds", label: "My Holds" }
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white">
      <Container>
        <div className="flex min-h-16 items-center justify-between gap-4">
          <NavLink className="inline-flex items-center gap-2 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700" to="/" onClick={() => setIsOpen(false)}>
            <span className="grid size-9 place-items-center rounded-lg bg-blue-700 text-white"><GraduationCap aria-hidden="true" className="size-5" /></span>
            <span>School Admission</span>
          </NavLink>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 sm:flex">
            <NavigationLinks onNavigate={() => setIsOpen(false)} />
          </nav>
          <button aria-controls="mobile-navigation" aria-expanded={isOpen} aria-label="Toggle navigation" className="grid size-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:hidden" onClick={() => setIsOpen((open) => !open)} type="button">
            {isOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
        </div>
        {isOpen ? <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-slate-100 py-3 sm:hidden"><NavigationLinks onNavigate={() => setIsOpen(false)} /></nav> : null}
      </Container>
    </header>
  );
}

function NavigationLinks({ onNavigate }: { onNavigate: () => void }) {
  return navigation.map(({ to, label, end }) => (
    <NavLink key={to} end={end} to={to} onClick={onNavigate} className={({ isActive }) => `block rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${isActive ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
      {label}
    </NavLink>
  ));
}

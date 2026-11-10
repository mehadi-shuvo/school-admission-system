import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Container } from "../ui/Container";
import { isValidStudentId } from "../../lib/utils/studentId";
import { useReservation } from "../../features/holds/context/ReservationContext";

const navigation = [
  { to: "/", label: "Classes", end: true },
  { to: "/my-holds", label: "My Holds" },
  { to: "/admin/classes", label: "School Admin" }
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { studentId, setStudentId, clearStudentId } = useReservation();
  const hasInvalidValue = studentId.length > 0 && !isValidStudentId(studentId);

  return (
    <header className="border-b border-slate-200 bg-white">
      <Container>
        <div className="flex min-h-16 items-center justify-between gap-4">
          <NavLink className="inline-flex items-center gap-2 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700" to="/" onClick={() => setIsOpen(false)}>
            <span className="grid size-9 place-items-center rounded-lg bg-blue-700 text-white"><GraduationCap aria-hidden="true" className="size-5" /></span>
            <span>School Admission</span>
          </NavLink>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            <NavigationLinks onNavigate={() => setIsOpen(false)} />
          </nav>
          <div className="hidden min-w-52 lg:block">
            <label className="block text-xs font-semibold text-slate-700" htmlFor="shared-student-id">Student ID</label>
            <div className="mt-1 flex gap-2">
              <input aria-describedby="shared-student-id-error" aria-invalid={hasInvalidValue} autoComplete="off" className="min-h-9 min-w-0 flex-1 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" id="shared-student-id" inputMode="numeric" maxLength={17} onChange={(event) => setStudentId(event.target.value)} pattern="[0-9]{17}" placeholder="17 digits" type="text" value={studentId} />
              {studentId ? <button className="rounded-md px-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={clearStudentId} type="button">Clear</button> : null}
            </div>
            <p className="mt-1 text-xs text-red-700" id="shared-student-id-error" role={hasInvalidValue ? "alert" : undefined}>{hasInvalidValue ? "Enter exactly 17 ASCII digits." : ""}</p>
          </div>
          <button aria-controls="mobile-navigation" aria-expanded={isOpen} aria-label="Toggle navigation" className="grid size-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 lg:hidden" onClick={() => setIsOpen((open) => !open)} type="button">
            {isOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
        </div>
        {isOpen ? <div id="mobile-navigation" className="border-t border-slate-100 py-3 lg:hidden"><nav aria-label="Mobile navigation"><NavigationLinks onNavigate={() => setIsOpen(false)} /></nav><div className="mt-3"><label className="block text-sm font-semibold text-slate-900" htmlFor="shared-student-id-mobile">Student ID</label><div className="mt-2 flex gap-2"><input aria-describedby="shared-student-id-mobile-error" aria-invalid={hasInvalidValue} autoComplete="off" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" id="shared-student-id-mobile" inputMode="numeric" maxLength={17} onChange={(event) => setStudentId(event.target.value)} pattern="[0-9]{17}" placeholder="17-digit Student ID" type="text" value={studentId} />{studentId ? <button className="rounded-lg px-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={clearStudentId} type="button">Clear</button> : null}</div><p className="mt-1 text-sm text-red-700" id="shared-student-id-mobile-error" role={hasInvalidValue ? "alert" : undefined}>{hasInvalidValue ? "Enter exactly 17 ASCII digits." : ""}</p></div></div> : null}
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

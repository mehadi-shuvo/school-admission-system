import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { isValidStudentId } from "../../lib/utils/studentId";
import { useReservation } from "../../features/holds/context/ReservationContext";
import { Container } from "../ui/Container";

const navigation = [
  { to: "/", label: "Home", end: true },
  { to: "/#classes", label: "Admissions", anchor: true },
  { to: "/my-holds", label: "My Applications" },
  { to: "/admin/classes", label: "Admin" }
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { studentId, setStudentId, clearStudentId } = useReservation();
  const hasInvalidValue = studentId.length > 0 && !isValidStudentId(studentId);

  return (
    <header className="sticky top-0 z-30 border-b border-[#dce6f2] bg-white/95 shadow-[0_2px_14px_rgba(18,52,91,0.05)] backdrop-blur">
      <Container>
        <div className="flex min-h-[4.75rem] items-center justify-between gap-3">
          <NavLink className="inline-flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#12345b]" to="/" onClick={() => setIsOpen(false)}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#12345b] text-white shadow-sm"><GraduationCap aria-hidden="true" className="size-5" /></span>
            <span className="min-w-0 leading-tight"><span className="block truncate text-sm font-bold tracking-tight text-[#12345b] sm:text-base">Onnorokom School</span><span className="block truncate text-xs font-medium text-[#237a67]">অন্যরকম স্কুল</span></span>
          </NavLink>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 xl:flex">
            <NavigationLinks onNavigate={() => setIsOpen(false)} />
          </nav>

          <StudentIdField compact studentId={studentId} hasInvalidValue={hasInvalidValue} onChange={setStudentId} onClear={clearStudentId} />

          <button aria-controls="mobile-navigation" aria-expanded={isOpen} aria-label={isOpen ? "Close navigation" : "Open navigation"} className="grid size-11 place-items-center rounded-xl text-[#12345b] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b] xl:hidden" onClick={() => setIsOpen((open) => !open)} type="button">
            {isOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
        </div>

        {isOpen ? <div id="mobile-navigation" className="border-t border-[#e4edf7] py-4 xl:hidden"><nav aria-label="Mobile navigation"><NavigationLinks onNavigate={() => setIsOpen(false)} /></nav><div className="mt-4 border-t border-[#e4edf7] pt-4"><StudentIdField studentId={studentId} hasInvalidValue={hasInvalidValue} onChange={setStudentId} onClear={clearStudentId} /></div></div> : null}
      </Container>
    </header>
  );
}

function StudentIdField({ compact = false, studentId, hasInvalidValue, onChange, onClear }: { compact?: boolean; studentId: string; hasInvalidValue: boolean; onChange: (value: string) => void; onClear: () => void }) {
  const inputId = compact ? "shared-student-id" : "shared-student-id-mobile";
  const errorId = `${inputId}-error`;

  return (
    <div className={compact ? "hidden min-w-56 xl:block" : "block"}>
      <label className="block text-xs font-bold text-[#17365d]" htmlFor={inputId}>Birth Registration Number</label>
      <div className="mt-1 flex gap-2">
        <input aria-describedby={errorId} aria-invalid={hasInvalidValue} autoComplete="off" className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#cbd8e7] bg-[#fbfdff] px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-[#12345b] focus:ring-2 focus:ring-blue-100" id={inputId} inputMode="numeric" maxLength={17} onChange={(event) => onChange(event.target.value)} pattern="[0-9]{17}" placeholder="Enter 17-digit number" type="text" value={studentId} />
        {studentId ? <button className="rounded-lg px-2 text-xs font-bold text-[#12345b] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b]" onClick={onClear} type="button">Clear</button> : null}
      </div>
      <p className="mt-1 text-xs text-red-700" id={errorId} role={hasInvalidValue ? "alert" : undefined}>{hasInvalidValue ? "ঠিক ১৭টি ইংরেজি সংখ্যা লিখুন।" : ""}</p>
    </div>
  );
}

function NavigationLinks({ onNavigate }: { onNavigate: () => void }) {
  return navigation.map(({ to, label, end, anchor }) => {
    const classes = "block rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b]";
    if (anchor) {
      return <Link className={`${classes} text-slate-600 hover:bg-blue-50 hover:text-[#12345b]`} key={to} to={to} onClick={onNavigate}>{label}</Link>;
    }
    return <NavLink key={to} end={end} to={to} onClick={onNavigate} className={({ isActive }) => `${classes} ${isActive ? "bg-blue-50 text-[#12345b]" : "text-slate-600 hover:bg-blue-50 hover:text-[#12345b]"}`}>{label}</NavLink>;
  });
}

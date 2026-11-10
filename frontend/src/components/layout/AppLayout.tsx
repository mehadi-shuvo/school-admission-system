import { Outlet } from "react-router-dom";
import { Container } from "../ui/Container";
import { Header } from "./Header";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-1 py-10 sm:py-14">
        <Container>
          <Outlet />
        </Container>
      </main>
      <footer className="border-t border-slate-200 bg-white py-5">
        <Container>
          <p className="text-sm text-slate-500">School Admission System</p>
        </Container>
      </footer>
    </div>
  );
}

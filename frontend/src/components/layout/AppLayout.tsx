import { Outlet } from "react-router-dom";
import { Container } from "../ui/Container";
import { Header } from "./Header";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f8fc] text-slate-900">
      <Header />
      <main className="flex-1 py-7 sm:py-10">
        <Container>
          <Outlet />
        </Container>
      </main>
      <footer className="border-t border-[#dce6f2] bg-white py-8">
        <Container>
          <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-[#12345b]">Onnorokom School <span className="font-normal text-slate-500">| অন্যরকম স্কুল</span></p>
            <p>শিক্ষার নতুন দিগন্ত</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}

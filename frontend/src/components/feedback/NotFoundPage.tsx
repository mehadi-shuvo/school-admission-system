import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Container } from "../ui/Container";

export function NotFoundPage() {
  return (
    <Container>
      <main className="py-20 sm:py-28">
        <p className="text-sm font-semibold tracking-[0.16em] text-[#237a67]">৪০৪</p>
        <h1 className="mt-2 text-3xl font-bold text-[#102a4c]">পৃষ্ঠা পাওয়া যায়নি</h1>
        <p className="mt-3 max-w-lg text-slate-600">আপনি যে পৃষ্ঠাটি খুঁজছেন, সেটি ভর্তি পোর্টালে পাওয়া যায়নি।</p>
        <Link className="mt-6 inline-flex items-center gap-2 font-bold text-[#12345b] hover:text-[#0b294e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#12345b]" to="/">
          <ArrowLeft aria-hidden="true" className="size-4" />
          শ্রেণিসমূহে ফিরে যান
        </Link>
      </main>
    </Container>
  );
}

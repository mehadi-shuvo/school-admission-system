interface PageHeadingProps {
  title: string;
  description: string;
}

export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-semibold tracking-[0.08em] text-[#237a67]">Onnorokom School · Admissions</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102a4c] sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base leading-8 text-slate-600">{description}</p>
    </header>
  );
}

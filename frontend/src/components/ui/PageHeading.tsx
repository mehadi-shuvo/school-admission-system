interface PageHeadingProps {
  title: string;
  description: string;
}

export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Admissions</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
    </header>
  );
}

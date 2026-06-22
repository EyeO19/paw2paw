export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute -left-20 top-32 h-64 w-64 rounded-full bg-primary-300/35 blur-3xl" />
      <div className="absolute -right-12 top-48 h-72 w-72 rounded-full bg-tag-mental-health/20 blur-3xl" />
      <div className="absolute bottom-32 left-1/4 h-56 w-56 rounded-full bg-tag-academics/18 blur-3xl" />
      <div className="absolute right-1/4 bottom-16 h-48 w-48 rounded-full bg-tag-campus-life/25 blur-3xl" />
    </div>
  );
}

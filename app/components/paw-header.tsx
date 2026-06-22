import { homeCopy } from "@/lib/copy/home";

const pawPath =
  "M62 108C42 82 58 48 88 58C88 32 118 24 132 52C138 26 168 28 178 54C192 34 224 48 228 78C252 68 278 92 272 118C298 128 308 172 292 222C276 288 228 328 160 334C92 328 44 288 28 222C12 172 22 128 48 118C42 98 50 88 62 108Z";

export function PawHeader() {
  return (
    <div className="relative mx-auto w-full max-w-[250px] md:max-w-[270px]">
      <svg
        viewBox="0 0 320 360"
        className="mx-auto block w-full text-primary-500 drop-shadow-[0_8px_24px_rgba(31,26,20,0.14)]"
        role="img"
        aria-label={homeCopy.hubLabel}
      >
        <path d={pawPath} fill="currentColor" />
      </svg>
      <div className="absolute inset-x-[6%] top-[30%] bottom-[16%] flex flex-col items-center justify-center px-2 text-center">
        <p className="font-display text-[2.75rem] font-bold leading-[0.92] tracking-tight text-ink-inverse sm:text-5xl md:text-[3.25rem]">
          {homeCopy.hubLabel}
        </p>
        <p className="mt-1.5 w-full px-0.5 font-sans text-base font-medium leading-[1.2] text-primary-100 sm:text-lg md:mt-2 md:text-xl">
          {homeCopy.tagline}
        </p>
      </div>
    </div>
  );
}

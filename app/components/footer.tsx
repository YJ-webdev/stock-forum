// app/components/footer.tsx
export const Footer = () => {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-3  bg-white px-4  pb-[max(0.625rem,env(safe-area-inset-bottom))] text-zinc-700 md:justify-end dark:bg-zinc-900 dark:text-zinc-300">
      <button type="button" className="cursor-pointer text-sm tracking-tight">
        help
      </button>

      <button type="button" className="cursor-pointer text-sm tracking-tight">
        feedback
      </button>

      <button type="button" className="cursor-pointer text-sm tracking-tight">
        privacy &amp; terms
      </button>

      <button type="button" className="cursor-pointer text-sm tracking-tight">
        disclaimer
      </button>
    </footer>
  );
};

// app/components/footer.tsx
export const Footer = () => {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1  bg-white px-4  pb-[max(0.625rem,env(safe-area-inset-bottom))] text-zinc-700 md:justify-end dark:bg-zinc-900 dark:text-zinc-300">
      <button type="button" className="cursor-pointer text-sm">
        help
      </button>

      <button type="button" className="cursor-pointer text-sm">
        feedback
      </button>

      <button type="button" className="cursor-pointer text-sm">
        privacy &amp; terms
      </button>

      <button type="button" className="cursor-pointer text-sm">
        disclaimer
      </button>
    </footer>
  );
};

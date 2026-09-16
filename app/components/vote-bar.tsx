export function VoteBar({
  bullCount,
  bearCount,
}: {
  bullCount: number;
  bearCount: number;
}) {
  const slots = 10;
  const total = bullCount + bearCount;

  const bullSlots = total > 0 ? Math.round((bullCount / total) * slots) : 0;

  const bearSlots = slots - bullSlots;

  return (
    <span className="inline-flex font-mono! mr-4 h-5 items-center justify-center text-[16px] leading-none tracking-[-2px]">
      <span className="text-zinc-600 font-mono! text-[13px] tracking-tightest dark:text-zinc-300">
        {"█".repeat(bullSlots)}
      </span>

      <span className="text-zinc-900 font-mono! text-[13px] tracking-tightest translate-x-0.5 dark:translate-x-1 dark:text-zinc-300">
        {"░".repeat(bearSlots)}
      </span>
    </span>
  );
}

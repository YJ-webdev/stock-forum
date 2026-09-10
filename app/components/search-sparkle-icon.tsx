export function SearchSparkIcon({
  className = "h-6 w-6",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Circle loop and handle - shifted right by 0.5px */}
      <path d="M12 4.5 A 5.5 5.5 0 1 0 15.3 12.8 M14.5 14l5.5 5.5" />

      {/* 4-point spark - shifted left by 0.5px */}
      <path
        d="M18.8 0.3 C18.8 3.3 21 5.6 24 5.6 C21 5.6 18.8 7.8 18.8 10.8 C18.8 7.8 16.6 5.6 13.6 5.6 C16.6 5.6 18.8 3.3 18.8 0.3 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

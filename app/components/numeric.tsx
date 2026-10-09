export function Numeric({
  children,
  className,
  decimals = 2,
}: {
  children: React.ReactNode;
  className?: string;
  decimals?: number;
}) {
  const formatNumber = (value: React.ReactNode): React.ReactNode => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    if (typeof value !== "number" && typeof value !== "string") {
      return value;
    }

    if (typeof value === "string" && value.trim() === "") {
      return "-";
    }

    const num = Number(value);

    if (!Number.isFinite(num)) {
      return typeof value === "number" ? "-" : value;
    }

    return num.toLocaleString("en-US", {
      useGrouping: true,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <span className={`numeric ${className ?? ""}`}>
      {formatNumber(children)}
    </span>
  );
}

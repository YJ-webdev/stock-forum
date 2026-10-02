export function Numeric({
  children,
  className,
  decimals = 2,
}: {
  children: React.ReactNode;
  className?: string;
  decimals?: number;
}) {
  const formatNumber = (value: React.ReactNode) => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    const num = Number(value);

    if (Number.isNaN(num)) {
      return value;
    }

    return num.toLocaleString("en-US", {
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

export function Numeric({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <span className={`numeric ${className ?? ""}`}>
      {formatNumber(children)}
    </span>
  );
}

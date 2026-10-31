export interface GifDimensions {
  width: number;
  height: number;
}

function parseDimension(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const dimension = Number(value);

  if (
    !Number.isSafeInteger(dimension) ||
    dimension <= 0 ||
    dimension > 100_000
  ) {
    return null;
  }

  return dimension;
}

export function getGifDimensions(
  width: unknown,
  height: unknown,
): GifDimensions | null {
  const parsedWidth = parseDimension(width);
  const parsedHeight = parseDimension(height);

  if (parsedWidth === null || parsedHeight === null) {
    return null;
  }

  return {
    width: parsedWidth,
    height: parsedHeight,
  };
}

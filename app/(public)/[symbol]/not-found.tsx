import Link from "next/link";

export default function AssetNotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-56px)] w-full items-center justify-center">
      <div className="flex flex-col items-center px-6 text-center">
        <h1 className="text-xl font-medium">Asset could not be found</h1>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          This market does not exist or is no longer available.
        </p>

        <Link href="/" className="mt-5 text-sm font-normal hover:underline">
          Back to markets
        </Link>
      </div>
    </div>
  );
}

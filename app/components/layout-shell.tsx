"use client";

import { useState } from "react";
import { Header } from "./header";
import PanelLeft from "./panel-left";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export default function LayoutShell({ user }: { user?: User | null }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Header user={user} onTogglePanel={() => setIsOpen((prev) => !prev)} />
      <PanelLeft isOpen={isOpen} setIsOpen={setIsOpen} />

      <div
        className={`pt-14 min-h-screen w-full flex flex-col md:flex-row max-w-full transition-[padding] duration-700 ease-out ${
          isOpen ? "md:pl-60" : "pl-0"
        }`}
      >
        {/* Section A (2/3 of available inner space) */}
        <section className="w-full md:w-2/3 p-4">A</section>

        {/* Section B (1/3 of available inner space) */}
        <section className="w-full md:w-1/3 p-4 border-l border-zinc-100 dark:border-zinc-900">
          B
        </section>
      </div>
    </>
  );
}

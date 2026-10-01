import React from "react";

export const Footer = () => {
  return (
    <footer className="flex justify-center md:justify-end pb-2.5 px-4 gap-3 mt-auto text-zinc-700 dark:text-zinc-300 whitespace-nowrap truncate">
      <button className="text-sm cursor-pointer">help</button>
      <button className="text-sm cursor-pointer">feedback</button>
      <button className="text-sm cursor-pointer">privacy & terms</button>
      <button className="text-sm cursor-pointer">disclaimer</button>
    </footer>
  );
};

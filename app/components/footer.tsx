import React from "react";

export const Footer = () => {
  return (
    <footer className="absolute bottom-0 -translate-x-1/2 left-1/2 flex justify-center gap-4 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap truncate">
      <button className="text-sm cursor-pointer">help</button>
      <button className="text-sm cursor-pointer">send feedback</button>
      <button className="text-sm cursor-pointer">privacy</button>
      <button className="text-sm cursor-pointer">terms</button>
      <button className="text-sm cursor-pointer">disclaimer</button>
    </footer>
  );
};

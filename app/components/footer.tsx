import React from "react";

export const Footer = () => {
  return (
    <footer className="flex justify-center gap-4 p-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
      <button className="text-sm cursor-pointer">help</button>
      <button className="text-sm cursor-pointer">send feedback</button>
      <button className="text-sm cursor-pointer">privacy</button>
      <button className="text-sm cursor-pointer">terms</button>
      <button className="text-sm cursor-pointer">disclaimer</button>
    </footer>
  );
};

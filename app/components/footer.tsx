import React from "react";

export const Footer = () => {
  return (
    <div className="text-center p-2 flex gap-4 mx-auto text-zinc-700 dark:text-zinc-400">
      <button className="text-sm hover:cursor-pointer">help</button>
      <button className="text-sm hover:cursor-pointer">send feedback</button>
      <button className="text-sm hover:cursor-pointer">privacy</button>
      <button className="text-sm hover:cursor-pointer">terms</button>
      <button className="text-sm hover:cursor-pointer">disclaimer</button>
    </div>
  );
};

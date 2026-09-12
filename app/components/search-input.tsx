import { useRef, useState } from "react";
import { KbdMarkup } from "./kbd-markup";
import { SearchSparkIcon } from "./search-sparkle-icon";

export default function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");

  const handleSearch = async () => {
    if (input.trim().length > 0) {
      console.log("handleSearch:", input);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className="flex px-5  items-center w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full cursor-text"
      onClick={handleContainerClick}
    >
      {/* Search Icon */}
      {/* <SearchIcon className="h-6 w-6 shrink-0 mr-2.5" strokeWidth={1.5} /> */}
      {/* Google Material Symbol search_spark */}
      <SearchSparkIcon className="h-6 w-6 shrink-0 mr-2.5" />

      {/* Input Field - dynamic width */}
      <input
        ref={inputRef}
        type="text"
        autoFocus={true}
        value={input}
        placeholder="Search..."
        className="lg:w-2xl w-full bg-transparent placeholder:text-black dark:placeholder:text-white outline-none ring-0 font-normal focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
        maxLength={30}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
      />

      {/* Keyboard Hint Container */}
      <div className="hidden lg:flex items-center shrink-0 ml-2">
        <KbdMarkup />
      </div>
    </div>
  );
}

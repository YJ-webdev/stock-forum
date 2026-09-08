import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { KbdMarkup } from "./kbd-markup";

export default function SeaerchInput() {
  const [input, setInput] = useState("");
  const handleSearch = async () => {
    if (input.trim().length > 0) {
      console.log("handleSearch:", input);
    }
  };

  return (
    <div className="rounded-full flex items-center">
      <div className="p-2.5 bg-muted rounded-l-full border-r-0 ">
        <SearchIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1} />
      </div>

      <input
        type="text"
        autoFocus={true}
        value={input}
        placeholder="Search..."
        className="h-10 border-l-0 border-r-0 rounded-r-full md:rounded-r-none placeholder:text-muted-foreground bg-muted outline-none ring-0 text-md md:text-[14px] placeholder:text-[14px] focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
        maxLength={30}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
      />
      <div className="hidden md:block p-2.5 bg-muted rounded-r-full border-l-0 outline-none ring-0 text-[15px] md:text-[14px] placeholder:text-[14px] focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none">
        <KbdMarkup />
      </div>
    </div>
  );
}

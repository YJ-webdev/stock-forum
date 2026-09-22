import { Avatar } from "@/components/ui/avatar";
import { ThumbsUp } from "lucide-react";
import React from "react";

export const YoutubeComment = () => {
  return (
    <div className="w-fit border px-4 flex flex-col">
      <div className="flex">
        <Avatar className="h-10 w-10 rounded-full border bg-amber-100" />
        <p className="border w-full">name</p>
      </div>
      <div className="ml-5 px-5 border-l w-full">
        <div className="bg-amber-700 flex flex-col">
          <input />
          <div className="flex">
            <ThumbsUp className="h-5 w-5" />
            <span>reply</span>
          </div>
        </div>
      </div>
    </div>
  );
};

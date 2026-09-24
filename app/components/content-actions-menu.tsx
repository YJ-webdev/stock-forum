"use client";

import {
  MoreVertical,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContentActionsMenuProps {
  isAuthor?: boolean;
  isAdmin?: boolean;
  isModerated?: boolean;

  isDeleting?: boolean;
  isModerating?: boolean;

  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  onHide?: () => void | Promise<void>;
  onRestore?: () => void | Promise<void>;
  hoverGroup?: "comment" | "reply";
}

export function ContentActionsMenu({
  isAuthor = false,
  isAdmin = false,
  isModerated = false,

  isDeleting = false,
  isModerating = false,
  hoverGroup = "reply",

  onEdit,
  onDelete,
  onHide,
  onRestore,
}: ContentActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`
          ml-auto rounded-full p-1.5
          lg:opacity-0
          hover:bg-zinc-100
          lg:dark:hover:bg-zinc-800

          ${
            hoverGroup === "comment"
              ? "lg:group-hover/comment:opacity-100"
              : "lg:group-hover/reply:opacity-100"
          }
        `}
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {isAuthor && (
          <>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={isDeleting}
              onClick={onDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 size-4" />

              {isDeleting ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </>
        )}

        {isAdmin && !isModerated && onHide && (
          <DropdownMenuItem disabled={isModerating} onClick={onHide}>
            <ShieldOff className="mr-2 size-4" />

            {isModerating ? "Hiding..." : "Hide"}
          </DropdownMenuItem>
        )}

        {isAdmin && isModerated && onRestore && (
          <DropdownMenuItem disabled={isModerating} onClick={onRestore}>
            <ShieldCheck className="mr-2 size-4" />

            {isModerating ? "Restoring..." : "Restore"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import {
  Flag,
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

import { resolveLanguage } from "@/lib/data/languages";
import { CONTENT_ACTION_LABELS } from "@/lib/data/translations";

interface ContentActionsMenuProps {
  language?: string | null;

  isAuthor?: boolean;
  isAdmin?: boolean;
  isModerated?: boolean;

  isDeleting?: boolean;
  isModerating?: boolean;
  isReporting?: boolean;

  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  onHide?: () => void | Promise<void>;
  onRestore?: () => void | Promise<void>;
  onReport?: () => void | Promise<void>;

  hoverGroup?: "comment" | "reply";
}

export function ContentActionsMenu({
  language,
  isAuthor = false,
  isAdmin = false,
  isModerated = false,

  isDeleting = false,
  isModerating = false,
  isReporting = false,
  hoverGroup = "reply",

  onEdit,
  onDelete,
  onHide,
  onRestore,
  onReport,
}: ContentActionsMenuProps) {
  const labels = CONTENT_ACTION_LABELS[resolveLanguage(language)];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={labels.actions}
        className={`
          ml-auto rounded-full p-1.5
          lg:opacity-0
          hover:bg-zinc-100
          lg:dark:hover:bg-zinc-800
          cursor-pointer

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
        {isAuthor ? (
          <>
            <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
              <Pencil className="mr-2 size-4" />
              {labels.edit}
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={isDeleting}
              onClick={onDelete}
              className="cursor-pointer"
            >
              <Trash2
                className="mr-2 size-4"
                style={{ color: "inherit", stroke: "currentColor" }}
              />
              {isDeleting ? labels.deleting : labels.delete}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            disabled={isReporting}
            onClick={onReport}
            className="cursor-pointer"
          >
            <Flag
              className="mr-2 size-4 "
              style={{ color: "inherit", stroke: "currentColor" }}
            />
            {isReporting ? labels.reporting : labels.report}
          </DropdownMenuItem>
        )}

        {isAdmin && !isModerated && onHide && (
          <DropdownMenuItem
            disabled={isModerating}
            onClick={onHide}
            className="cursor-pointer"
          >
            <ShieldOff className="mr-2 size-4" />
            {isModerating ? labels.hiding : labels.hide}
          </DropdownMenuItem>
        )}

        {isAdmin && isModerated && onRestore && (
          <DropdownMenuItem
            disabled={isModerating}
            onClick={onRestore}
            className="cursor-pointer"
          >
            <ShieldCheck className="mr-2 size-4" />
            {isModerating ? labels.restoring : labels.restore}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

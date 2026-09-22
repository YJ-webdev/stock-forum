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
  canEdit?: boolean;
  canDelete?: boolean;

  isAdmin?: boolean;
  isModerated?: boolean;

  isDeleting?: boolean;
  isModerating?: boolean;

  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  onHide?: () => void | Promise<void>;
  onRestore?: () => void | Promise<void>;
}

export function ContentActionsMenu({
  canEdit = false,
  canDelete = false,

  isAdmin = false,
  isModerated = false,

  isDeleting = false,
  isModerating = false,

  onEdit,
  onDelete,
  onHide,
  onRestore,
}: ContentActionsMenuProps) {
  const hasActions =
    canEdit ||
    canDelete ||
    (isAdmin && (!isModerated ? Boolean(onHide) : Boolean(onRestore)));

  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="
          ml-auto rounded-full p-1.5
          opacity-0
          hover:bg-zinc-100
          group-hover:opacity-100
          dark:hover:bg-zinc-800
        "
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {canEdit && onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
        )}

        {canDelete && onDelete && (
          <DropdownMenuItem
            disabled={isDeleting}
            onClick={onDelete}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 size-4" />

            {isDeleting ? "Deleting..." : "Delete"}
          </DropdownMenuItem>
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

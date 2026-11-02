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
  isWithdrawn?: boolean;

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
  isWithdrawn = false,

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

  const canEdit = isAuthor && !isWithdrawn && !!onEdit;
  const canDelete = isAuthor && !isWithdrawn && !!onDelete;
  const canReport = !isAuthor && !isWithdrawn && !!onReport;

  const canHide = isAdmin && !isModerated && !!onHide;
  const canRestore = isAdmin && isModerated && !!onRestore;

  const hasActions = canEdit || canDelete || canReport || canHide || canRestore;

  if (!hasActions) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={labels.actions}
        className={`
          ml-auto cursor-pointer rounded-full p-1.5
          hover:bg-zinc-100
          dark:hover:bg-zinc-800
          xl:opacity-0
          focus-visible:opacity-100
          data-[state=open]:opacity-100
          ${
            hoverGroup === "comment"
              ? "xl:group-hover/comment:opacity-100"
              : "xl:group-hover/reply:opacity-100"
          }
        `}
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <Pencil className="mr-2 size-4" />
            {labels.edit}
          </DropdownMenuItem>
        )}

        {canDelete && (
          <DropdownMenuItem
            disabled={isDeleting}
            onClick={onDelete}
            className="cursor-pointer"
          >
            <Trash2 className="mr-2 size-4" />
            {isDeleting ? labels.deleting : labels.delete}
          </DropdownMenuItem>
        )}

        {canReport && (
          <DropdownMenuItem
            disabled={isReporting}
            onClick={onReport}
            className="cursor-pointer"
          >
            <Flag className="mr-2 size-4" />
            {isReporting ? labels.reporting : labels.report}
          </DropdownMenuItem>
        )}

        {canHide && (
          <DropdownMenuItem
            disabled={isModerating}
            onClick={onHide}
            className="cursor-pointer"
          >
            <ShieldOff className="mr-2 size-4" />
            {isModerating ? labels.hiding : labels.hide}
          </DropdownMenuItem>
        )}

        {canRestore && (
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

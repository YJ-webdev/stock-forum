"use client";

import { use } from "react";

import PanelLeftMobile from "./panel-left-mobile";

import type { LayoutSideData } from "../actions/query";

interface PanelLeftMobileStreamProps {
  sideDataPromise: Promise<LayoutSideData>;

  isOpen: boolean;

  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  user: { id: string } | null;
}

export default function PanelLeftMobileStream({
  sideDataPromise,
  isOpen,
  setIsOpen,
  user,
}: PanelLeftMobileStreamProps) {
  const { comments, popularBoards } = use(sideDataPromise);

  return (
    <PanelLeftMobile
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      comments={comments}
      popularBoards={popularBoards}
      user={user}
    />
  );
}

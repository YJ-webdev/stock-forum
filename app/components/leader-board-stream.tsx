"use client";

import { use } from "react";

import { LeaderBoard } from "./leader-board";

import type { LayoutSideData } from "../actions/query";

interface LeaderBoardStreamProps {
  sideDataPromise: Promise<LayoutSideData>;
}

export function LeaderBoardStream({ sideDataPromise }: LeaderBoardStreamProps) {
  const { traders } = use(sideDataPromise);

  return <LeaderBoard traders={traders} />;
}

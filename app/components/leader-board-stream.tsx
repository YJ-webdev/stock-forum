"use client";

import { use } from "react";

import { LeaderBoard } from "./leader-board";

import type { LayoutSideData } from "../actions/query";

type User = {
  id: string;
};

interface LeaderBoardStreamProps {
  sideDataPromise: Promise<LayoutSideData>;
  user: User | null;
}

export function LeaderBoardStream({
  sideDataPromise,
  user,
}: LeaderBoardStreamProps) {
  const { traders } = use(sideDataPromise);

  return <LeaderBoard traders={traders} user={user} />;
}

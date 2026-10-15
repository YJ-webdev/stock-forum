"use client";

import { use } from "react";

import type { User } from "@/types/user";
import type { LayoutSideData } from "../actions/query";

import { LeaderBoard } from "./leader-board";

interface LeaderBoardStreamProps {
  sideDataPromise: Promise<LayoutSideData>;
  user: User | null;
}

export function LeaderBoardStream({
  sideDataPromise,
  user,
}: LeaderBoardStreamProps) {
  const { traders } = use(sideDataPromise);

  return (
    <LeaderBoard
      traders={traders}
      user={user}
      onBanRequest={(target) => {
        // 차단 확인 다이얼로그 연결 전 임시 처리.
        console.log("Ban target:", target);
      }}
    />
  );
}

"use client";

import { use } from "react";

import PanelLeft from "./panel-left";

import type { LayoutSideData } from "../actions/query";

interface PanelLeftStreamProps {
  sideDataPromise: Promise<LayoutSideData>;
}

export default function PanelLeftStream({
  sideDataPromise,
}: PanelLeftStreamProps) {
  const { comments, popularBoards } = use(sideDataPromise);

  return <PanelLeft comments={comments} popularBoards={popularBoards} />;
}

"use client";

import { useEffect } from "react";

export function OAuthFragmentCleanup() {
  useEffect(() => {
    if (window.location.hash !== "#_=_") return;

    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
  }, []);

  return null;
}

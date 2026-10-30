"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function NavigationStatus() {
  const { pending } = useLinkStatus();
  return <span className="navigation-pending" role="status">{pending ? "Loading…" : null}</span>;
}

// Respond to a navigation immediately while the destination checks current
// evidence eligibility. Keep prefetch disabled; a previous read is not authority
// to display a new page's records after a revocation.
export function ResearchLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} prefetch={false}>{children}<NavigationStatus/></Link>;
}

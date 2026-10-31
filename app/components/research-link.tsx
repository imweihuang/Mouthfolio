"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { receiptDismissalHref } from "../../lib/receipt-dismissal";
import { useReceiptDismissal } from "./receipt-dismissal";

function NavigationStatus() {
  const { pending } = useLinkStatus();
  return <span className="navigation-pending" role="status">{pending ? "Loading…" : null}</span>;
}

// Respond to a navigation immediately while the destination checks current
// evidence eligibility. Keep prefetch disabled; a previous read is not authority
// to display a new page's records after a revocation.
export function ResearchLink({ children, href, ...props }: ComponentProps<typeof Link>) {
  const { dismissedUrl } = useReceiptDismissal();
  const destination = typeof href === "string" && !("data-receipt" in props) ? receiptDismissalHref(href, dismissedUrl) : href;
  return <Link {...props} href={destination} prefetch={false}>{children}<NavigationStatus/></Link>;
}

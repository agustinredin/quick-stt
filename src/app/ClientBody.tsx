"use client";

import { useEffect } from "react";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove any extension-added classes during hydration
  useEffect(() => {
    // Ensure the antialiased class is present without removing existing font classes
    document.body.classList.add("antialiased");
  }, []);

  return <div className="antialiased">{children}</div>;
}

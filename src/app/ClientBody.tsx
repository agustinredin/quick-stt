"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

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

  return (
    <I18nextProvider i18n={i18n}>
      <div className="antialiased">{children}</div>
    </I18nextProvider>
  );
}

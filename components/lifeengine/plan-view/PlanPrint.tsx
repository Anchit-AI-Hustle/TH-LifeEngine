import type { ReactNode } from "react";

// Print rules for plan pages. The app shell is shared, so these live with the
// plan view and only apply while a plan page is mounted.
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 14mm 12mm; }
  html, body { background: #fff !important; color: #000 !important; }
  body * { box-shadow: none !important; text-shadow: none !important; }
  #topbar, aside, a[href="#main"], #anchit-app-skill-map-root, #anchit-project-playbooks-root { display: none !important; }
  #main { padding-left: 0 !important; }
  #main > div { max-width: none !important; padding: 0 !important; }
  .plan-print-page { break-after: page; page-break-after: always; }
  .plan-print-page:last-child { break-after: auto; page-break-after: auto; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export function PlanPrintStyles() {
  return <style>{PRINT_CSS}</style>;
}

/**
 * Hidden on screen; when printing it replaces the interactive view with every
 * day, one per page.
 */
export function PrintPages({
  title,
  subtitle,
  count,
  renderPage,
}: {
  title: string;
  subtitle?: string;
  count: number;
  renderPage: (index: number) => ReactNode;
}) {
  return (
    <div className="hidden bg-white text-black print:block" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="plan-print-page">
          <p className="mb-4 text-xs text-gray-700">
            {title}
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
          {renderPage(index)}
        </div>
      ))}
    </div>
  );
}

export function adminInformationPdfFilename(mobile: string, reference: string) {
  const value = mobile.trim().replace(/[\s().-]/g, "");
  const nationalNumber = /^\+91[6-9]\d{9}$/.test(value)
    ? value.slice(3)
    : /^91[6-9]\d{9}$/.test(value)
      ? value.slice(2)
      : /^[6-9]\d{9}$/.test(value)
        ? value
        : "not-recorded";
  const suffix = reference.replace(/^SVG-/i, "").replace(/[^a-z0-9-]/gi, "").slice(0, 64) || "reference";
  return `SVG-${nationalNumber}-${suffix}.pdf`;
}

export function adminEstimatePdfFilename(mobile: string, reference: string) {
  return adminInformationPdfFilename(mobile, reference).replace(/\.pdf$/i, "-estimate.pdf");
}

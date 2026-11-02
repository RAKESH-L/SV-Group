import { Resend } from "resend";
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export async function sendEnquiryEmail(data: { name: string; mobile: string; email?: string; message: string; createdAt: Date }) {
  const apiKey = process.env.RESEND_API_KEY, to = process.env.ADMIN_NOTIFICATION_EMAIL, from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !to || !from) { console.info("Enquiry email not sent: email provider environment is not configured."); return; }
  const e = { name: escapeHtml(data.name), mobile: escapeHtml(data.mobile), email: escapeHtml(data.email || "Not provided"), message: escapeHtml(data.message).replace(/\n/g, "<br>") };
  await new Resend(apiKey).emails.send({ from, to, subject: `New general enquiry from ${e.name}`, html: `<div style="font-family:Arial,sans-serif;color:#201a13;max-width:600px;margin:auto"><div style="background:#23190f;padding:24px;color:#f8cf73"><h1 style="margin:0">SV Groups</h1><p style="color:#f5eee2">New general enquiry</p></div><div style="padding:24px;background:#fffaf0"><p><b>Name</b><br>${e.name}</p><p><b>Mobile</b><br>${e.mobile}</p><p><b>Email</b><br>${e.email}</p><p><b>Message</b><br>${e.message}</p><p style="color:#766d5e">Received ${data.createdAt.toISOString()}</p></div></div>` });
}

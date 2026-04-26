"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const escapeHtml = (value) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const formatMessage = (message) => escapeHtml(message).replace(/\r?\n/g, "<br />");
const newsletterTemplate = ({ name, subject, message, }) => `
  <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
      <p style="margin: 0 0 12px; font-size: 16px;">Hi ${escapeHtml(name || "there")},</p>
      <h1 style="margin: 0 0 16px; font-size: 28px; color: #0f172a;">${escapeHtml(subject)}</h1>
      <p style="margin: 0; font-size: 15px; line-height: 1.8; color: #334155;">
        ${formatMessage(message)}
      </p>
    </div>
  </div>
`;
exports.default = newsletterTemplate;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loyaltyPointsAwardedTemplate = ({ name, pointsAwarded, currentBalance, }) => `
  <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
      <p style="margin: 0 0 12px; font-size: 16px;">Hi ${name || "there"},</p>
      <h1 style="margin: 0 0 16px; font-size: 28px; color: #1d4ed8;">You earned loyalty points</h1>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #334155;">
        Great news. Your recent order has been delivered and <strong>${pointsAwarded}</strong>
        loyalty point${pointsAwarded === 1 ? "" : "s"} have been added to your account.
      </p>
      <div style="background: linear-gradient(135deg, #dbeafe, #eff6ff); border-radius: 14px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 13px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.08em;">Current Balance</p>
        <p style="margin: 8px 0 0; font-size: 32px; font-weight: 700; color: #1d4ed8;">${currentBalance}</p>
      </div>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569;">
        Thanks for shopping with us. We will keep your rewards ready for your next order.
      </p>
    </div>
  </div>
`;
exports.default = loyaltyPointsAwardedTemplate;

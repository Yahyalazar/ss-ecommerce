"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const AppError_1 = __importDefault(require("@/shared/errors/AppError"));
const resolveTransportConfig = () => {
    var _a, _b, _c, _d, _e;
    const emailUser = (_a = process.env.EMAIL_USER) === null || _a === void 0 ? void 0 : _a.trim();
    const emailPass = (_b = process.env.EMAIL_PASS) === null || _b === void 0 ? void 0 : _b.trim();
    const smtpHost = (_c = process.env.SMTP_HOST) === null || _c === void 0 ? void 0 : _c.trim();
    const smtpPortValue = (_d = process.env.SMTP_PORT) === null || _d === void 0 ? void 0 : _d.trim();
    const smtpSecure = process.env.SMTP_SECURE === "true";
    const emailService = ((_e = process.env.EMAIL_SERVICE) === null || _e === void 0 ? void 0 : _e.trim()) || "gmail";
    if (smtpHost) {
        const smtpPort = Number(smtpPortValue || (smtpSecure ? 465 : 587));
        if (!emailUser || !emailPass) {
            throw new AppError_1.default(500, "Email service is not configured. Set SMTP_HOST, EMAIL_USER, and EMAIL_PASS in the server environment.");
        }
        return {
            auth: {
                user: emailUser,
                pass: emailPass,
            },
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
        };
    }
    if (!emailUser || !emailPass) {
        throw new AppError_1.default(500, "Email service is not configured. Set EMAIL_USER and EMAIL_PASS in src/server/.env.");
    }
    return {
        auth: {
            user: emailUser,
            pass: emailPass,
        },
        service: emailService,
    };
};
const sendEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, text, html, }) {
    var _b, _c;
    const fromAddress = ((_b = process.env.EMAIL_FROM) === null || _b === void 0 ? void 0 : _b.trim()) ||
        ((_c = process.env.EMAIL_USER) === null || _c === void 0 ? void 0 : _c.trim()) ||
        "no-reply@talashop.local";
    try {
        const transporter = nodemailer_1.default.createTransport(resolveTransportConfig());
        const mailOptions = {
            from: fromAddress,
            to,
            subject,
            text,
            html,
        };
        const info = yield transporter.sendMail(mailOptions);
        console.log("Email sent: ", info.response);
    }
    catch (error) {
        console.error("Error sending email:", error);
        if (error instanceof AppError_1.default) {
            throw error;
        }
        throw new AppError_1.default(500, "Email delivery failed. Check your SMTP or Gmail credentials and try again.");
    }
});
exports.default = sendEmail;

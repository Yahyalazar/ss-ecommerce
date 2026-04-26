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
exports.UserService = void 0;
const AppError_1 = __importDefault(require("@/shared/errors/AppError"));
const sendEmail_1 = __importDefault(require("@/shared/utils/sendEmail"));
const newsletter_1 = __importDefault(require("@/shared/templates/newsletter"));
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.userRepository.findAllUsers();
        });
    }
    getUserById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findUserById(id);
            if (!user) {
                throw new AppError_1.default(404, "User not found");
            }
            return user;
        });
    }
    getUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findUserByEmail(email);
            if (!user) {
                throw new AppError_1.default(404, "User not found");
            }
            return user;
        });
    }
    getMe(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findUserById(id);
            if (!user) {
                throw new AppError_1.default(404, "User not found");
            }
            return user;
        });
    }
    updateMe(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findUserById(id);
            if (!user) {
                throw new AppError_1.default(404, "User not found");
            }
            return yield this.userRepository.updateUser(id, data);
        });
    }
    updateNewsletterPreference(id, newsletterSubscribed) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findUserById(id);
            if (!user) {
                throw new AppError_1.default(404, "User not found");
            }
            return this.userRepository.updateNewsletterPreference(id, newsletterSubscribed);
        });
    }
    sendNewsletter(_a) {
        return __awaiter(this, arguments, void 0, function* ({ subject, message, }) {
            const subscribers = yield this.userRepository.findSubscribedUsers();
            if (subscribers.length === 0) {
                throw new AppError_1.default(400, "There are no subscribed clients to email.");
            }
            const deliveries = yield Promise.allSettled(subscribers.map((subscriber) => (0, sendEmail_1.default)({
                to: subscriber.email,
                subject,
                text: message,
                html: (0, newsletter_1.default)({
                    name: subscriber.name,
                    subject,
                    message,
                }),
            })));
            const sentCount = deliveries.filter((result) => result.status === "fulfilled").length;
            const failedCount = deliveries.length - sentCount;
            if (sentCount === 0) {
                throw new AppError_1.default(500, "Newsletter delivery failed for all subscribed clients.");
            }
            return {
                audienceCount: subscribers.length,
                sentCount,
                failedCount,
            };
        });
    }
    deleteUser(id, currentUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Prevent self-deletion
            if (id === currentUserId) {
                throw new AppError_1.default(400, "You cannot delete your own account");
            }
            const user = yield this.userRepository.findUserById(id);
            if (!user) {
                throw new AppError_1.default(404, "User not found");
            }
            // Prevent deletion of last SUPERADMIN
            if (user.role === "SUPERADMIN") {
                const superAdminCount = yield this.userRepository.countUsersByRole("SUPERADMIN");
                if (superAdminCount <= 1) {
                    throw new AppError_1.default(400, "Cannot delete the last SuperAdmin");
                }
            }
            yield this.userRepository.deleteUser(id);
        });
    }
    createAdmin(adminData, createdByUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            const creator = yield this.userRepository.findUserById(createdByUserId);
            if (!creator) {
                throw new AppError_1.default(404, "Creator user not found");
            }
            if (creator.role !== "SUPERADMIN") {
                throw new AppError_1.default(403, "Only SuperAdmins can create new admins");
            }
            // Check if user already exists
            const existingUser = yield this.userRepository.findUserByEmail(adminData.email);
            if (existingUser) {
                throw new AppError_1.default(400, "User with this email already exists");
            }
            // Create new admin with ADMIN role (not SUPERADMIN)
            const newAdmin = yield this.userRepository.createUser(Object.assign(Object.assign({}, adminData), { role: "ADMIN", emailVerified: true }));
            return newAdmin;
        });
    }
}
exports.UserService = UserService;

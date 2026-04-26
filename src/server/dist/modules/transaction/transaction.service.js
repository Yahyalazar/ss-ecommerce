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
exports.TransactionService = void 0;
const logs_factory_1 = require("../logs/logs.factory");
const client_1 = require("@prisma/client");
const AppError_1 = __importDefault(require("@/shared/errors/AppError"));
const database_config_1 = __importDefault(require("@/infra/database/database.config"));
const sendEmail_1 = __importDefault(require("@/shared/utils/sendEmail"));
const loyaltyPointsAwarded_1 = __importDefault(require("@/shared/templates/loyaltyPointsAwarded"));
class TransactionService {
    constructor(transactionRepository) {
        this.transactionRepository = transactionRepository;
        this.logsService = (0, logs_factory_1.makeLogsService)();
    }
    calculateLoyaltyPoints(amount) {
        var _a;
        const configuredRate = Number((_a = process.env.LOYALTY_POINTS_RATE) !== null && _a !== void 0 ? _a : "1");
        const rate = Number.isFinite(configuredRate) && configuredRate > 0
            ? configuredRate
            : 1;
        return Math.max(0, Math.floor(amount * rate));
    }
    getAllTransactions() {
        return __awaiter(this, void 0, void 0, function* () {
            const transactions = yield this.transactionRepository.findMany();
            return transactions;
        });
    }
    getTransactionById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = yield this.transactionRepository.findById(id);
            return transaction;
        });
    }
    updateTransactionStatus(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingTransaction = yield this.transactionRepository.findById(id);
            if (!existingTransaction) {
                throw new AppError_1.default(404, "Transaction not found");
            }
            const negativeStatuses = new Set([
                client_1.TRANSACTION_STATUS.CANCELED,
                client_1.TRANSACTION_STATUS.RETURNED,
                client_1.TRANSACTION_STATUS.REFUNDED,
            ]);
            let pointsAwarded = 0;
            let rewardEmailRecipient = null;
            let currentBalance = existingTransaction.order.user.loyaltyPointsBalance;
            yield database_config_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                yield tx.transaction.update({
                    where: { id },
                    data: { status: data.status },
                });
                yield tx.order.update({
                    where: { id: existingTransaction.orderId },
                    data: { status: data.status },
                });
                if (data.status === client_1.TRANSACTION_STATUS.DELIVERED &&
                    existingTransaction.order.loyaltyPointsAwarded === 0) {
                    pointsAwarded = this.calculateLoyaltyPoints(existingTransaction.order.amount);
                    if (pointsAwarded > 0) {
                        const updatedUser = yield tx.user.update({
                            where: { id: existingTransaction.order.userId },
                            data: {
                                loyaltyPointsBalance: {
                                    increment: pointsAwarded,
                                },
                            },
                            select: {
                                email: true,
                                name: true,
                                loyaltyPointsBalance: true,
                            },
                        });
                        currentBalance = updatedUser.loyaltyPointsBalance;
                        rewardEmailRecipient = {
                            email: updatedUser.email,
                            name: updatedUser.name,
                        };
                        yield tx.order.update({
                            where: { id: existingTransaction.orderId },
                            data: { loyaltyPointsAwarded: pointsAwarded },
                        });
                    }
                }
                if (negativeStatuses.has(data.status) &&
                    existingTransaction.order.loyaltyPointsAwarded > 0) {
                    currentBalance = Math.max(0, existingTransaction.order.user.loyaltyPointsBalance -
                        existingTransaction.order.loyaltyPointsAwarded);
                    yield tx.user.update({
                        where: { id: existingTransaction.order.userId },
                        data: {
                            loyaltyPointsBalance: currentBalance,
                        },
                    });
                    yield tx.order.update({
                        where: { id: existingTransaction.orderId },
                        data: { loyaltyPointsAwarded: 0 },
                    });
                }
            }));
            if (pointsAwarded > 0 && rewardEmailRecipient) {
                try {
                    yield (0, sendEmail_1.default)({
                        to: rewardEmailRecipient.email,
                        subject: "Your loyalty points are ready",
                        text: `You earned ${pointsAwarded} loyalty points. Your current balance is ${currentBalance}.`,
                        html: (0, loyaltyPointsAwarded_1.default)({
                            name: rewardEmailRecipient.name,
                            pointsAwarded,
                            currentBalance,
                        }),
                    });
                }
                catch (error) {
                    this.logsService.error("Failed to send loyalty points email", {
                        transactionId: id,
                        orderId: existingTransaction.orderId,
                        userId: existingTransaction.order.userId,
                        error: error instanceof Error ? error.message : "Unknown email error",
                    });
                }
            }
            const transaction = yield this.transactionRepository.findById(id);
            return transaction;
        });
    }
    deleteTransaction(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.transactionRepository.deleteTransaction(id);
        });
    }
}
exports.TransactionService = TransactionService;

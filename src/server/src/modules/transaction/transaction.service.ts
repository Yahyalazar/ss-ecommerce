import { makeLogsService } from "../logs/logs.factory";
import { TransactionRepository } from "./transaction.repository";
import { TRANSACTION_STATUS } from "@prisma/client";
import AppError from "@/shared/errors/AppError";
import prisma from "@/infra/database/database.config";
import sendEmail from "@/shared/utils/sendEmail";
import loyaltyPointsAwardedTemplate from "@/shared/templates/loyaltyPointsAwarded";

export class TransactionService {
  private logsService = makeLogsService();
  constructor(private transactionRepository: TransactionRepository) { }

  private calculateLoyaltyPoints(amount: number) {
    const configuredRate = Number(process.env.LOYALTY_POINTS_RATE ?? "1");
    const rate =
      Number.isFinite(configuredRate) && configuredRate > 0
        ? configuredRate
        : 1;

    return Math.max(0, Math.floor(amount * rate));
  }

  async getAllTransactions() {
    const transactions = await this.transactionRepository.findMany();

    return transactions;
  }

  async getTransactionById(id: string) {
    const transaction = await this.transactionRepository.findById(id);
    return transaction;
  }
  async updateTransactionStatus(
    id: string,
    data: { status: TRANSACTION_STATUS }
  ) {
    const existingTransaction = await this.transactionRepository.findById(id);

    if (!existingTransaction) {
      throw new AppError(404, "Transaction not found");
    }

    const negativeStatuses = new Set<TRANSACTION_STATUS>([
      TRANSACTION_STATUS.CANCELED,
      TRANSACTION_STATUS.RETURNED,
      TRANSACTION_STATUS.REFUNDED,
    ]);

    let pointsAwarded = 0;
    let rewardEmailRecipient: { email: string; name: string } | null = null;
    let currentBalance = existingTransaction.order.user.loyaltyPointsBalance;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id },
        data: { status: data.status },
      });

      await tx.order.update({
        where: { id: existingTransaction.orderId },
        data: { status: data.status },
      });

      if (
        data.status === TRANSACTION_STATUS.DELIVERED &&
        existingTransaction.order.loyaltyPointsAwarded === 0
      ) {
        pointsAwarded = this.calculateLoyaltyPoints(
          existingTransaction.order.amount
        );

        if (pointsAwarded > 0) {
          const updatedUser = await tx.user.update({
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

          await tx.order.update({
            where: { id: existingTransaction.orderId },
            data: { loyaltyPointsAwarded: pointsAwarded },
          });
        }
      }

      if (
        negativeStatuses.has(data.status) &&
        existingTransaction.order.loyaltyPointsAwarded > 0
      ) {
        currentBalance = Math.max(
          0,
          existingTransaction.order.user.loyaltyPointsBalance -
            existingTransaction.order.loyaltyPointsAwarded
        );

        await tx.user.update({
          where: { id: existingTransaction.order.userId },
          data: {
            loyaltyPointsBalance: currentBalance,
          },
        });

        await tx.order.update({
          where: { id: existingTransaction.orderId },
          data: { loyaltyPointsAwarded: 0 },
        });
      }
    });

    if (pointsAwarded > 0 && rewardEmailRecipient) {
      try {
        await sendEmail({
          to: rewardEmailRecipient.email,
          subject: "Your loyalty points are ready",
          text: `You earned ${pointsAwarded} loyalty points. Your current balance is ${currentBalance}.`,
          html: loyaltyPointsAwardedTemplate({
            name: rewardEmailRecipient.name,
            pointsAwarded,
            currentBalance,
          }),
        });
      } catch (error) {
        this.logsService.error("Failed to send loyalty points email", {
          transactionId: id,
          orderId: existingTransaction.orderId,
          userId: existingTransaction.order.userId,
          error:
            error instanceof Error ? error.message : "Unknown email error",
        });
      }
    }

    const transaction = await this.transactionRepository.findById(id);

    return transaction;
  }
  async deleteTransaction(id: string) {
    await this.transactionRepository.deleteTransaction(id);
  }
}

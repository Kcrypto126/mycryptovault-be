import prisma from '../lib/prisma';
import { TransactionStatus, TransactionType } from '../generated/prisma';

export interface TransactionCreationAttrs {
  amount: string;
  type: TransactionType;
  status?: TransactionStatus;
  sender_id?: string;
  recipient_id?: string;
  description?: string;
}

export class TransactionModel {
  static async create(transactionData: TransactionCreationAttrs) {
    const {
      amount,
      type,
      status,
      sender_id,
      recipient_id,
      description
    } = transactionData;

    const amountNumber = parseFloat(amount);

    return prisma.transaction.create({
      data: {
        amount: amountNumber,
        type,
        status: type == TransactionType.WITHDRAWAL ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
        sender_id,
        recipient_id,
        description,
      }
    });
  }

  static async findMany(senderId: string, recipientId: string) {
    return prisma.transaction.findMany({
      where: {
        sender_id: senderId,
        recipient_id: recipientId
      }
    })
  }

  static async findAllTransaction() {
    return prisma.transaction.findMany();
  }

  static async findById(id: string) {
    return prisma.transaction.findUnique({
      where: {
        id
      }
    });
  }

  static async updateStatus(id: string, status: TransactionStatus) {
    return prisma.transaction.update({
      where: {
        id
      },
      data: {
        status
      }
    });
  }

}
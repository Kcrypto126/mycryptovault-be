import prisma from '../lib/prisma';
import { SupportStatus } from '../generated/prisma';

export interface SupportCreationAttrs {
  subject?: string;
  message?: string;
  status?: SupportStatus;
  replyMessage?: string;
  user_id?: string;
}

export class SupportModel {
  static async create(supportData: SupportCreationAttrs) {
    return prisma.support.create({
      data: {
        subject: supportData.subject,
        message: supportData.message,
        status: SupportStatus.INPROGRESS,
        user_id: supportData.user_id,
      }
    });
  }

  static async update(id: string, supportData: SupportCreationAttrs) {
    return prisma.support.update({
      where: { id },
      data: {
        status: supportData?.status,
        replyMessage: supportData?.replyMessage,
      },
    });
  }

  static async findById(id: string) {
    return prisma.support.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  static async findByUserId(userId: string) {
    return prisma.support.findMany({
      where: { user_id: userId },
      include: {
        user: true,
      },
    });
  }

  static async deleteById(id: string) {
    return prisma.support.delete({
      where: { id },
    });
  }

  static async findAll() {
    return prisma.support.findMany({
      include: {
        user: true,
      },
    });
  }
}
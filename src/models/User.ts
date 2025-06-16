import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { UserRole, UserStatus, VerifyStatus } from "../generated/prisma";

export interface UserCreationAttrs {
  email: string;
  password: string;
  role: UserRole;
  avatar: string;
  status?: UserStatus;
  verify?: VerifyStatus;
}

export interface UserUpdateAttrs {
  username?: string;
  full_name?: string;
  avatar?: string;
  password?: string;
  phone_number?: string;
  address?: string;
  government_id?: string;
  id_card?: string;
  bonus?: number;
  balance?: number;
  role?: UserRole;
  status?: UserStatus;
  verify?: VerifyStatus;
}

export interface ResetTokenAttrs {
  reset_token: string;
  reset_token_expiry: Date;
}

export class UserModel {
  static async create(userData: UserCreationAttrs) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    return prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role,
        avatar: userData.avatar,
        status:
          userData.role === UserRole.ADMIN
            ? UserStatus.ACTIVE
            : UserStatus.INACTIVE,
        verify:
          userData.role === UserRole.ADMIN
            ? VerifyStatus.VERIFIED
            : VerifyStatus.UNVERIFIED,
      },
    });
  }

  static async findAllUser() {
    return prisma.user.findMany();
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      include: {
        sentTransactions: true,
        receivedTransactions: true,
      },
    });
  }

  static async findByUserName(username: string) {
    return prisma.user.findUnique({
      where: {
        username,
      },
    });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        sentTransactions: true,
        receivedTransactions: true,
      },
    });
  }

  static async findByToken(token: string) {
    return prisma.user.findFirst({
      where: {
        reset_token: token,
        reset_token_expiry: { gt: new Date() },
      },
    });
  }

  static async comparePassword(
    candidatePassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  static async updateProfile(id: string, updates: Partial<UserUpdateAttrs>) {
    let hashedPassword;
    if (updates.password) {
      hashedPassword = await bcrypt.hash(updates.password, 10);
    }

    return prisma.user.update({
      where: {
        id,
      },
      data: {
        username: updates?.username,
        full_name: updates?.full_name,
        avatar: updates?.avatar,
        password: hashedPassword,
        phone_number: updates?.phone_number,
        address: updates?.address,
        government_id: updates?.government_id,
        id_card: updates?.id_card,
        bonus: updates?.bonus,
        balance: updates?.balance,
        role: updates?.role,
        status: updates?.status,
        verify: updates?.verify,
      },
    });
  }

  static async updateResetToken(
    email: string,
    updates: Partial<ResetTokenAttrs>
  ) {
    return prisma.user.update({
      where: {
        email,
      },
      data: {
        reset_token: updates.reset_token,
        reset_token_expiry: updates.reset_token_expiry,
      },
    });
  }

  static async updatePassword(email: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);

    return prisma.user.update({
      where: {
        email,
      },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      },
    });
  }

  static async deleteById(id: string) {
    return prisma.user.delete({
      where: {
        id,
      },
    });
  }
}

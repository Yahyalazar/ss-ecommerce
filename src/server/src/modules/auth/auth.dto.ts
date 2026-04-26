import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsNotEmpty({
    message: "Name is required",
  })
  @MinLength(3)
  name!: string;

  @IsEmail()
  @IsNotEmpty({
    message: "Email is required",
  })
  email!: string;

  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsIn(["USER", "ADMIN", "SUPERADMIN"])
  role?: string;

  @IsOptional()
  @IsBoolean()
  newsletterSubscribed?: boolean;
}

export class SigninDto {
  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;
}

export class VerifyEmailDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  emailVerificationToken!: string;
}

export class ResendVerificationEmailDto {
  @IsEmail()
  email!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  token!: string;

  @MinLength(6)
  newPassword!: string;
}

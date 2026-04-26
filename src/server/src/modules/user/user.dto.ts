import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: "Name must be a string" })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  email?: string;

  @IsOptional()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  @IsString()
  password?: string;

  @IsOptional()
  @IsIn(["user", "admin"], { message: "Role must be either 'user' or 'admin'" })
  role?: string;

  @IsOptional()
  @IsBoolean({ message: "Newsletter preference must be true or false" })
  newsletterSubscribed?: boolean;
}

export class UserIdDto {
  @IsNotEmpty({ message: "ID is required" })
  @IsString({ message: "ID must be a string" })
  id!: string;
}

export class UserEmailDto {
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email format" })
  email!: string;
}

export class CreateAdminDto {
  @IsNotEmpty({ message: "Name is required" })
  @IsString({ message: "Name must be a string" })
  @MinLength(3, { message: "Name must be at least 3 characters long" })
  name!: string;

  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email format" })
  email!: string;

  @IsNotEmpty({ message: "Password is required" })
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  @IsString({ message: "Password must be a string" })
  password!: string;
}

export class UpdateNewsletterPreferenceDto {
  @IsBoolean({ message: "Newsletter preference must be true or false" })
  newsletterSubscribed!: boolean;
}

export class SendNewsletterDto {
  @IsNotEmpty({ message: "Subject is required" })
  @IsString({ message: "Subject must be a string" })
  @MinLength(3, { message: "Subject must be at least 3 characters long" })
  @MaxLength(120, { message: "Subject must not exceed 120 characters" })
  subject!: string;

  @IsNotEmpty({ message: "Message is required" })
  @IsString({ message: "Message must be a string" })
  @MinLength(10, { message: "Message must be at least 10 characters long" })
  @MaxLength(5000, { message: "Message must not exceed 5000 characters" })
  message!: string;
}

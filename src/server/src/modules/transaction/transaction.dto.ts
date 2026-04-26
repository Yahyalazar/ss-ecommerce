import { IsEnum, IsNotEmpty } from "class-validator";
import { TRANSACTION_STATUS } from "@prisma/client";

export class UpdateTransactionStatusDto {
  @IsNotEmpty({ message: "Status is required" })
  @IsEnum(TRANSACTION_STATUS, {
    message:
      "Status must be one of: PENDING, PROCESSING, SHIPPED, IN_TRANSIT, DELIVERED, CANCELED, RETURNED, REFUNDED",
  })
  status!: TRANSACTION_STATUS;
}

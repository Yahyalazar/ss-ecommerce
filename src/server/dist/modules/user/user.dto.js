"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendNewsletterDto = exports.UpdateNewsletterPreferenceDto = exports.CreateAdminDto = exports.UserEmailDto = exports.UserIdDto = exports.UpdateUserDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateUserDto {
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: "Name must be a string" }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: "Invalid email format" }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MinLength)(6, { message: "Password must be at least 6 characters long" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(["user", "admin"], { message: "Role must be either 'user' or 'admin'" }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: "Newsletter preference must be true or false" }),
    __metadata("design:type", Boolean)
], UpdateUserDto.prototype, "newsletterSubscribed", void 0);
class UserIdDto {
}
exports.UserIdDto = UserIdDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "ID is required" }),
    (0, class_validator_1.IsString)({ message: "ID must be a string" }),
    __metadata("design:type", String)
], UserIdDto.prototype, "id", void 0);
class UserEmailDto {
}
exports.UserEmailDto = UserEmailDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "Email is required" }),
    (0, class_validator_1.IsEmail)({}, { message: "Invalid email format" }),
    __metadata("design:type", String)
], UserEmailDto.prototype, "email", void 0);
class CreateAdminDto {
}
exports.CreateAdminDto = CreateAdminDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "Name is required" }),
    (0, class_validator_1.IsString)({ message: "Name must be a string" }),
    (0, class_validator_1.MinLength)(3, { message: "Name must be at least 3 characters long" }),
    __metadata("design:type", String)
], CreateAdminDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "Email is required" }),
    (0, class_validator_1.IsEmail)({}, { message: "Invalid email format" }),
    __metadata("design:type", String)
], CreateAdminDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "Password is required" }),
    (0, class_validator_1.MinLength)(6, { message: "Password must be at least 6 characters long" }),
    (0, class_validator_1.IsString)({ message: "Password must be a string" }),
    __metadata("design:type", String)
], CreateAdminDto.prototype, "password", void 0);
class UpdateNewsletterPreferenceDto {
}
exports.UpdateNewsletterPreferenceDto = UpdateNewsletterPreferenceDto;
__decorate([
    (0, class_validator_1.IsBoolean)({ message: "Newsletter preference must be true or false" }),
    __metadata("design:type", Boolean)
], UpdateNewsletterPreferenceDto.prototype, "newsletterSubscribed", void 0);
class SendNewsletterDto {
}
exports.SendNewsletterDto = SendNewsletterDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "Subject is required" }),
    (0, class_validator_1.IsString)({ message: "Subject must be a string" }),
    (0, class_validator_1.MinLength)(3, { message: "Subject must be at least 3 characters long" }),
    (0, class_validator_1.MaxLength)(120, { message: "Subject must not exceed 120 characters" }),
    __metadata("design:type", String)
], SendNewsletterDto.prototype, "subject", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: "Message is required" }),
    (0, class_validator_1.IsString)({ message: "Message must be a string" }),
    (0, class_validator_1.MinLength)(10, { message: "Message must be at least 10 characters long" }),
    (0, class_validator_1.MaxLength)(5000, { message: "Message must not exceed 5000 characters" }),
    __metadata("design:type", String)
], SendNewsletterDto.prototype, "message", void 0);

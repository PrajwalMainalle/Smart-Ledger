const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const tenantPlugin = require("../plugins/tenantPlugin");

const UserSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    businessName: {
      type: String,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordTokenExpires: {
      type: Date,
    },
    resetPasswordOtp: {
      type: String,
    },
    resetPasswordOtpExpires: {
      type: Date,
    },
    profile: {
      shopName: { type: String, default: "" },
      gstNumber: { type: String, default: "" },
      businessAddress: { type: String, default: "" },
      logo: { type: String, default: "" }, // Base64 image data or URL
      businessDescription: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
      gstUpiId: { type: String, default: "" },
      nonGstUpiId: { type: String, default: "" },
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      accountHolderName: { type: String, default: "" },
    },
    role: {
      type: String,
      enum: ["admin", "staff", "read_only"],
      required: [true, "User role must be explicitly specified."],
    },
    gstBillingRule: {
      type: String,
      enum: ["prevent", "warn"],
      default: "warn",
    },
    creditReminderDays: {
      type: Number,
      default: 20,
    },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.plugin(tenantPlugin);

module.exports = mongoose.model("User", UserSchema);

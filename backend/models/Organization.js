const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OrganizationSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Organization/Business name is required"],
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    ownerName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    tagline: {
      type: String,
      trim: true,
    },
    // Billing & Plan Metadata (Architected now for Phase 2 integration)
    plan: {
      type: String,
      enum: ["free", "trial", "basic", "pro", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "cancelled", "expired", "suspended"],
      default: "active",
    },
    trialEndsAt: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    razorpayCustomerId: {
      type: String,
    },
    razorpaySubscriptionId: {
      type: String,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Organization", OrganizationSchema);

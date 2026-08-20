const mongoose = require("mongoose");

const InvoiceItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  purchasePrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  priceCategoryUsed: {
    type: String,
    default: "retail",
  },
  qty: {
    type: Number,
    required: true,
  },
  gstRate: {
    type: Number,
    required: true,
    default: 0,
  },
  sku: {
    type: String,
    required: false,
  },
  isManualItem: {
    type: Boolean,
    default: false,
  },
  excludeFromRevenue: {
    type: Boolean,
    default: false,
  },
  returnedQty: {
    type: Number,
    default: 0,
  },
  hsnCode: {
    type: String,
    default: "",
  },
});

const InvoiceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invoiceId: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    customerName: {
      type: String,
      default: "Walk-in Customer",
    },
    customerPhone: {
      type: String,
      default: "N/A",
    },
    customerType: {
      type: String,
      default: "Retail",
    },
    isGst: {
      type: Boolean,
      default: true,
    },
    salesType: {
      type: String,
      enum: ["GST", "Non-GST"],
      default: "GST",
    },
    items: [InvoiceItemSchema],
    taxableAmount: {
      type: Number,
      default: 0.0,
    },
    cgst: {
      type: Number,
      default: 0.0,
    },
    sgst: {
      type: Number,
      default: 0.0,
    },
    igst: {
      type: Number,
      default: 0.0,
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0.0,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0.0,
    },
    gstAmount: {
      type: Number,
      required: true,
      default: 0.0,
    },
    total: {
      type: Number,
      required: true,
      default: 0.0,
    },
    roundOff: {
      type: Number,
      default: 0.0,
    },
    revenueTotal: {
      type: Number,
      default: 0.0,
    },
    revenueTaxableAmount: {
      type: Number,
      default: 0.0,
    },
    revenueGstAmount: {
      type: Number,
      default: 0.0,
    },
    revenueCgst: {
      type: Number,
      default: 0.0,
    },
    revenueSgst: {
      type: Number,
      default: 0.0,
    },
    revenueIgst: {
      type: Number,
      default: 0.0,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Cheque", "Credit", "Split", "Exchange", "Government School Fund", "N/A"],
      default: "Cash",
    },
    govSchoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovSchool",
      default: null,
    },
    govGrantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovGrant",
      default: null,
    },
    govTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovTeacher",
      default: null,
    },
    govDetails: {
      schoolName: { type: String, default: "" },
      grantName: { type: String, default: "" },
      teacherName: { type: String, default: "" },
    },
    cashAmount: {
      type: Number,
      default: 0.0,
    },
    upiAmount: {
      type: Number,
      default: 0.0,
    },
    status: {
      type: String,
      enum: ["Paid", "Refunded", "Quotation"],
      default: "Paid",
    },
    isGovInvoice: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    govFundStatus: {
      type: String,
      enum: [
        "Draft Invoice",
        "Invoice Issued",
        "Government Approved",
        "Fund Active",
        "Partially Utilized",
        "Fully Utilized",
        "Closed",
        "Cancelled",
        "Expired"
      ],
      default: "Invoice Issued",
    },
    isQuotation: {
      type: Boolean,
      default: false,
    },
    isGstBilling: {
      type: Boolean,
      default: true,
    },
    pdfUrl: {
      type: String,
      default: "",
    },
    creditSettled: {
      type: Boolean,
      default: false,
    },
    settlementDate: {
      type: Date,
    },
    settlementMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Cheque"],
    },
    amountPaid: {
      type: Number,
      default: 0.0,
    },
    outstandingAmount: {
      type: Number,
      default: 0.0,
    },
    creditReminderDays: {
      type: Number,
      default: null,
    },
    isReturnExchange: {
      type: Boolean,
      default: false,
    },
    returnedItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: {
          type: String,
        },
        qty: {
          type: Number,
        },
        price: {
          type: Number,
        },
        originalInvoiceId: {
          type: String,
        },
        isDefective: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { timestamps: true }
);

// Ensure invoiceId is unique PER tenant
InvoiceSchema.index({ tenantId: 1, invoiceId: 1 }, { unique: true });

module.exports = mongoose.model("Invoice", InvoiceSchema);

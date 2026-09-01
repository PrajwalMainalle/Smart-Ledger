const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register a new tenant business
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { businessName, ownerName, email, mobileNumber, password } = req.body;

  if (!businessName || !ownerName || !email || !mobileNumber || !password) {
    return res.status(400).json({ message: "Please enter all required fields" });
  }

  try {
    // Check if user email already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    // Create user/tenant
    const user = await User.create({
      businessName,
      ownerName,
      email,
      mobileNumber,
      password,
      profile: {
        shopName: businessName, // default to business name
        mobileNumber: mobileNumber,
        email: email,
      }
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        businessName: user.businessName,
        ownerName: user.ownerName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        token: generateToken(user._id),
        profile: user.profile,
        gstBillingRule: user.gstBillingRule || "warn",
        creditReminderDays: user.creditReminderDays || 20,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
};

// @desc    Authenticate user and get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide email and password" });
  }

  try {
    // Check user email
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        businessName: user.businessName,
        ownerName: user.ownerName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        token: generateToken(user._id),
        profile: user.profile,
        gstBillingRule: user.gstBillingRule || "warn",
        creditReminderDays: user.creditReminderDays || 20,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
};

// @desc    Get tenant profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        businessName: user.businessName,
        ownerName: user.ownerName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        profile: user.profile,
        gstBillingRule: user.gstBillingRule || "warn",
        creditReminderDays: user.creditReminderDays || 20,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// @desc    Update tenant profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.businessName = req.body.businessName || user.businessName;
      user.ownerName = req.body.ownerName || user.ownerName;
      if (req.body.gstBillingRule !== undefined) {
        user.gstBillingRule = req.body.gstBillingRule;
      }
      if (req.body.creditReminderDays !== undefined) {
        const parsedDays = parseInt(req.body.creditReminderDays, 10);
        user.creditReminderDays = !isNaN(parsedDays) && parsedDays >= 1 ? parsedDays : 20;
      }

      // Update profile sub-fields
      const {
        shopName,
        gstNumber,
        businessAddress,
        logo,
        businessDescription,
        state,
        pincode,
        mobileNumber,
        gstUpiId,
        nonGstUpiId,
        bankName,
        accountNumber,
        ifscCode,
        accountHolderName,
      } = req.body;

      const currentProfile = user.profile || {};
      user.profile = {
        shopName: shopName !== undefined ? shopName : (currentProfile.shopName || ""),
        gstNumber: gstNumber !== undefined ? gstNumber : (currentProfile.gstNumber || ""),
        businessAddress: businessAddress !== undefined ? businessAddress : (currentProfile.businessAddress || ""),
        logo: logo !== undefined ? logo : (currentProfile.logo || ""),
        businessDescription: businessDescription !== undefined ? businessDescription : (currentProfile.businessDescription || ""),
        state: state !== undefined ? state : (currentProfile.state || ""),
        pincode: pincode !== undefined ? pincode : (currentProfile.pincode || ""),
        mobileNumber: mobileNumber !== undefined ? mobileNumber : (currentProfile.mobileNumber || user.mobileNumber || ""),
        email: email !== undefined ? email : (currentProfile.email || user.email || ""),
        gstUpiId: gstUpiId !== undefined ? gstUpiId : (currentProfile.gstUpiId || ""),
        nonGstUpiId: nonGstUpiId !== undefined ? nonGstUpiId : (currentProfile.nonGstUpiId || ""),
        bankName: bankName !== undefined ? bankName : (currentProfile.bankName || ""),
        accountNumber: accountNumber !== undefined ? accountNumber : (currentProfile.accountNumber || ""),
        ifscCode: ifscCode !== undefined ? ifscCode : (currentProfile.ifscCode || ""),
        accountHolderName: accountHolderName !== undefined ? accountHolderName : (currentProfile.accountHolderName || ""),
      };

      user.markModified("profile");

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        businessName: updatedUser.businessName,
        ownerName: updatedUser.ownerName,
        email: updatedUser.email,
        mobileNumber: updatedUser.mobileNumber,
        profile: updatedUser.profile,
        gstBillingRule: updatedUser.gstBillingRule || "warn",
        creditReminderDays: updatedUser.creditReminderDays || 20,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating profile", error: error.message });
  }
};

const sendResetEmail = async (email, otp, token) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER || "test@example.com",
      pass: process.env.EMAIL_PASS || "password",
    },
  });

  const resetUrl = `http://localhost:5173/reset-password?token=${token}&email=${email}`;

  const mailOptions = {
    from: `"SmartLedger Security" <${process.env.EMAIL_USER || "no-reply@smartledger.com"}>`,
    to: email,
    subject: "Reset Your SmartLedger Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #ea580c; text-align: center;">SmartLedger Security</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password for your SmartLedger tenant account. You can reset your password using the OTP or the direct link below.</p>
        
        <div style="margin: 25px 0; padding: 15px; background-color: #f8fafc; border-left: 4px solid #ea580c; border-radius: 4px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">One-Time OTP Code</p>
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #0f172a; font-family: monospace;">${otp}</span>
          <p style="margin: 10px 0 0 0; font-size: 11px; color: #94a3b8;">This code is valid for 15 minutes.</p>
        </div>

        <p style="text-align: center; margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password via Link</a>
        </p>

        <p style="font-size: 12px; color: #64748b; margin-top: 30px;">
          If you did not request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 10px; color: #94a3b8; text-align: center;">
          &copy; ${new Date().getFullYear()} SmartLedger POS & Inventory SaaS. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Reset email sent: ${info.messageId}`);
    if (transporter.options.host === "smtp.ethereal.email") {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (err) {
    console.error("Error sending reset password email: ", err.message);
  }
};

// @desc    Request password reset OTP and token
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Please provide your email address" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No account with that email address exists." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(20).toString("hex");
    const expiry = Date.now() + 15 * 60 * 1000;

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = expiry;
    user.resetPasswordToken = token;
    user.resetPasswordTokenExpires = expiry;

    await user.save();

    // Send email asynchronously
    sendResetEmail(email, otp, token);

    console.log(`========================================`);
    console.log(`[PASSWORD RESET DEV ASSIST]`);
    console.log(`Email: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Token: ${token}`);
    console.log(`Reset Link: http://localhost:5173/reset-password?token=${token}&email=${email}`);
    console.log(`========================================`);

    const devData = process.env.NODE_ENV !== "production" ? { otp, token } : {};

    res.json({
      message: "Password reset OTP and link have been sent to your email address.",
      ...devData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error requesting password reset", error: error.message });
  }
};

// @desc    Reset password using OTP or Token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  const { email, password, confirmPassword, otp, token } = req.body;

  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ message: "Please enter all required fields" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  // Strong password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let isValid = false;

    if (token) {
      if (user.resetPasswordToken === token && user.resetPasswordTokenExpires > Date.now()) {
        isValid = true;
      }
    } else if (otp) {
      if (user.resetPasswordOtp === otp && user.resetPasswordOtpExpires > Date.now()) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ 
        message: "The password reset OTP or link is invalid or has expired. Please request a new one." 
      });
    }

    user.password = password;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpires = undefined;

    await user.save();

    res.json({ message: "Your password has been successfully reset. Redirecting to login..." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error resetting password", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
};

/**
 * Corporate Tenant Configuration & Dynamic Branding Helper
 * Resolves shop branding per client deployment dynamically without hardcoded fallback values.
 */

export const getShopName = (user) => {
  if (!user) return "Smart Ledger";
  return (
    user.profile?.shopName?.trim() ||
    user.businessName?.trim() ||
    user.companyName?.trim() ||
    "Smart Ledger"
  );
};

export const getWhatsAppFooter = (user) => {
  const shopName = getShopName(user);
  return `Thank you for doing business with ${shopName}! 🙏`;
};

export const getAppTitle = (user) => {
  const shopName = getShopName(user);
  return shopName === "Smart Ledger" ? "Smart Ledger" : `${shopName} - Smart Ledger`;
};

export const getShopDetails = (user) => {
  return {
    shopName: getShopName(user),
    gstNumber: user?.profile?.gstNumber || "",
    businessAddress: user?.profile?.businessAddress || "",
    mobileNumber: user?.profile?.mobileNumber || user?.mobileNumber || "",
    email: user?.email || "",
    logo: user?.profile?.logo || "",
    bankName: user?.profile?.bankName || "",
    accountNumber: user?.profile?.accountNumber || "",
    ifscCode: user?.profile?.ifscCode || "",
    upiId: user?.profile?.gstUpiId || user?.profile?.nonGstUpiId || "",
  };
};

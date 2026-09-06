const jwt = require("jsonwebtoken");

const SUPERADMIN_JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || (process.env.JWT_SECRET + "_superadmin_portal_secret_key");

const protectSuperadmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized as Superadmin, no token provided" });
  }

  try {
    const decoded = jwt.verify(token, SUPERADMIN_JWT_SECRET);
    if (!decoded.isSuperAdminPortal) {
      return res.status(403).json({ message: "Forbidden: Not a superadmin portal token" });
    }
    req.superadmin = decoded;
    next();
  } catch (error) {
    console.error("Superadmin Auth Verification Error:", error.message);
    return res.status(401).json({ message: "Not authorized as Superadmin, token invalid or expired" });
  }
};

module.exports = { protectSuperadmin, SUPERADMIN_JWT_SECRET };

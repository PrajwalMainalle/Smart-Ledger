const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { runWithOrgId } = require("./tenantContext");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token, exclude password
      req.user = await User.findById(decoded.id).select("-password").setOptions({ bypassTenantFilter: true });

      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user account not found" });
      }

      req.organizationId = req.user.organizationId || decoded.organizationId;
      req.isImpersonating = !!decoded.isImpersonating;

      runWithOrgId(req.organizationId, () => {
        next();
      });
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const userRole = req.user.role || "admin";
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        message: `Forbidden: User role '${userRole}' is not authorized to perform this action.`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };

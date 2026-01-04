const requireAuth = require("./auth");

const verifyAdmin = async (req, res, next) => {
  // First check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized: Please log in" });
  }

  // Check if user is admin
  if (req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ 
      message: "Forbidden: Admin access required",
      authenticated: true,
      role: req.user.role 
    });
  }
};

module.exports = verifyAdmin;

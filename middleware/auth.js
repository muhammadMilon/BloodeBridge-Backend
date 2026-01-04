// Session-based authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    // User is authenticated, attach user to request for convenience
    req.user = req.session.user;
    next();
  } else {
    return res.status(401).json({ 
      message: "Unauthorized: Please log in",
      authenticated: false 
    });
  }
};

module.exports = requireAuth;

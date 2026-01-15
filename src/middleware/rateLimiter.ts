import rateLimit from "express-rate-limit";

// genral API Rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 100, // 15 minutes
  max: 100, //limit to 100 reqs per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
});

// Chat rate limiter
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit AI calls to 10 per minute
  message: "Too many AI requests, please try again later.",
});

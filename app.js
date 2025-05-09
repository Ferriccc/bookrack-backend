const express = require("express");
const passport = require("passport");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");

require("dotenv").config();
const authRoutes = require("./routes/auth");
const searchRoutes = require("./routes/search");
const fetchRoutes = require("./routes/fetch");
const wishlistRoutes = require("./routes/wishlist");
const boughtRoutes = require("./routes/bought");
const suggestRoutes = require("./routes/suggest");
const chatRoutes = require("./routes/chat");

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cookieParser());
app.use(
  session({
    secret: "bookrack-secret",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api", authRoutes);
app.use("/api", searchRoutes);
app.use("/api", fetchRoutes);
app.use("/api", wishlistRoutes);
app.use("/api", boughtRoutes);
app.use("/api", suggestRoutes);
app.use("/api", chatRoutes);

// A protected route
const { authenticateToken } = require("./middlewares/authMiddleware");
app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server running at port: ${PORT}`);
});

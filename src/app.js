const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const { attachUser } = require("./middleware/auth");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachUser);

// API routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);

// Static assets and auth pages
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("/login", (req, res) => {
  if (req.user) {
    res.redirect("/account");
    return;
  }
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/signup", (req, res) => {
  if (req.user) {
    res.redirect("/account");
    return;
  }
  res.sendFile(path.join(publicDir, "signup.html"));
});

app.get("/account", (req, res) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  res.sendFile(path.join(publicDir, "account.html"));
});

// Root endpoint
app.get("/", (req, res) => {
  res.redirect("/login");
});

module.exports = app;

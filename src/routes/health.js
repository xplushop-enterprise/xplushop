const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "XPLUSHOP API",
    message: "LEVEL UP YOUR GAME"
  });
});

module.exports = router;

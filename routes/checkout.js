const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const paypal = require("@paypal/checkout-server-sdk");
const paypalClient = require("../config/paypal");
const { Pinecone } = require("@pinecone-database/pinecone");
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});
const index = pc.index("booksy");

// Get cart total and create PayPal order
router.post("/initiate-checkout", authenticateToken, async (req, res) => {
  try {
    const user_email = req.user.emails[0].value;

    if (!user_email) {
      return res.status(400).json({ message: "User email is required" });
    }

    try {
      const response = await index.namespace("users").searchRecords({
        query: {
          inputs: { text: user_email },
          topK: 1e4,
          filter: {
            user_email: user_email,
            isCarted: true,
          },
        },
      });
      const result = response.result.hits.map((hit) => hit.fields);

      let total = 0;
      for (const item of result) {
        total += parseFloat(item.price);
      }

      console.log(total);

      // Create PayPal order
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: total.toFixed(2),
            },
          },
        ],
      });

      const order = await paypalClient.execute(request);
      res.json({
        orderId: order.result.id,
        total: total.toFixed(2),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to initiate checkout" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to initiate checkout" });
  }
});

// Handle successful payment and update book status
router.post(
  "/complete-checkout/:orderId",
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      console.log(orderId);

      // Verify PayPal payment
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      const capture = await paypalClient.execute(request);

      const user_email = req.user.emails[0].value;

      if (!user_email) {
        return res.status(400).json({ message: "User email is required" });
      }

      if (capture.result.status === "COMPLETED") {
        // Update book status in database
        const response = await index.namespace("users").searchRecords({
          query: {
            inputs: { text: user_email },
            topK: 1e4,
            filter: {
              user_email: user_email,
              isCarted: true,
            },
          },
        });
        const result = response.result.hits.map((hit) => hit.fields);

        for (const item of result) {
          await index.namespace("users").update({
            id: `${user_email}#${item.book_id}`,
            metadata: {
              isCarted: false,
              isBought: true,
            },
          });
        }

        res.json({
          success: true,
          message: "Payment successful and books moved to bought",
          orderDetails: capture.result,
        });
      } else {
        res.status(400).json({ error: "Payment not completed" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to complete checkout" });
    }
  }
);

module.exports = router;

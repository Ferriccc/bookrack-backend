const express = require("express");
const { Pinecone } = require("@pinecone-database/pinecone");
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});
const index = pc.index("booksy");
const { authenticateToken } = require("../middlewares/authMiddleware");
const router = express.Router();

router.get("/fetch/wishlist", authenticateToken, async (req, res) => {
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
          isWishlisted: true,
        },
      },
    });
    const result = response.result.hits.map((hit) => hit.fields);

    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ message: user_email + " not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/fetch/bought", authenticateToken, async (req, res) => {
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
          isBought: true,
        },
      },
    });
    const result = response.result.hits.map((hit) => hit.fields);

    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ message: user_email + " not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/fetch/book/:book_id", async (req, res) => {
  const book_id = req.params.book_id;

  if (!book_id) {
    return res.status(400).json({ message: "Book ID is required" });
  }

  try {
    const response = await index.namespace("books").query({
      id: book_id,
      includeMetadata: true,
      includeValues: false,
      topK: 1,
    });
    const result = response.matches[0].metadata;

    if (result) {
      result.id = book_id;
      res.status(200).json(result);
    } else {
      res.status(404).json({ message: "Book not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

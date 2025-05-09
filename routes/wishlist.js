const express = require("express");
const { Pinecone } = require("@pinecone-database/pinecone");
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});
const index = pc.index("booksy");
const { authenticateToken } = require("../middlewares/authMiddleware");
const router = express.Router();

router.get("/add/wishlist/:book_id", authenticateToken, async (req, res) => {
  const user_email = req.user.emails[0].value;
  const book_id = req.params.book_id;

  if (!user_email || !book_id) {
    return res
      .status(400)
      .json({ message: "User email and book ID are required" });
  }

  try {
    const book_response = await index.namespace("books").query({
      id: book_id,
      topK: 1,
      includeMetadata: true,
      includeValues: false,
    });

    if (!book_response.matches.length) {
      return res.status(404).json({ message: "Book not found" });
    }
    const book_details = book_response.matches[0].metadata;

    const user_response = await index.namespace("users").query({
      id: `${user_email}#${book_id}`,
      topK: 1,
      includeMetadata: true,
      includeValues: false,
    });

    const exsistingRecord = user_response.matches.length
      ? user_response.matches[0].metadata
      : null;

    const isCarted = exsistingRecord ? exsistingRecord.isCarted : false;
    const isPurchased = exsistingRecord ? exsistingRecord.isPurchased : false;
    const isWishlisted = true;

    const result = await index.namespace("users").upsertRecords([
      {
        id: `${user_email}#${book_id}`,
        user_email: user_email,
        book_id: book_id,
        author: book_details.author,
        description: book_details.description,
        image_url: book_details.image_url,
        price: book_details.price,
        rating: book_details.rating,
        review_count: book_details.review_count,
        tags: book_details.tags,
        title: book_details.title,
        isCarted: isCarted,
        isPurchased: isPurchased,
        isWishlisted: isWishlisted,
        source_text: book_details.source_text,
      },
    ]);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/remove/wishlist/:book_id", authenticateToken, async (req, res) => {
  const user_email = req.user.emails[0].value;
  const book_id = req.params.book_id;

  if (!user_email || !book_id) {
    return res
      .status(400)
      .json({ message: "User email and book ID are required" });
  }

  try {
    const book_response = await index.namespace("books").query({
      id: book_id,
      topK: 1,
      includeMetadata: true,
      includeValues: false,
    });

    if (!book_response.matches.length) {
      return res.status(404).json({ message: "Book not found" });
    }
    const book_details = book_response.matches[0].metadata;

    const user_response = await index.namespace("users").query({
      id: `${user_email}#${book_id}`,
      topK: 1,
      includeMetadata: true,
      includeValues: false,
    });

    const exsistingRecord = user_response.matches.length
      ? user_response.matches[0].metadata
      : null;

    const isCarted = exsistingRecord ? exsistingRecord.isCarted : false;
    const isPurchased = exsistingRecord ? exsistingRecord.isPurchased : false;
    const isWishlisted = false;

    const result = await index.namespace("users").upsertRecords([
      {
        id: `${user_email}#${book_id}`,
        user_email: user_email,
        book_id: book_id,
        author: book_details.author,
        description: book_details.description,
        image_url: book_details.image_url,
        price: book_details.price,
        rating: book_details.rating,
        review_count: book_details.review_count,
        tags: book_details.tags,
        title: book_details.title,
        isCarted: isCarted,
        isPurchased: isPurchased,
        isWishlisted: isWishlisted,
        source_text: book_details.source_text,
      },
    ]);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

const express = require("express");
const { Pinecone } = require("@pinecone-database/pinecone");
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});
const index = pc.index("booksy");
const { authenticateToken } = require("../middlewares/authMiddleware");
const router = express.Router();

router.get("/suggest", authenticateToken, async (req, res) => {
  const user_email = req.user.emails[0].value;

  if (!user_email) {
    return res.status(400).json({ message: "User email is required" });
  }

  try {
    const knownBooks_response = await index.namespace("users").searchRecords({
      query: {
        inputs: { text: user_email },
        topK: 1e4,
        filter: {
          user_email: user_email,
          $or: [{ isWishlisted: true }, { isBought: true }, { isCarted: true }],
        },
      },
    });
    const knownBooks = knownBooks_response.result.hits.map((hit) => hit.fields);
    const excludedBooks_titles = knownBooks.map((book) => book.title);

    var search_string = knownBooks.map((book) => book.source_text).join(" ");
    if (search_string.length === 0) {
      search_string = user_email;
    }

    const suggestedBooks_response = await index
      .namespace("books")
      .searchRecords({
        query: {
          inputs: { text: search_string },
          topK: 10,
          filter: { title: { $nin: excludedBooks_titles } },
        },
      });

    const suggestedBooks = suggestedBooks_response.result.hits.map((hit) => {
      hit.fields.id = hit._id;
      return hit.fields;
    });

    if (suggestedBooks) {
      res.status(200).json(suggestedBooks);
    } else {
      res.status(404).json({ message: "No suggestions found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

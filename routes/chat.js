const express = require("express");
const { Pinecone } = require("@pinecone-database/pinecone");
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});
const index = pc.index("booksy");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });
const router = express.Router();

router.get(
  "/chat/query/:query/book_id{/:book_id}",
  authenticateToken,
  async (req, res) => {
    const user_email = req.user.emails[0].value;
    const { query, book_id } = req.params;

    if (!user_email) {
      return res.status(400).json({ message: "User email is required" });
    }

    let user_context = {
      wishlist: null,
      bought: null,
      cart: null,
    };
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
        user_context.wishlist = result;
      }
    } catch (error) {
      console.log("Error fetching user context: ", error);
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
        user_context.bought = result;
      }
    } catch (error) {
      console.log("Error fetching user context: ", error);
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

      if (result) {
        user_context.cart = result;
      }
    } catch (error) {
      console.log("Error fetching user context: ", error);
    }

    let book_context = null;
    if (book_id) {
      try {
        const response = await index.namespace("books").fetch([book_id]);
        const result = response.records[book_id].metadata;

        if (result) {
          book_context = result;
        }
      } catch (error) {
        console.log("Error fetching book context: ", error);
      }
    }

    let query_context = null;
    try {
      const response = await index.namespace("books").searchRecords({
        query: {
          topK: 10,
          inputs: { text: query },
        },
      });

      const result = response.result.hits.map((hit) => {
        hit.fields.id = hit._id;
        return hit.fields;
      });

      if (result) {
        query_context = result;
      }
    } catch (error) {
      console.log("Error fetching query context: ", error);
    }

    const prompt = `
    You are a helpful assistant that can answer questions about ecommerce website for books.
    You are given following details from RAG:
    A user context, user context contains the user's wishlist and bought books.
    A book context, book context contains the book's metadata in case user is on some book's page.
    A query context, query context contains the top 10 books that are most similar to the query.
    You need to answer the question based on the user context, book context and query context and the actual query itself.
    Also in case user is asking about a book, you should summarize that book getting information from web using book's title.

    QUERY: ${JSON.stringify(query)}
    USER CONTEXT: ${JSON.stringify(user_context)}
    BOOK CONTEXT: ${JSON.stringify(book_context)}
    QUERY CONTEXT: ${JSON.stringify(query_context)}

    Also when you are suggesting books, make sure to use web to summarize the books in 2-3 sentences.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      const result = response.candidates[0].content.parts[0].text;

      res.status(200).json({
        response: result,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

module.exports = router;

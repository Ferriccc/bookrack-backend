const express = require("express");
const { Pinecone } = require("@pinecone-database/pinecone");
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});
const index = pc.index("booksy");
const router = express.Router();

router.get(
  "/search{/:search_string}/upper_price{/:phigh}",
  async (req, res) => {
    const searchString = req.params.search_string || "";
    const priceLow = parseFloat(req.params.plow) || 0;
    const priceHigh = parseFloat(req.params.phigh) || 1e9;
    const limit = parseInt(req.params.limit) || 1e3;

    try {
      const response = await index.namespace("books").searchRecords({
        query: {
          topK: limit,
          inputs: { text: searchString },
          filter: {
            price: { $gte: priceLow, $lte: priceHigh },
          },
        },
      });

      const result = response.result.hits.map((hit) => {
        hit.fields.id = hit._id;
        return hit.fields;
      });

      if (result) {
        res.status(200).json(result);
      } else {
        res.status(404).json({ message: "No results found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;

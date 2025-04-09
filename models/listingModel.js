const mongoose = require("mongoose");
const Review = require("./reviewModel.js");

const listingSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  image: {
    url: String,
    filename: String
  },
  price: {
    type: Number,
    min: 100,
  },
  location: {
    type: String,
  },
  country: {
    type: String,
  },
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review"
    }
  ],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
});

listingSchema.post("findOneAndDelete", async (Listing) => {
  if (Listing) {
    await Review.deleteMany({_id : {$in: Listing.reviews}})
  } else {
    console.log("done")
  }
})

const Listing = mongoose.model("Listing", listingSchema);

module.exports = {Listing};
const {Listing} = require("../models/listingModel")
const Review = require("../models/reviewModel");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("../schemaValidation.js");


const isLogin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Login required!");
        return res.redirect("/login");
    }
    next();
}

const isSameUser = async (req, res, next) => {
    let { id } = req.params;

    let editData = await Listing.findById(id);
    if (!editData.owner.equals(res.locals.auth._id)) {
      req.flash("error", "You are not authorized to delete this listing.")
      return res.redirect("/wonderlust");
    }
    next();
}

const isSameAuthor = async (req, res, next) => {
    let { id, reviewId } = req.params;

    let review = await Review.findById(reviewId);
    if (!review.author.equals(res.locals.auth._id)) {
      req.flash("error", "You are not authorized to delete this review.")
      return res.redirect("/wonderlust");
    }
    next();
}

const schemaValidate = (req, res, next) => {
  let result = listingSchema.validate(req.body);

  if (result.error) {
    throw new ExpressError(400, "Required data missing");
  } else {
    next();
  }
};

const reviewValidatie = (req, res, next) => {
  let result = reviewSchema.validate(req.body);

  if (result.error) {
    throw new ExpressError(400, result.error);
  } else {
    next();
  }
};

module.exports = { isLogin, isSameUser, isSameAuthor, reviewValidatie, schemaValidate};
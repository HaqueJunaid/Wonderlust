require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const { Listing } = require("./models/listingModel.js");
const Review = require("./models/reviewModel.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const wrapAsync = require("./utils/wrapAsync.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/userModel.js");
const {isLogin, isSameUser, isSameAuthor, reviewValidatie, schemaValidate} = require("./middlewares/m1.js");
const connectToDb = require("./utils/connectToDB.js");
const multer = require("multer");
const {storage} = require("./cloudinaryConfig.js");
const upload = multer({ storage });

// -------------- MONGO CONNECTION --------------
connectToDb();
// ----------------------------------------------

const store = MongoStore.create({
  secret: process.env.SECRET,
  mongoUrl: process.env.ATLAS_DB,
  touchAfter: 24*3600,
})

const sessionOption = {
  store,
  secret: "veryveryhypersecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

// Requires
const port = 8080;
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.engine("ejs", ejsMate);
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "/public")));

app.use(session(sessionOption));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// --------- Middleware for flash
app.use((req, res, next) => {
  res.locals.auth = req.user;
  res.locals.successMsg = req.flash("success");
  res.locals.errorMsg = req.flash("error");
  next();
});

// -------------- ROUTES --------------

// ---> SignUp / GET Route
app.get(
  "/signUp",
  wrapAsync(async (req, res) => {
    res.render("./users/signUp.ejs");
  })
);

// ---> SignUp / POST Route
app.post(
  "/signup",
  wrapAsync(async (req, res, next) => {
    try {
      let { username, email, password } = req.body;
      let newUser = new User({
        email,
        username,
      });
      let registerdUser = await User.register(newUser, password);
      req.login(registerdUser, (err) => {
        if (err) {
          return next(err);
        } else {
          req.flash("success", "Welcome to wonderlust!");
          res.status(200).redirect("/wonderlust");
        }
      });
    } catch (e) {
      req.flash("error", e.message);
      res.status(200).redirect("/signup");
    }
  })
);

// ---> Login / GET Route
app.get("/login", (req, res) => {
  res.render("./users/login.ejs");
});

// ---> Login / POST Route
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  wrapAsync(async (req, res) => {
    req.flash("success", "Login sccessfully!");
    res.redirect("/wonderlust");
  })
);

// ---> Logout / GET Route
app.get(
  "/logout",
  wrapAsync(async (req, res) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      } else {
        req.flash("success", "Logout Successfully!");
        res.redirect("/wonderlust");
      }
    });
  })
);

// ---> Index / Listing Route
app.get(
  "/wonderlust",
  wrapAsync(async (req, res) => {
    let listingData = await Listing.find({});
    res.status(200).render("./listings/listing.ejs", { listingData });
  })
);

// ---> Remove / Delete Route
app.delete(
  "/wonderlust/:id",
  isLogin,
  isSameUser,
  wrapAsync(async (req, res) => {
    let { id } = req.params;

    let result = await Listing.findByIdAndDelete(id)

    if (!result) {
      req.flash("error", "Unable to delete listing.");
      res.status(400).redirect("/wonderlust");
    }
    req.flash("success", "Listing deleted successfully!");
    res.status(200).redirect("/wonderlust");
  })
);

// ---> Create / Get Route
app.get("/wonderlust/new", isLogin, (req, res) => {
  res.status(200).render("./listings/new.ejs");
});

// ---> Create / Post route
app.post(
  "/wonderlust/new",
  isLogin,
  upload.single("Listing[image]"),
  schemaValidate,
  wrapAsync(async (req, res, next) => {
    let body = req.body.Listing;
    let {path, filename} = req.file;
    let newListing = new Listing(body);
    newListing.owner = req.user._id;
    newListing.image.url = path;
    newListing.image.filename = filename;
    await newListing.save();
    req.flash("success", "New listing created successfully!");
    res.status(201).redirect("/wonderlust");
  })
);

// ---> SHOW / Info Route
app.get(
  "/wonderlust/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let infoData = await Listing.findById(id).populate({path: "reviews", populate: {path: "author"}}).populate("owner");
    if (infoData) {
      res.status(200).render("./listings/show.ejs", { infoData });
    } else {
      req.flash("error", "Unable to get listing!");
      res.redirect("/wonderlust");
    }
  })
);

// ---> Edit / Get Route
app.get(
  "/wonderlust/edit/:id",
  isLogin,
  isSameUser,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let editData = await Listing.findById(id).populate("owner");

    if (editData) {
      res.status(200).render("./listings/edit.ejs", { editData });
    } else {
      req.flash("error", "Unable to get listing!");
      res.redirect("/wonderlust");
    }
  })
);

// ---> Edit / Patch route
app.patch(
  "/wonderlust/edit/:id",
  isLogin,
  upload.single("image"),
  isSameUser,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let body = req.body;
    let {path, filename} = req.file;
    console.log(path, filename);

    let result = await Listing.findByIdAndUpdate(id, body);
    result.image.url = path;
    result.image.filename = filename;
    result.save();

    if (result) {
      req.flash("success", "Listing altered successfully!");
      res.status(200).redirect("/wonderlust");
    } else {
      res.send(204).send("Not Edited");
    }
  })
);
// ------------------------------------

// ----------- ADD REVIEW -----------

app.post(
  "/listings/:id/review",
  isLogin,
  reviewValidatie,
  wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);

    let newReview = new Review(req.body.review);

    newReview.author = req.user._id;
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    req.flash("success", "Review added successfully!");

    res.redirect(`/wonderlust/${req.params.id}`);
  })
);

app.delete(
  "/wonderlust/:id/review/:reviewId",
  isLogin,
  isSameAuthor,
  wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review deleted successfully!");

    res.redirect(`/wonderlust/${id}`);
  })
);

// ----------------------------------

app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  let { status = 400, message = "Some error" } = err;
  res.status(status).render("Error", { status, message });
});

// Starting server
app.listen(port, () => {
  console.log("Running at port", port);
});

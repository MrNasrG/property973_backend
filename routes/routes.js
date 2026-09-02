const AuthController = require("../controllers/AuthController");
const EmailTestController = require("../controllers/EmailTestController");
const DashboardController = require("../controllers/DashboardController");
const UserAdminController = require("../controllers/UserAdminController");
const UserApiController = require("../controllers/UserApiController");
const LocationController = require("../controllers/LocationController");
const AddListingController = require("../controllers/AddListingController");
const ListingController = require("../controllers/ListingController");
const ListingAdminController = require("../controllers/ListingAdminController");
const FavouriteController = require("../controllers/FavouriteController");
const { requireJwtAccess, optionalJwtAccess } = require("../middleware/requireJwtAccess");
const {
  uploadListingPhotos,
  handleMulterError,
} = require("../middleware/listingPhotoUpload");

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userid) {
    res.locals.userLogin = true;
    res.locals.userid = req.session.userid;
    res.locals.username = req.session.username;
    res.locals.useremail = req.session.useremail;
    return next();
  }
  res.locals.userLogin = false;
  return next();
};

const requireLogin = (req, res, next) => {
  if (!req.session || !req.session.userid) {
    return res.redirect("/login");
  }
  return next();
};

module.exports = function (app) {
  app.use(isAuthenticated);

  // Auth API (JWT + mobile OTP)
  app.post("/auth/otp/send", AuthController.authOtpSend);
  app.post("/auth/otp/verify", AuthController.authOtpVerify);
  app.post("/auth/login", AuthController.authLogin);
  app.post("/auth/register", AuthController.authRegister);
  app.post("/auth/refresh", AuthController.authRefresh);
  app.post("/auth/logout", AuthController.authLogout);
  app.get("/auth/me", AuthController.authMe);
  app.get("/auth/otp/copy", AuthController.authOtpCopyPage);
  app.post("/auth/forgot-password", AuthController.authForgotPassword);
  app.post(
    "/auth/forgot-password/verify-otp",
    AuthController.authForgotPasswordVerifyOtp,
  );
  app.post("/auth/reset-password", AuthController.authResetPassword);
  app.get("/auth/reset-password/verify", AuthController.authVerifyResetToken);

  // Email test (dev / EMAIL_TEST_ENABLED)
  app.get("/api/email/status", EmailTestController.emailStatus);
  app.post("/api/email/test", EmailTestController.sendTest);

  // Users API (JWT)
  app.get("/api/users", requireJwtAccess, UserApiController.listUsers);
  app.patch("/api/users/:id", requireJwtAccess, UserApiController.updateUser);

  // Location reference API
  app.get("/api/countries", LocationController.listCountries);
  app.get("/api/states", LocationController.listStates);
  app.get("/api/cities", LocationController.listCities);

  // Add listing flow (role + listing kind — mirrors AddListingFlow.jsx)
  app.get("/api/add-listing/options", AddListingController.getOptions);
  app.get(
    "/api/add-listing/preference",
    requireJwtAccess,
    AddListingController.getPreference,
  );
  app.put(
    "/api/add-listing/preference",
    requireJwtAccess,
    AddListingController.savePreference,
  );

  // Public property listings (homepage — optional auth for isFavourite)
  app.get(
    "/listings/public",
    optionalJwtAccess,
    ListingController.listPublicListings,
  );
  app.get(
    "/listings/public/:id",
    optionalJwtAccess,
    ListingController.getPublicListing,
  );

  // Favourites (wishlist) — JWT required
  app.get(
    "/favourites/ids",
    requireJwtAccess,
    FavouriteController.listFavouriteIds,
  );
  app.get("/favourites", requireJwtAccess, FavouriteController.listFavourites);
  app.post("/favourites", requireJwtAccess, FavouriteController.addFavourite);
  app.delete(
    "/favourites/:listingId",
    requireJwtAccess,
    FavouriteController.removeFavourite,
  );

  // Owner property listings
  app.post(
    "/listings",
    requireJwtAccess,
    uploadListingPhotos,
    handleMulterError,
    ListingController.createListing,
  );
  app.get("/listings", requireJwtAccess, ListingController.listListings);
  app.get("/listings/:id", requireJwtAccess, ListingController.getListing);
  app.patch("/listings/:id", requireJwtAccess, ListingController.updateListing);
  app.delete("/listings/:id", requireJwtAccess, ListingController.deleteListing);
  app.post(
    "/listings/:id/photos",
    requireJwtAccess,
    uploadListingPhotos,
    handleMulterError,
    ListingController.uploadPhotos,
  );
  app.delete(
    "/listings/:id/photos/:photoId",
    requireJwtAccess,
    ListingController.deletePhoto,
  );

  // Auth routes
  app.get("/", (req, res) => res.redirect("/login"));
  app.get("/login", AuthController.login);
  app.post("/login", AuthController.validate);
  app.get("/logout", AuthController.logout);
  app.get("/register", (req, res) => {
    if (res.locals.userLogin) return res.redirect("/index");
    res.render("auth/register", {
      layout: "layout/layout-without-nav",
      title: "Register",
    });
  });
  app.post("/register", AuthController.signup);
  app.get("/forgotpassword", (req, res) => {
    res.render("auth/forgot-password", {
      layout: "layout/layout-without-nav",
      title: "Forgot Password",
    });
  });
  app.post("/forgotpassword", AuthController.forgotpassword);
  app.get("/resetpassword", AuthController.resetpswdview);
  app.post("/resetpassword", AuthController.changepassword);

  // Protected routes
  app.get("/index", requireLogin, DashboardController.index);
  app.get("/dashboard", requireLogin, DashboardController.index);

  // Database — users CRUD
  app.get("/database/users/new", requireLogin, UserAdminController.newForm);
  app.get(
    "/database/users/:id/edit",
    requireLogin,
    UserAdminController.editForm,
  );
  app.get("/database/users", requireLogin, UserAdminController.index);
  app.post("/database/users", requireLogin, UserAdminController.create);
  app.post(
    "/database/users/:id/update",
    requireLogin,
    UserAdminController.update,
  );
  app.post(
    "/database/users/:id/delete",
    requireLogin,
    UserAdminController.destroy,
  );

  // Database — property listings
  app.get(
    "/database/listings",
    requireLogin,
    ListingAdminController.index,
  );
  app.get(
    "/database/listings/:id",
    requireLogin,
    ListingAdminController.show,
  );
};

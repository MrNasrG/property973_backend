const { Op } = require("sequelize");
const sequelize = require("../config/database");
const User = require("../models/UserModel");
const VerifyOtp = require("../models/VerifyOtpModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const validator = require("validator");
const {
  sendOtpEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  isEmailConfigured,
} = require("../utils/email");
const { buildOtpCopyPageHtml } = require("../utils/emailTemplates");
const { normalizeMobile, isValidE164ish } = require("../utils/mobile");
const {
  TWILIO_VERIFY_OTP_HASH,
  isSmsConfigured,
  usesTwilioVerify,
  sendOtpSms,
  verifyOtpSms,
} = require("../utils/sms");
const {
  accessSecret,
  refreshSecret,
  signAccessToken,
  signRefreshToken,
  parseBearer,
} = require("../utils/authTokens");

const login = (req, res) => {
  if (res.locals.userLogin) {
    return res.redirect("/dashboard");
  }
  return res.render("auth/login", {
    layout: "layout/layout-without-nav",
    title: "Login",
  });
};

// check login credential
const validate = async (req, res) => {
  var useremail = req.body.email;
  var userpassword = req.body.password;

  try {
    const currentUser = await User.findOne({ where: { email: useremail } });

    if (
      !currentUser ||
      !(await bcrypt.compare(userpassword, currentUser.password))
    ) {
      req.flash("error", "Invalid Email or Password.");
      return res.redirect("/login");
    }

    const usersession = req.session;
    usersession.userid = currentUser.id;
    usersession.username = currentUser.name;
    usersession.useremail = currentUser.email;

    return res.redirect("/index");
  } catch (err) {
    console.log("errors", err);
    return res.redirect("/login");
  }
};

// registration
const signup = async (req, res) => {
  try {
    var username = req.body.username;
    var useremail = req.body.email;
    var userpassword = req.body.password;

    const existsuser = await User.findOne({ where: { email: useremail } });

    if (existsuser) {
      req.flash("error", "Email already registered.");
      return res.redirect("/register");
    }

    var formdata = {
      name: username,
      email: useremail,
      password: userpassword,
    };

    const user = await User.create(formdata);
    if (user.email) {
      try {
        await sendWelcomeEmail(user.email, { name: user.name });
      } catch (emailErr) {
        console.log("Welcome email failed:", emailErr);
      }
    }
    req.flash("message", "Registration successful.");
    return res.redirect("/register");
  } catch (err) {
    console.log(err);
    req.flash("error", "Registration failed.");
    return res.redirect("/register");
  }
};

const logout = (req, res) => {
  req.session.destroy();
  res.redirect("/login");
};

/** @param {string} encodedToken */
function decodePasswordResetToken(encodedToken) {
  if (!encodedToken || typeof encodedToken !== "string") return null;
  try {
    const decoded = Buffer.from(encodedToken, "base64").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 2) return null;
    const userId = Number(parts[1]);
    if (!Number.isFinite(userId) || userId <= 0) return null;
    return { tokenHex: parts[0], userId };
  } catch {
    return null;
  }
}

/** @param {string} encodedToken */
async function findUserByResetToken(encodedToken) {
  const decoded = decodePasswordResetToken(encodedToken);
  if (!decoded) return null;
  return User.findOne({
    where: {
      id: decoded.userId,
      passwordResetToken: decoded.tokenHex,
      passwordResetExpires: { [Op.gt]: new Date() },
    },
  });
}

const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

/** @param {import('express').Request} req @param {string} resetToken */
function buildPasswordResetUrl(req, resetToken) {
  const base = (process.env.APP_PUBLIC_URL || "").trim().replace(/\/$/, "");
  const path = `/resetpassword?token=${encodeURIComponent(resetToken)}`;
  if (base) return `${base}${path}`;
  return `${req.protocol}://${req.get("host")}${path}`;
}

/** @param {string | null} resetToken */
function passwordResetResponseExtras(resetToken) {
  const expose = (process.env.PASSWORD_RESET_RETURN_TOKEN_IN_RESPONSE || "")
    .trim()
    .toLowerCase();
  if (resetToken && (expose === "1" || expose === "true" || expose === "yes")) {
    return { resetToken, expiresInSeconds: 3600 };
  }
  return {};
}

/**
 * @param {string} email
 * @param {import('express').Request} req
 * @returns {Promise<{ ok: boolean, status: number, message: string, data?: object }>}
 */
async function requestPasswordResetByEmail(email, req) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return { ok: false, status: 400, message: "email is required." };
  }
  if (!validator.isEmail(normalized)) {
    return { ok: false, status: 400, message: "Valid email is required." };
  }

  let user = null;
  try {
    user = await User.findOne({ where: { email: normalized } });
    if (!user) {
      return {
        ok: true,
        status: 200,
        message: PASSWORD_RESET_GENERIC_MESSAGE,
        data: passwordResetResponseExtras(null),
      };
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validate: false });

    const resetPasswordUrl = buildPasswordResetUrl(req, resetToken);

    await sendPasswordResetEmail(user.email, {
      name: user.name,
      resetUrl: resetPasswordUrl,
    });

    return {
      ok: true,
      status: 200,
      message: PASSWORD_RESET_GENERIC_MESSAGE,
      data: passwordResetResponseExtras(resetToken),
    };
  } catch (err) {
    console.log(err);
    if (user) {
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save({ validate: false });
    }
    return {
      ok: false,
      status: 500,
      message:
        err.message || "Could not send reset email. Please try again later.",
    };
  }
}

/**
 * @param {string} resetToken
 * @param {string} password
 * @param {string} [confirmPassword]
 * @returns {Promise<{ ok: boolean, status: number, message: string }>}
 */
async function completePasswordReset(resetToken, password, confirmPassword) {
  const token = resetToken ? String(resetToken) : "";
  const pwd = password ? String(password) : "";
  const confirm =
    confirmPassword != null && String(confirmPassword).length > 0
      ? String(confirmPassword)
      : pwd;

  if (!token) {
    return { ok: false, status: 400, message: "resetToken is required." };
  }
  if (!pwd || pwd.length < 6) {
    return {
      ok: false,
      status: 400,
      message: "password is required (min 6 characters).",
    };
  }
  if (pwd !== confirm) {
    return {
      ok: false,
      status: 400,
      message: "password and confirmPassword do not match.",
    };
  }

  const user = await findUserByResetToken(token);
  if (!user) {
    return {
      ok: false,
      status: 400,
      message: "Invalid or expired reset token.",
    };
  }

  user.password = pwd;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  return {
    ok: true,
    status: 200,
    message: "Password reset successfully.",
  };
}

// forgot password send link (web)
const forgotpassword = async (req, res) => {
  const result = await requestPasswordResetByEmail(req.body.email, req);
  if (result.ok) {
    req.flash("message", result.message);
  } else {
    req.flash("error", result.message);
  }
  return res.redirect("/forgotpassword");
};

// check token is valid or not
const resetpswdview = async (req, res) => {
  try {
    const resetToken = req.query.token;
    if (!resetToken) {
      req.flash("error", "Invalid or expired reset link.");
      return res.redirect("/forgotpassword");
    }

    const user = await findUserByResetToken(String(resetToken));
    if (!user) {
      req.flash("error", "Invalid or expired reset link.");
      return res.redirect("/forgotpassword");
    }

    return res.render("auth/resetpassword", {
      resetToken: String(resetToken),
      title: "Change Password",
      layout: "layout/layout-without-nav",
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Invalid or expired reset link.");
    return res.redirect("/forgotpassword");
  }
};

// Change password (web)
const changepassword = async (req, res) => {
  const resetToken = req.body.resetToken ? String(req.body.resetToken) : "";
  const redirectWithToken = () =>
    res.redirect(`/resetpassword?token=${encodeURIComponent(resetToken)}`);

  try {
    const result = await completePasswordReset(
      resetToken,
      req.body.password,
      req.body.confirm_password,
    );

    if (result.ok) {
      req.flash("message", "Password reset successfully. You can sign in now.");
      return res.redirect("/login");
    }

    req.flash("error", result.message);
    if (result.status === 400 && resetToken) return redirectWithToken();
    return res.redirect("/forgotpassword");
  } catch (err) {
    console.log(err);
    req.flash("error", "Could not reset password. Please try again.");
    if (resetToken) return redirectWithToken();
    return res.redirect("/forgotpassword");
  }
};

/** POST /auth/forgot-password — email reset link or mobile OTP (OTP sent to user's email) */
const authForgotPassword = async (req, res) => {
  const body = req.body || {};
  const emailInput = body.email != null ? String(body.email).trim().toLowerCase() : "";

  if (emailInput) {
    try {
      const result = await requestPasswordResetByEmail(emailInput, req);
      const responseBody = { success: result.ok, message: result.message };
      if (result.data && Object.keys(result.data).length > 0) {
        responseBody.data = result.data;
      }
      return res.status(result.status).json(responseBody);
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Failed to process password reset request.",
      });
    }
  }

  try {
    const { mobileNumber } = body;
    const mobile = normalizeMobile(mobileNumber);
    if (!mobile || !isValidE164ish(mobile)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid email or mobileNumber is required (E.164, e.g. +966512345678).",
      });
    }

    const user = await User.findOne({ where: { mobile_number: mobile } });
    if (!user || !user.mobile_verified) {
      return res.status(404).json({
        success: false,
        message: "No verified account found for this mobile number.",
      });
    }

    if (!isSmsConfigured() && !user.email) {
      return res.status(400).json({
        success: false,
        message: "No delivery method on file for this account. Contact support.",
      });
    }

    const { plainOtp, channels } = await assignOtpChallenge(user, mobile, {
      purpose: "reset your password",
    });
    return res.status(200).json({
      success: true,
      message: otpDeliveryMessage(channels),
      data: {
        mobileNumber: mobile,
        expiresInSeconds: Math.floor(otpTtlMs() / 1000),
        ...otpSmsDeliveryData(mobile),
        ...otpEmailDeliveryData(user),
        ...otpResponseExtras(plainOtp),
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to process password reset request.",
    });
  }
};

/** POST /auth/forgot-password/verify-otp — verify OTP for a verified user and issue a password reset token */
const authForgotPasswordVerifyOtp = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body || {};
    const mobile = normalizeMobile(mobileNumber);
    const otpCode = otp != null ? String(otp).trim() : "";
    if (!mobile || !isValidE164ish(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid mobileNumber is required." });
    }
    if (!/^\d{6}$/.test(otpCode)) {
      return res
        .status(400)
        .json({ success: false, message: "otp must be a 6-digit code." });
    }

    const otpRow = await VerifyOtp.findOne({
      where: {
        mobile_number: mobile,
        expires_at: { [Op.gt]: new Date() },
      },
      order: [["created_at", "DESC"]],
    });

    if (!otpRow) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    const user = await User.findByPk(otpRow.user_id);
    if (!user || normalizeMobile(user.mobile_number || "") !== mobile) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    // Reset flow is only valid for already-verified accounts;
    // registration OTPs always belong to unverified users, so they cannot slip through here.
    if (!user.mobile_verified) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    const otpOk = await verifyOtpCode(otpRow, mobile, otpCode);
    if (!otpOk) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    const resetToken = user.createPasswordResetToken();
    await sequelize.transaction(async (t) => {
      await VerifyOtp.destroy({ where: { id: otpRow.id }, transaction: t });
      await user.save({ validate: false, transaction: t });
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified.",
      data: {
        mobileNumber: mobile,
        resetToken,
        expiresInSeconds: 3600,
      },
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "OTP verification failed." });
  }
};

/** POST /auth/reset-password — set new password with reset token */
const authResetPassword = async (req, res) => {
  try {
    const confirm = req.body?.confirmPassword ?? req.body?.confirm_password;
    const result = await completePasswordReset(
      req.body?.resetToken,
      req.body?.password,
      confirm,
    );
    return res.status(result.status).json({
      success: result.ok,
      message: result.message,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password.",
    });
  }
};

/** GET /auth/reset-password/verify — check reset token before showing reset UI */
const authVerifyResetToken = async (req, res) => {
  try {
    const resetToken = req.query.resetToken || req.body?.resetToken;
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "resetToken is required.",
      });
    }

    const user = await findUserByResetToken(String(resetToken));
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reset token is valid.",
      data: { expiresInSeconds: 3600 },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to verify reset token.",
    });
  }
};

/** @typedef {{ id: number, name: string, mobile_number: string | null, email: string | null }} SavedUserLite */

/** @param {SavedUserLite} user */
function toAuthUserPayload(user) {
  return {
    id: user.id,
    fullName: user.name,
    email: user.email || null,
    mobileNumber: user.mobile_number,
  };
}

/** @param {string} email */
function maskEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0) return normalized;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at);
  if (local.length === 1) return `${local}***${domain}`;
  return `${local[0]}***${domain}`;
}

/** @param {{ email?: string | null }} user */
function otpEmailDeliveryData(user) {
  const email = user.email ? String(user.email).trim().toLowerCase() : "";
  if (!email) return {};
  return { email, emailMasked: maskEmail(email) };
}

/** @param {string} mobile */
function maskMobile(mobile) {
  const normalized = String(mobile || "").trim();
  if (normalized.length < 6) return normalized;
  return `${normalized.slice(0, 4)}***${normalized.slice(-2)}`;
}

/** @param {string} mobile */
function otpSmsDeliveryData(mobile) {
  if (!mobile) return {};
  return { mobileNumber: mobile, mobileMasked: maskMobile(mobile) };
}

/** @param {{ sms?: boolean, email?: boolean }} channels */
function otpDeliveryMessage(channels) {
  if (channels.sms && channels.email) {
    return "OTP sent to your mobile and email.";
  }
  if (channels.sms) return "OTP sent to your mobile.";
  if (channels.email) return "OTP sent to your email.";
  return "OTP sent.";
}

/**
 * @param {import("../models/VerifyOtpModel")} otpRow
 * @param {string} mobile
 * @param {string} otpCode
 */
async function verifyOtpCode(otpRow, mobile, otpCode) {
  if (otpRow.otp_hash === TWILIO_VERIFY_OTP_HASH) {
    return verifyOtpSms(mobile, otpCode);
  }
  return bcrypt.compare(otpCode, otpRow.otp_hash);
}

/**
 * @param {import("../models/UserModel")} user
 * @param {string} smsTo
 * @param {string} otp
 * @param {{ purpose?: string }} opts
 */
async function deliverOtpChallenge(user, smsTo, otp, opts) {
  const purpose = opts.purpose || "verify your account";
  const channels = { sms: false, email: false };

  if (isSmsConfigured()) {
    await sendOtpSms(smsTo, otp, { purpose });
    channels.sms = true;
  }

  const email = user.email ? String(user.email).trim().toLowerCase() : "";
  if (email && isEmailConfigured()) {
    await sendOtpEmail(email, {
      name: user.name,
      otp,
      purpose,
    });
    channels.email = true;
  }

  if (!channels.sms && !channels.email) {
    await sendOtpSms(smsTo, otp, { purpose });
    channels.sms = true;
  }

  return channels;
}

/**
 * Create OTP row and deliver code by SMS (Twilio) and/or email.
 *
 * @param {import("../models/UserModel")} user
 * @param {string} smsTo
 * @param {{ purpose?: string }} [opts]
 * @returns {Promise<{ plainOtp: string, channels: { sms: boolean, email: boolean } }>}
 */
async function assignOtpChallenge(user, smsTo, opts = {}) {
  const viaTwilioVerify = usesTwilioVerify();
  const otp = viaTwilioVerify
    ? ""
    : String(crypto.randomInt(100000, 999999));
  const otpHash = viaTwilioVerify
    ? TWILIO_VERIFY_OTP_HASH
    : await bcrypt.hash(otp, 12);
  const expiresAt = new Date(Date.now() + otpTtlMs());

  await sequelize.transaction(async (t) => {
    await VerifyOtp.destroy({
      where: { user_id: user.id },
      transaction: t,
    });
    await VerifyOtp.create(
      {
        user_id: user.id,
        mobile_number: smsTo,
        otp_hash: otpHash,
        expires_at: expiresAt,
      },
      { transaction: t },
    );
  });

  let channels;
  if (viaTwilioVerify) {
    await sendOtpSms(smsTo, undefined, opts);
    channels = { sms: true, email: false };
  } else {
    channels = await deliverOtpChallenge(user, smsTo, otp, opts);
  }

  return { plainOtp: otp, channels };
}

function otpTtlMs() {
  const minutes = parseInt(String(process.env.OTP_EXPIRES_MINUTES || "10"), 10);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 10) * 60 * 1000;
}

/** @param {string} plainOtp */
function otpResponseExtras(plainOtp) {
  const hide = (process.env.OTP_HIDE_FROM_RESPONSE || "").trim().toLowerCase();
  if (hide === "1" || hide === "true" || hide === "yes") return {};
  if (!plainOtp) return {};
  return { otp: plainOtp };
}

/** @param {import("../models/UserModel")} user */
async function persistRefreshForUser(user) {
  const { token: refreshToken, jti, expiresAt } = signRefreshToken(user.id);
  user.refresh_token_jti = jti;
  user.refresh_token_expires = expiresAt;
  await user.save({
    fields: ["refresh_token_jti", "refresh_token_expires"],
    validate: false,
    hooks: false,
  });
  return { refreshToken };
}

/** @param {import("../models/UserModel")} user */
async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const { refreshToken } = await persistRefreshForUser(user);
  return { accessToken, refreshToken };
}

/** Login step: existing verified user + correct password → send OTP. */
const authOtpSend = async (req, res) => {
  try {
    const { fullName, mobileNumber, password } = req.body;
    const mobile = normalizeMobile(mobileNumber);
    if (!fullName || !String(fullName).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "fullName is required." });
    }
    if (!mobile || !isValidE164ish(mobile)) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Valid mobileNumber is required (E.164, e.g. +966512345678).",
        });
    }
    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: "password is required." });
    }

    const user = await User.findOne({ where: { mobile_number: mobile } });
    if (!user || !user.mobile_verified) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Invalid mobile number or password.",
        });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Invalid mobile number or password.",
        });
    }

    const normalizedName = String(fullName).trim();
    if (user.name !== normalizedName) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Invalid mobile number or password.",
        });
    }

    if (!isSmsConfigured() && !user.email) {
      return res.status(400).json({
        success: false,
        message: "No delivery method on file for this account. Contact support.",
      });
    }

    const { plainOtp, channels } = await assignOtpChallenge(user, mobile, {
      purpose: "sign in",
    });
    return res.status(200).json({
      success: true,
      message: otpDeliveryMessage(channels),
      data: {
        mobileNumber: mobile,
        expiresInSeconds: Math.floor(otpTtlMs() / 1000),
        ...otpSmsDeliveryData(mobile),
        ...otpEmailDeliveryData(user),
        ...otpResponseExtras(plainOtp),
      },
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send OTP." });
  }
};

const authOtpVerify = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    const mobile = normalizeMobile(mobileNumber);
    const otpCode = otp != null ? String(otp).trim() : "";
    if (!mobile || !isValidE164ish(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid mobileNumber is required." });
    }
    if (!/^\d{6}$/.test(otpCode)) {
      return res
        .status(400)
        .json({ success: false, message: "otp must be a 6-digit code." });
    }

    const otpRow = await VerifyOtp.findOne({
      where: {
        mobile_number: mobile,
        expires_at: { [Op.gt]: new Date() },
      },
      order: [["created_at", "DESC"]],
    });

    if (!otpRow) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    const user = await User.findByPk(otpRow.user_id);
    if (!user || normalizeMobile(user.mobile_number || "") !== mobile) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    const otpOk = await verifyOtpCode(otpRow, mobile, otpCode);
    if (!otpOk) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired OTP." });
    }

    const wasVerified = user.mobile_verified;

    await sequelize.transaction(async (t) => {
      await VerifyOtp.destroy({ where: { id: otpRow.id }, transaction: t });
      await User.update(
        { mobile_verified: true },
        { where: { id: user.id }, transaction: t, hooks: false },
      );
    });

    await user.reload();
    if (!wasVerified && user.email) {
      try {
        await sendWelcomeEmail(user.email, { name: user.name });
      } catch (emailErr) {
        console.log("Welcome email failed:", emailErr);
      }
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);

    await user.reload();
    return res.status(200).json({
      success: true,
      message: "OTP verified.",
      data: {
        accessToken,
        refreshToken,
        user: toAuthUserPayload(user),
      },
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "OTP verification failed." });
  }
};

const authLogin = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;
    const mobile = normalizeMobile(mobileNumber);
    if (!mobile || !isValidE164ish(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid mobileNumber is required." });
    }
    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: "password is required." });
    }

    const user = await User.findOne({ where: { mobile_number: mobile } });
    if (
      !user ||
      !user.mobile_verified ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Invalid mobile number or password.",
        });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);

    await user.reload();
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken,
        refreshToken,
        user: toAuthUserPayload(user),
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Login failed." });
  }
};

const authRegister = async (req, res) => {
  try {
    const { fullName, mobileNumber, password, email } = req.body;
    const mobile = normalizeMobile(mobileNumber);
    const name = fullName ? String(fullName).trim() : "";
    const normalizedEmail =
      email != null ? String(email).trim().toLowerCase() : "";
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "fullName is required." });
    }
    if (!mobile || !isValidE164ish(mobile)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid mobileNumber is required (E.164).",
        });
    }
    if (!normalizedEmail || !validator.isEmail(normalizedEmail)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid email is required." });
    }
    if (!password || String(password).length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "password is required (min 6 characters).",
        });
    }

    const existing = await User.findOne({ where: { mobile_number: mobile } });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Mobile number already registered." });
    }

    const existingEmail = await User.findOne({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered." });
    }

    const user = await User.create({
      name,
      mobile_number: mobile,
      password,
      email: normalizedEmail,
      mobile_verified: false,
    });

    const { plainOtp, channels } = await assignOtpChallenge(user, mobile, {
      purpose: "complete your registration",
    });

    return res.status(201).json({
      success: true,
      message: `Registration started. ${otpDeliveryMessage(channels)}`,
      data: {
        mobileNumber: mobile,
        email: normalizedEmail,
        expiresInSeconds: Math.floor(otpTtlMs() / 1000),
        ...otpSmsDeliveryData(mobile),
        ...otpEmailDeliveryData(user),
        ...otpResponseExtras(plainOtp),
      },
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Registration failed." });
  }
};

const authRefresh = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken;
    const tokenStr =
      typeof refreshToken === "string" ? refreshToken.trim() : "";
    if (!tokenStr) {
      return res.status(400).json({
        success: false,
        message: "refreshToken is required.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(tokenStr, refreshSecret());
    } catch (e) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token." });
    }

    if (decoded.typ !== "refresh" || !decoded.sub || !decoded.jti) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token." });
    }

    const user = await User.findByPk(Number(decoded.sub));
    if (!user || user.refresh_token_jti !== decoded.jti) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token." });
    }
    if (
      !user.refresh_token_expires ||
      user.refresh_token_expires <= new Date()
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token." });
    }

    const accessToken = signAccessToken(user);
    const { refreshToken: newRefresh } = await persistRefreshForUser(user);

    await user.reload();
    return res.status(200).json({
      success: true,
      message: "Token refreshed.",
      data: {
        accessToken,
        refreshToken: newRefresh,
      },
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Token refresh failed." });
  }
};

const authLogout = async (req, res) => {
  try {
    const headerToken = parseBearer(req.headers.authorization);
    const bodyRefresh =
      typeof req.body?.refreshToken === "string"
        ? req.body.refreshToken.trim()
        : "";

    if (headerToken) {
      let decoded;
      try {
        decoded = jwt.verify(headerToken, accessSecret());
      } catch (e) {
        return res
          .status(401)
          .json({
            success: false,
            message: "Invalid or expired access token.",
          });
      }
      if (decoded.typ !== "access" || !decoded.sub) {
        return res
          .status(401)
          .json({
            success: false,
            message: "Invalid or expired access token.",
          });
      }
      const user = await User.findByPk(Number(decoded.sub));
      if (user) {
        user.refresh_token_jti = null;
        user.refresh_token_expires = null;
        await user.save({
          fields: ["refresh_token_jti", "refresh_token_expires"],
          validate: false,
          hooks: false,
        });
      }
      return res.status(200).json({ success: true, message: "Logged out." });
    }

    if (bodyRefresh) {
      let decoded;
      try {
        decoded = jwt.verify(bodyRefresh, refreshSecret());
      } catch (e) {
        return res
          .status(401)
          .json({
            success: false,
            message: "Invalid or expired refresh token.",
          });
      }
      if (decoded.typ !== "refresh" || !decoded.sub || !decoded.jti) {
        return res
          .status(401)
          .json({
            success: false,
            message: "Invalid or expired refresh token.",
          });
      }
      const user = await User.findByPk(Number(decoded.sub));
      if (user && user.refresh_token_jti === decoded.jti) {
        user.refresh_token_jti = null;
        user.refresh_token_expires = null;
        await user.save({
          fields: ["refresh_token_jti", "refresh_token_expires"],
          validate: false,
          hooks: false,
        });
      }
      return res.status(200).json({ success: true, message: "Logged out." });
    }

    return res.status(401).json({
      success: false,
      message:
        'Provide Authorization: Bearer <accessToken> or { "refreshToken": "..." } to logout.',
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Logout failed." });
  }
};

const authMe = async (req, res) => {
  try {
    const token = parseBearer(req.headers.authorization);
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Authorization token missing." });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, accessSecret());
    } catch (e) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token." });
    }
    if (decoded.typ !== "access" || !decoded.sub) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token." });
    }

    const user = await User.findOne({
      where: { id: Number(decoded.sub) },
      attributes: [
        "id",
        "name",
        "email",
        "mobile_number",
        "mobile_verified",
        "created_at",
        "updated_at",
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.name,
          email: user.email,
          mobileNumber: user.mobile_number,
          mobileVerified: user.mobile_verified,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      },
    });
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};

/** GET /auth/otp/copy?code=123456 — opened from OTP email "Copy code" button */
const authOtpCopyPage = (req, res) => {
  const code = String(req.query.code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).send("Invalid verification code.");
  }
  res.set("Content-Type", "text/html; charset=utf-8");
  return res.send(buildOtpCopyPageHtml(code));
};

module.exports = {
  login,
  validate,
  logout,
  signup,
  forgotpassword,
  resetpswdview,
  changepassword,
  authForgotPassword,
  authForgotPasswordVerifyOtp,
  authResetPassword,
  authVerifyResetToken,
  authOtpCopyPage,
  authOtpSend,
  authOtpVerify,
  authLogin,
  authRegister,
  authRefresh,
  authLogout,
  authMe,
};

const express= require('express')
const authMiddleware = require("../middlewares/auth.middleware")
const accountController = require("../controllers/account.controller")

/**
 * - POST /api/accounts/
 * - Create a new account
 * - Protected routes
 */

const router =  express.Router()

router.post("/",authMiddleware.authMiddleware, accountController.createAccountController)


module.exports = router
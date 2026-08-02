const {Router} = require("express")

const authMiddleware = require("../middlewares/auth.middleware")
const router = require("./auth.routes")

const transactionRoutes = Router()

/**
 *  - POST /api/transactions
 *  - Create a new transaction
 */

transactionRoutes.post("/", authMiddleware.authMiddleware)

module.exports = transactionRoutes;
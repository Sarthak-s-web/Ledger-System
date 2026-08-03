const express = require("express")
const cookieParser = require("cookie-parser")

/**
 * - Routes required
 */

const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.route")
const transactionRoutes = require("./routes/transaction.routes")

const app = express();


app.use(express.json())
app.use(cookieParser())

/**
 * - Use Routes
 */
app.use("/api/auth",authRouter)
app.use("/api/account",accountRouter)
app.use("/api/account",transactionRoutes)


module.exports = app



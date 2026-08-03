const transactionModel = require("../models/transaction.models");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/accounts.models");
const emailService = require("../services/email.services");
const mongoose = require("mongoose");

async function createTransaction(req, res) {

    const session = await mongoose.startSession();

    try {

        // 1. Validate Request
        const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

        if (!fromAccount || !toAccount || amount==null || !idempotencyKey) {
            return res.status(400).json({
                message: "fromAccount, toAccount, amount and idempotencyKey are required",
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                message: "Amount must be greater than zero",
            });
        }

        if (fromAccount === toAccount) {
            return res.status(400).json({
                message: "Cannot transfer money to the same account",
            });
        }

        // 2. Find Accounts
        const fromUserAccount = await accountModel.findById(fromAccount);
        const toUserAccount = await accountModel.findById(toAccount);

        if (!fromUserAccount || !toUserAccount) {
            return res.status(400).json({
                message: "Invalid sender or receiver account",
            });
        }

        // 3. Validate Idempotency Key
        const existingTransaction = await transactionModel.findOne({
            idempotencyKey,
        });

        if (existingTransaction) {

            if (existingTransaction.status === "COMPLETED") {
                return res.status(200).json({
                    message: "Transaction already processed",
                    transaction: existingTransaction,
                });
            }

            if (existingTransaction.status === "PENDING") {
                return res.status(200).json({
                    message: "Transaction is still processing",
                });
            }

            if (existingTransaction.status === "FAILED") {
                return res.status(400).json({
                    message: "Previous transaction failed. Retry.",
                });
            }

            if (existingTransaction.status === "REVERSED") {
                return res.status(400).json({
                    message: "Transaction was reversed. Retry.",
                });
            }
        }

        // 4. Check Account Status
        if (
            fromUserAccount.status !== "ACTIVE" ||
            toUserAccount.status !== "ACTIVE"
        ) {
            return res.status(400).json({
                message: "Both accounts must be ACTIVE",
            });
        }

        // 5. Check Balance
        const balance = await fromUserAccount.getBalance();

        if (balance < amount) {
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}`,
            });
        }

        // Start MongoDB Transaction
        session.startTransaction();

        // 6. Create Transaction
        const transaction = new transactionModel({
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING",
        });

        await transaction.save({ session });

        // 7. Debit Ledger Entry
        const debitEntry = new ledgerModel({
            account: fromAccount,
            amount,
            transaction: transaction._id,
            type: "DEBIT",
        });

        await debitEntry.save({ session });

        // 8. Credit Ledger Entry
        const creditEntry = new ledgerModel({
            account: toAccount,
            amount,
            transaction: transaction._id,
            type: "CREDIT",
        });

        await creditEntry.save({ session });

        // 9. Mark Transaction Completed
        transaction.status = "COMPLETED";
        await transaction.save({ session });

        // 10. Commit Transaction
        await session.commitTransaction();

        // 11. Send Email
        try {
            await emailService.SendTransactionEmail(
                req.user.email,
                req.user.name,
                amount,
                toAccount
            );
        } catch (emailError) {
            console.error("Email sending failed:", emailError.message);
        }

        return res.status(200).json({
            message: "Transaction completed successfully",
            transaction,
        });

    } catch (error) {

        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        return res.status(500).json({
            message: "Transaction failed",
            error: error.message,
        });

    } finally {
        await session.endSession();
    }
}

module.exports = {
    createTransaction,
};
const transactionModel = require("../models/transaction.models");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/accounts.models");
const emailService = require("../services/email.services");
const mongoose = require("mongoose");


async function createTransaction(req, res) {

    const {
        fromAccount,
        toAccount,
        amount,
        idempotencyKey
    } = req.body;

    // 1. Validate request
    if (
        !fromAccount ||
        !toAccount ||
        amount == null ||
        !idempotencyKey
    ) {
        return res.status(400).json({
            message:
                "fromAccount, toAccount, amount and idempotencyKey are required"
        });
    }

    if (amount <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than zero"
        });
    }

    if (fromAccount === toAccount) {
        return res.status(400).json({
            message: "Cannot transfer money to the same account"
        });
    }


    const session = await mongoose.startSession();

    let transaction;

    try {

        await session.withTransaction(async () => {

            // 2. Check idempotency key inside transaction
            const existingTransaction =
                await transactionModel
                    .findOne({
                        idempotencyKey
                    })
                    .session(session);

            if (existingTransaction) {

                if (existingTransaction.status === "COMPLETED") {
                    throw new Error("ALREADY_COMPLETED");
                }

                if (existingTransaction.status === "PENDING") {
                    throw new Error("ALREADY_PENDING");
                }

                if (existingTransaction.status === "FAILED") {
                    throw new Error("PREVIOUS_FAILED");
                }

                if (existingTransaction.status === "REVERSED") {
                    throw new Error("PREVIOUS_REVERSED");
                }
            }


            // 3. Get sender account
            const fromUserAccount =
                await accountModel
                    .findById(fromAccount)
                    .session(session);

            if (!fromUserAccount) {
                throw new Error("INVALID_SENDER");
            }


            // 4. Get receiver account
            const toUserAccount =
                await accountModel
                    .findById(toAccount)
                    .session(session);

            if (!toUserAccount) {
                throw new Error("INVALID_RECEIVER");
            }


            // 5. Check account status
            if (
                fromUserAccount.status !== "ACTIVE" ||
                toUserAccount.status !== "ACTIVE"
            ) {
                throw new Error("ACCOUNT_NOT_ACTIVE");
            }


            /*
             * 6. Serialize transactions from the same sender account
             *
             * updatedAt already exists because the Account schema
             * uses timestamps: true.
             *
             * This is a REAL write to the sender document.
             *
             * If another transaction is simultaneously trying
             * to modify the same sender document, MongoDB will
             * detect the write conflict.
             *
             * withTransaction() can then retry the transaction.
             */
            const lockedSender =
                await accountModel.findOneAndUpdate(
                    {
                        _id: fromAccount,
                        status: "ACTIVE"
                    },
                    {
                        $set: {
                            updatedAt: new Date()
                        }
                    },
                    {
                        new: true,
                        session
                    }
                );

            if (!lockedSender) {
                throw new Error("SENDER_LOCK_FAILED");
            }


            // 7. Calculate balance from ledger
            const balance = await lockedSender.getBalance();

            console.log(
                "Balance check:",
                idempotencyKey,
                balance
            );


            // 8. Check sufficient balance
            if (balance < amount) {
                throw new Error("INSUFFICIENT_BALANCE");
            }


            // 9. Create transaction
            transaction = new transactionModel({
                fromAccount,
                toAccount,
                amount,
                idempotencyKey,
                status: "PENDING"
            });

            await transaction.save({
                session
            });


            // 10. Create DEBIT ledger entry
            const debitEntry = new ledgerModel({
                account: fromAccount,
                amount,
                transaction: transaction._id,
                type: "DEBIT"
            });

            await debitEntry.save({
                session
            });


            // 11. Create CREDIT ledger entry
            const creditEntry = new ledgerModel({
                account: toAccount,
                amount,
                transaction: transaction._id,
                type: "CREDIT"
            });

            await creditEntry.save({
                session
            });


            // 12. Mark transaction COMPLETED
            transaction.status = "COMPLETED";

            await transaction.save({
                session
            });

        });


        // Transaction successfully committed


        // 13. Send email AFTER commit
        try {

            await emailService.SendTransactionEmail(
                req.user.email,
                req.user.name,
                amount,
                toAccount
            );

        } catch (emailError) {

            console.error(
                "Email sending failed:",
                emailError.message
            );
        }


        // 14. Response
        return res.status(200).json({
            message: "Transaction completed successfully",
            transaction
        });


    } catch (error) {

        console.error(
            "Transaction Error:",
            error.message
        );


        // Idempotency responses
        if (error.message === "ALREADY_COMPLETED") {

            const existingTransaction =
                await transactionModel.findOne({
                    idempotencyKey
                });

            return res.status(200).json({
                message: "Transaction already processed",
                transaction: existingTransaction
            });
        }


        if (error.message === "ALREADY_PENDING") {

            return res.status(200).json({
                message: "Transaction is still processing"
            });
        }


        if (error.message === "PREVIOUS_FAILED") {

            return res.status(400).json({
                message: "Previous transaction failed. Retry."
            });
        }


        if (error.message === "PREVIOUS_REVERSED") {

            return res.status(400).json({
                message: "Transaction was reversed. Retry."
            });
        }


        // Other validation/business errors

        if (error.message === "INVALID_SENDER") {

            return res.status(400).json({
                message: "Invalid sender account"
            });
        }


        if (error.message === "INVALID_RECEIVER") {

            return res.status(400).json({
                message: "Invalid receiver account"
            });
        }


        if (error.message === "ACCOUNT_NOT_ACTIVE") {

            return res.status(400).json({
                message: "Both accounts must be ACTIVE"
            });
        }


        if (error.message === "INSUFFICIENT_BALANCE") {

            /*
             * Get latest balance only for displaying it.
             *
             * The actual balance decision was already made
             * inside the transaction.
             */
            const account =
                await accountModel.findById(fromAccount);

            let currentBalance = 0;

            if (account) {
                currentBalance = await account.getBalance();
            }

            return res.status(400).json({
                message:
                    `Insufficient balance. Current balance is ${currentBalance}`,
            });
        }


        if (error.message === "SENDER_LOCK_FAILED") {

            return res.status(409).json({
                message:
                    "Unable to process the account at this time. Please retry."
            });
        }


        // Duplicate idempotency key
        if (error.code === 11000) {

            const existingTransaction =
                await transactionModel.findOne({
                    idempotencyKey
                });

            if (existingTransaction) {

                return res.status(200).json({
                    message: "Transaction already processed",
                    transaction: existingTransaction
                });
            }
        }


        return res.status(500).json({
            message: "Transaction failed",
            error: error.message
        });


    } finally {

        await session.endSession();

    }
}


async function createInitialFundsTransaction(req, res) {

    const {
        toAccount,
        amount,
        idempotencyKey
    } = req.body;


    // 1. Validate request
    if (
        !toAccount ||
        amount == null ||
        !idempotencyKey
    ) {
        return res.status(400).json({
            message:
                "toAccount, amount and idempotencyKey are required"
        });
    }


    if (amount <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than zero"
        });
    }


    const session = await mongoose.startSession();

    let transaction;


    try {

        await session.withTransaction(async () => {

            // 2. Check idempotency key
            const existingTransaction =
                await transactionModel
                    .findOne({
                        idempotencyKey
                    })
                    .session(session);

            if (existingTransaction) {

                if (existingTransaction.status === "COMPLETED") {
                    throw new Error("ALREADY_COMPLETED");
                }

                if (existingTransaction.status === "PENDING") {
                    throw new Error("ALREADY_PENDING");
                }

                if (existingTransaction.status === "FAILED") {
                    throw new Error("PREVIOUS_FAILED");
                }

                if (existingTransaction.status === "REVERSED") {
                    throw new Error("PREVIOUS_REVERSED");
                }
            }


            // 3. Find receiver account
            const toUserAccount =
                await accountModel
                    .findById(toAccount)
                    .session(session);

            if (!toUserAccount) {
                throw new Error("INVALID_RECEIVER");
            }


            // 4. Check receiver status
            if (toUserAccount.status !== "ACTIVE") {
                throw new Error("ACCOUNT_NOT_ACTIVE");
            }


            // 5. Find system user's account
            const fromUserAccount =
                await accountModel.findOne({
                    user: req.user._id
                }).session(session);

            if (!fromUserAccount) {
                throw new Error("SYSTEM_ACCOUNT_NOT_FOUND");
            }


            // 6. Check system account status
            if (fromUserAccount.status !== "ACTIVE") {
                throw new Error("SYSTEM_ACCOUNT_NOT_ACTIVE");
            }


            // 7. Create transaction
            transaction = new transactionModel({
                fromAccount: fromUserAccount._id,
                toAccount,
                amount,
                idempotencyKey,
                status: "PENDING"
            });

            await transaction.save({
                session
            });


            // 8. Create DEBIT ledger entry
            const debitLedgerEntry = new ledgerModel({
                account: fromUserAccount._id,
                amount,
                transaction: transaction._id,
                type: "DEBIT"
            });

            await debitLedgerEntry.save({
                session
            });


            // 9. Create CREDIT ledger entry
            const creditLedgerEntry = new ledgerModel({
                account: toAccount,
                amount,
                transaction: transaction._id,
                type: "CREDIT"
            });

            await creditLedgerEntry.save({
                session
            });


            // 10. Mark transaction completed
            transaction.status = "COMPLETED";

            await transaction.save({
                session
            });

        });


        return res.status(201).json({
            message:
                "Initial funds transaction completed successfully",
            transaction
        });


    } catch (error) {

        console.error(
            "Initial funds transaction error:",
            error.message
        );


        if (error.message === "ALREADY_COMPLETED") {

            const existingTransaction =
                await transactionModel.findOne({
                    idempotencyKey
                });

            return res.status(200).json({
                message: "Transaction already processed",
                transaction: existingTransaction
            });
        }


        if (error.message === "ALREADY_PENDING") {

            return res.status(200).json({
                message: "Transaction is still processing"
            });
        }


        if (error.message === "PREVIOUS_FAILED") {

            return res.status(400).json({
                message: "Previous transaction failed. Retry."
            });
        }


        if (error.message === "PREVIOUS_REVERSED") {

            return res.status(400).json({
                message: "Transaction was reversed. Retry."
            });
        }


        if (error.message === "INVALID_RECEIVER") {

            return res.status(400).json({
                message: "Invalid toAccount"
            });
        }


        if (error.message === "ACCOUNT_NOT_ACTIVE") {

            return res.status(400).json({
                message: "Receiver account must be ACTIVE"
            });
        }


        if (error.message === "SYSTEM_ACCOUNT_NOT_FOUND") {

            return res.status(400).json({
                message: "System user account not found"
            });
        }


        if (error.message === "SYSTEM_ACCOUNT_NOT_ACTIVE") {

            return res.status(400).json({
                message: "System account must be ACTIVE"
            });
        }


        // Duplicate idempotency key
        if (error.code === 11000) {

            const existingTransaction =
                await transactionModel.findOne({
                    idempotencyKey
                });

            if (existingTransaction) {

                return res.status(200).json({
                    message: "Transaction already processed",
                    transaction: existingTransaction
                });
            }
        }


        return res.status(500).json({
            message: "Initial funds transaction failed",
            error: error.message
        });


    } finally {

        await session.endSession();

    }
}


module.exports = {
    createTransaction,
    createInitialFundsTransaction
};
const transactionModel = require('../models/transaction.models')
const ledgerModel = require('../models/ledger.model')
const accountModel = require('../models/accounts.models')
const emailService = require("../services/email.services")

/**
 *  -Create a new transaction
 * The steps transfer flow
        * 1.Validate request
        * 2.Validate idempotency key
        * 3.Chech account status
        * 4.Derive sender balance from ledger
        * 5.Create transaction(PENDING)
        * 6.Create debit ledger entry
        * 7.Create credit ledger entry
        * 8.Mark transaction completed
        * 9.commit MongoDb session
        * 10.Send email notification  
 */

async function createTransaction(req, res){

    /**
     * 1.validate request
     */
    const {fromAccount, toAccount , amount ,idempotencyKey} = req.body
    
    if(!fromAccount || !toAccount || !amount || !idempotencyKey)
    {
        return res.status(400).json({
            message:"fromAccount, toAccount, amount, idempotencyKey is required"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id:fromAccount
    })

    const toUserAccount = await accountModel.findOne({
        _id:toAccount
    })

    if(!fromUserAccount || !toUserAccount)
    {
        return res.status(400).json({
            message:"Invalid fromAccount or toAccount"
        })
    }
     

    /**
     * 2.Validate idempotency key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if(isTransactionAlreadyExists)
    {
        if(isTransactionAlreadyExists.status==="COMPLETED")
    {
        return res.status(200).json({
            message:"Transaction already processed",
            transaction:isTransactionAlreadyExists
        })
    }

    if(isTransactionAlreadyExists.status === "PENDING")
    {
        return res.status(200).json({
            message:"Transaction is still processing"
        })
    }

    if(isTransactionAlreadyExists.status === "FAILED")
    {
        return res.status(500).json({
            message:"Transaction processing failed , please retry"
        })
    }

    if(isTransactionAlreadyExists.status ==="REVERSED")
    {
        return res.status(500).json({
            message:"Transaction was reversed , please retry"
        })
    }
    }
    

    if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE")
    {
        return res.status(400).json({
            message: "Both account fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

}
const accountModel  = require("../models/accounts.models")

async function createAccountController(req, res){

    const user =req.user
    
    const account = await accountModel.create({
        user: user._id
    })

    res.status(201).json({
        account
    })
}

async function getUserAccountsController(req, res){
    const accounts = await accountModel.find({
        user:req.user._id
    }) 

    return res.status(200).json({
        message:accounts
    })
}

async function getAccountBalanceController(req, res){
    const {accountId}= req.params;

    const account = await accountModel.findOne({
        _id:accountId,
        user:req.user._id
    })
    // console.log(account);
    

    if(!account){
        return res.status(404).json({
            message:"Account not found"
        })
    }

    const balance = await account.getBalance();

    // console.log(balance);
    
    
    return res.status(200).json({
        account:account._id,
        balance:balance
    })
}



module.exports={
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
}
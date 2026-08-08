const userModel = require("../models/user.models")
const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blackList.model")

async function authMiddleware(req, res ,next){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if(!token)
    {
        return res.status(401).json({
            message:"Unauthorized access, token is missing"
        });
    }

    const isBlackListed = await tokenBlackListModel.findOne({token})

    if(isBlackListed)
    {
        return res.status(401).json({
            message:"Unauthorized access, token is invalid"
        })
    }


    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        const user = await userModel.findById(decoded.userID)

        if(!user){
            return res.status(401).json({
            message: "User not found",
            });
        }

        req.user=user

        return next();

    } catch (error) {
        res.status(401).json({
            message:"Invalid or expired token"
        })
    }
}

async function authSystemUserMiddleware(req, res,next){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]
      if(!token)
    {
        return res.status(401).json({
            message:"Unauthorized access, token is missing"
        });
    }

    const isBlackListed = await tokenBlackListModel.findOne({token})
    
    if(isBlackListed)
    {
        return res.status(401).json({
            message:"Unauthorized access, token is missing"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        const user = await userModel.findById(decoded.userID).select("+systemUser")

        if(!user.systemUser){
            return res.status(403).json({
            message: "Forbidden access, not a system user",
            });
        }

        req.user=user

        return next();

    } catch (error) {
        return res.status(401).json({
            message:"Invalid or expired token"
        })
    }

}

module.exports ={
    authMiddleware,
    authSystemUserMiddleware
}


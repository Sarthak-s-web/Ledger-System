const userModel = require("../models/user.models")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.services")

/**
 * - user register
 * - Post /api/auth/register 
 */
async function userRegisterController(req,res){
    const{email, password, name} = req.body

    const isEXists = await userModel.findOne({
        email:email
    })
    if(isEXists)
    {
        return res.status(422).json({
            message:"User already exists with this email",
            status:"failed"
        })
    }

    const user = await userModel.create({
        email , password ,name
    })

    const token =jwt.sign({
        userID: user._id}, 
        process.env.JWT_SECRET, 
        {expiresIn:"3d"})

    res.cookie("token", token)

    res.status(201).json({
        user:{
            _id: user._id,
            email:user.email,
            name:user.name
        },
        token
    })

    await emailService.sendRegistrationEmail(user.email, user.name)
}


/**
 * - user login
 * - Post /api/auth/login 
 */
async function loginController(req, res){
    const {email , password}= req.body
    const user = await userModel.findOne({email}).select("+password")

    if(!user)
    {
        return res.status(401).json({
            message:"Email or password is incorrect"
        })
    }

    const isValid= await user.comparePassword(password)
    if(!isValid)
    {
        return res.status(401).json({
            message:"Email or password is incorrect"
        })
    }

    const token =jwt.sign({userID: user._id}, process.env.JWT_SECRET, {expiresIn:"3d"})

    res.cookie("token", token)

    res.status(201).json({
        user:{
            _id: user._id,
            email:user.email,
            name:user.name
        },
        token
    })

}


module.exports ={
    userRegisterController,
    loginController
}
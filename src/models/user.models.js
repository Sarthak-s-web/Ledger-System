const mongoose =require("mongoose")

const user = mongoose.Schema({
    email:{
        type:String,
        required:[true, "Email required"],
        trim:true,
        lowercase:true,
        match:[/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    name:{
        type:String,
        required:[true, "Name is required"]
    },
    password:{
        type:String,
        required:[true, "Password is required"],
        minLength:[6,"password should contain more than 6 characters"],
        select:false
    },
},{
    timestamps:true
}
)

userSchema.pre("save", async function(next){
    
})
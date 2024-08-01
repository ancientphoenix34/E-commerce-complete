const port=3000;
const express=require("express");
const app=express();
const mongoose=require("mongoose");
const jwt=require("jsonwebtoken");
const multer=require("multer");
const cors=require("cors");
// The path module provides utilities for working with file and directory paths in Node.js
const path=require("path");
const { type } = require("os");
const { error } = require("console");

// When you include this middleware in your Express app, it enables your application to automatically parse JSON payloads in incoming requests, making it easier to work with JSON data in your routes.
app.use(express.json());
// The app.use(cors()); line is used in an Express.js application to enable Cross-Origin Resource Sharing (CORS). CORS is a mechanism that allows restricted resources on a web page to be requested from another domain outside the domain from which the first resource was served. This is commonly used in web development to allow your API to be accessible from web applications hosted on different domains.
app.use(cors());



// database with mongoose
mongoose.connect("mongodb+srv://farsukoothradan:project123@cluster0.f5wyu0c.mongodb.net/e-commerce")



// API creation
app.get("/",(req,res)=>{
    res.send("Express app is running")
})

// image storage
const storage=multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

// creating end point for uploading
app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})


// Schema for creating products
const Product = mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    }
})


app.post('/addproduct',async(req,res)=>{
    let products = await Product.find({})
    let id;
    if(products.length>0){
        let last_product_array=products.slice(-1);
        let last_product = last_product_array[0];
        id=last_product.id+1;
    }
    else{
        id=1;
    }
    const product=new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price
    })
    console.log(product)
    await product.save();
    console.log("product added")
    res.json({
        success:true,
        name:req.body.name,
    })
})

//creating api for deleting products
app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("product deleted")
    res.json({
        success:true,
        name:req.body.name,
    })
})


//creating api for getting all products
app.get('/allproducts',async(req,res)=>{
    let  products=await Product.find({});
    console.log("All products are fetched");
    res.send(products)
})




//Schema for user model
const Users=mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now
    }
})


//creating end point for registering user
app.post('/signup',async(req,res)=>{
    let check=await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"user already exists"})
    }
    let cart={};
    for(let i=0;i<300;i++){
        cart[i]=0;
    }
    const user=new Users({
        name:req.body.name,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })
    await user.save();

    const data={
        user:{
            id:user.id
        }
    }
    const token = jwt.sign(data,'secret_ecom');
    res.json({success:true,token})
})


//creating end point for userlogin
app.post('/login',async(req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare=req.body.password===user.password;
        if(passCompare){
            const data={
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,errors:"invalid password"});
        }
    }
    else{
        res.json({success:false,errors:"invalid email"})
    }
})



//creating end points for newcollection data
app.get('/newcollections',async(req,res)=>{
    let products=await Product.find({});
    let newcollection=products.slice(1).slice(-8);
    console.log("newcollection fetched");
    res.send(newcollection);
})



//creating end point for popular section
app.get('/popularinwomen',async(req,res)=>{
    let products=await Product.find({category:"women"})
    let popular_in_women=products.slice(0,4);
    console.log("popular in women fetched");
    res.send(popular_in_women);
})

//creating middleware to fetch user
const fetchUser=async(req,res,next)=>{
const token=req.header('auth-token');
if(!token){
res.status(401).send({errors:"please authenticate using a valid token"})
}
else{
    try{
      const data=jwt.verify(token,'secret_ecom');
      req.user=data.user;
      next();
    }catch(error){
res.status(401).send({errors:"please authenticate using a valid token"})
    }
}
}
//creating endpoint for adding products in cartdata
app.post('/addtocart',fetchUser,async(req,res)=>{
    console.log("Added",req.body.itemId);
    let userData=await Users.findOne({_id:req.user.id})
    userData.cartData[req.body.itemId]+=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added to cart")
})


//creating endpoint to remove from cartdata
app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("removed",req.body.itemId);
    let userData=await Users.findOne({_id:req.user.id})
    if( userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})


//creating endpoint for usercart data retrievel for user (unique)
app.post('/getcart',fetchUser,async(req,res)=>{
console.log("Detcart")
let userData=await Users.findOne({_id:req.user.id})
res.json(userData.cartData);
})



app.listen(port,(error)=>{
    if(!error){
        console.log("server is running on port"+port)
    }
    else{
        console.log("Error"+error)
    }
})
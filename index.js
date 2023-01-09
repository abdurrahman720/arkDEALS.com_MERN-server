const express = require("express");
const app = express();
const port = process.env.PORT || 5001;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

function jwtVerify(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
      return res.status(401).send({error: "UnAuthorized Access"})
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({message: err.message})
    }
    req.decoded = decoded;
    next();
  })
}





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rtntsud.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const categories = client.db("arkDEALS").collection("categories");
    const users = client.db("arkDEALS").collection("users");
    const products = client.db("arkDEALS").collection("products");
    const orders = client.db("arkDEALS").collection("orders");
   

    //verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await users.findOne(query);

      if (user?.role !== 'admin') {
          return res.status(403).send({ message: 'forbidden access' })
      }
      next();
  }
    //verifySeller
    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await users.findOne(query);

      if (user?.role !== 'seller') {
          return res.status(403).send({ message: 'forbidden access' })
      }
      next();
  }


    //add users to database
    app.post("/add-users", async (req, res) => {
      const user = req.body;

      const result = await users.insertOne(user);

      res.send(result);
    });
      
      //check role for admin, seller, buyer
      app.get('/admin/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email }
        const user = await users.findOne(query);
        res.send({ isAdmin: user?.role === 'admin' });
    })
      app.get('/seller/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email }
        const user = await users.findOne(query);
        res.send({ isSeller: user?.role === 'seller' });
    })
      app.get('/buyer/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email }
        const user = await users.findOne(query);

        res.send({ isBuyer: user?.role === 'buyer' });
      })
    
    //get user for profile
    app.get('/profile/:email', jwtVerify, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;
      if (decodedEmail !== email) {
        return res.status(403).send({message: 'Invalid email'})
      }
      const query = { email }
      const user = await users.findOne(query);
      res.send(user);
    })
      

    //provide jwt token for new users
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
   
      const query = { email: email };
      const user = await users.findOne(query);
      if (user) {
          const token = jwt.sign({ email }, process.env.ACCESS_TOKEN)
          return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: '' })
    });

    //get categories
    app.get('/categories', async (req, res) => {
      const query = {};
      const getCategories = await categories.find(query).toArray();
      res.send(getCategories)
    })

    //get products
    app.get('/products', async (req, res) => {
      const query = {};
      const getProducts = await products.find(query).toArray();
      res.send(getProducts);
    })

    


    //get products by category id and name
    app.get('/productsByCategory/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const category = await categories.findOne(query);
      const categoryName = category.categoryName;
      const pQuery = { categoryName: categoryName };
      const productsByCategory = await products.find(pQuery).toArray();
      res.send(productsByCategory)
    })

    //get product by id 
    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const getProduct = await products.findOne(query);
      res.send(getProduct)
    })

    //add products from seller
    app.post('/add-product', jwtVerify,verifySeller, async (req, res) => {
      const product = req.body;
      const result = await products.insertOne(product);
      res.send(result)
    })

    //post order bookings
    app.post('/orders', async (req, res) => {
      const order = req.body;
      const result = await orders.insertOne(order);
      res.send(result)
    })


  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("ARK Deals server running");
});

app.listen(port, () => {
  console.log("Ark Deals running on port " + port);
});

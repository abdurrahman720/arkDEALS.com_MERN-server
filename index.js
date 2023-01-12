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
    return res.status(401).send({ error: "UnAuthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: err.message });
    }
    req.decoded = decoded;
    next();
  });
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
    const advertisements = client.db("arkDEALS").collection("advertisements");
    const reportedItems = client.db("arkDEALS").collection("reportedItems");

    //verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await users.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    //verifySeller
    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await users.findOne(query);

      if (user?.role !== "seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    //verifyUser
    const verifyUser = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await users.findOne(query);
      if (!user) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //add users to database
    app.post("/add-users", async (req, res) => {
      const user = req.body;

      const result = await users.insertOne(user);

      res.send(result);
    });

    //check role for admin, seller, buyer
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await users.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });
    app.get("/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await users.findOne(query);

      res.send({ isSeller: user?.role === "seller" });
    });
    app.get("/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await users.findOne(query);

      res.send({ isBuyer: user?.role === "buyer" });
    });

    //is verified
    app.get("/seller-verified/:email", async (req, res) => {
      const email = req.params.email;

      const filter = {
        email: email,
        role: "seller",
      };
      const seller = await users.findOne(filter);
      const isverified = seller.verified;
      res.send({ isverified: isverified });
    });

    //get user for profile
    app.get("/profile/:email", jwtVerify, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Invalid email" });
      }
      const query = { email };
      const user = await users.findOne(query);
      res.send(user);
    });

    //provide jwt token for new users
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      const user = await users.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN);
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    //get categories
    app.get("/categories", async (req, res) => {
      const query = {};
      const getCategories = await categories.find(query).toArray();
      res.send(getCategories);
    });

    //get products
    app.get("/products", async (req, res) => {
      const query = {
        sold: false,
      };
      const getProducts = await products
        .find(query)
        .sort({ timeStamp: -1 })
        .toArray();
      res.send(getProducts);
    });

    //get products by category id and name
    app.get("/productsByCategory/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const category = await categories.findOne(query);
      const categoryName = category.categoryName;
      const pQuery = { categoryName: categoryName, sold: false };
      const productsByCategory = await products.find(pQuery).toArray();
      res.send(productsByCategory);
    });

    //get product by id
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const getProduct = await products.findOne(query);
      res.send(getProduct);
    });

    //add products from seller
    app.post("/add-product", jwtVerify, verifySeller, async (req, res) => {
      const product = req.body;
      const result = await products.insertOne(product);
      res.send(result);
    });

    //post order bookings
    app.post("/orders", jwtVerify, verifyUser, async (req, res) => {
      const order = req.body;
      const result = await orders.insertOne(order);
      res.send(result);
    });

    //get orders for buyer
    app.get("/myorders", jwtVerify, verifyUser, async (req, res) => {
      const email = req.query.email;
      const filter = {
        buyerEmail: email,
      };

      const myOrders = await orders.find(filter).toArray();
      res.send(myOrders);
    });
    //get orders for seller
    app.get("/mybuyers", jwtVerify, verifySeller, async (req, res) => {
      const email = req.query.email;
     
      const filter = {
        seller: email,
      };
      const myOrders = await orders.find(filter).toArray();
      res.send(myOrders);
    });

    //confirm meeting
    app.patch(
      "/confirm-meeting/:id",
      jwtVerify,
      verifySeller,
      async (req, res) => {
        const id = req.params.id;

        const filter = {
          _id: ObjectId(id),
        };
        let updateDoc;
        const options = { upsert: true };
        const order = await orders.findOne(filter);

        const bool = order?.meeting;

        if (bool) {
          updateDoc = {
            $set: {
              meeting: false,
            },
          };
        } else {
          updateDoc = {
            $set: {
              meeting: true,
            },
          };
        }

        const result = await orders.updateOne(filter, updateDoc, options);
        res.send(result);
      }
    );

    //get myproducts for seller
    app.get("/myproducts", jwtVerify, verifySeller, async (req, res) => {
      const email = req.query.email;
      const filter = {
        sellerEmail: email,
      };
      const myProducts = await products.find(filter).toArray();
      res.send(myProducts);
    });

    //post advertisemnet
    app.post(
      "/post-advertisemnet",
      jwtVerify,
      verifySeller,
      async (req, res) => {
        const advertisement = req.body;
        const result = await advertisements.insertOne(advertisement);
        res.send(result);
      }
    );
    //advertisement status
    app.patch("/advertisement-status/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: ObjectId(id),
      };
      const p = await products.findOne(filter);
      let updateDoc = {};
      const bool = p?.advertised;
      if (bool === true) {
        updateDoc = {
          $set: {
            advertised: false,
          },
        };
      }

      if (bool === false) {
        updateDoc = {
          $set: {
            advertised: true,
          },
        };
      }

      const result = await products.updateOne(filter, updateDoc);

      res.send(result);
    });

    //delete advertisement
    app.delete("/delete-advertisement/:id", async (req, res) => {
      const id = req.params.id;

      const filter = {
        id: id,
      };

      const result = await advertisements.deleteOne(filter);

      res.send(result);
    });

    //get advertisement product
    app.get("/get-advertisement", async (req, res) => {
      const query = {};
      const result = await advertisements.find(query).toArray();
      res.send(result);
    });
    app.get("/get-advertisement-sort", async (req, res) => {
      const query = {};
      const result = await advertisements
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    //paid api for order
    app.patch("/orders-paid/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: ObjectId(id),
      };
      const updateDoc = {
        $set: {
          paid: true,
        },
      };
      const result = await orders.updateOne(filter, updateDoc);
      res.send(result);
    });
    
    //delete duplicate order (must be called after order paid api)
    app.delete('/orders-paid-dup/:id', async (req, res) => {
      const id = req.params.id;
      const filter = {
        pId: id,
        paid: false
      }

      const result = await orders.deleteMany(filter);
      res.send(result)

    })

    app.patch("/products-paid/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: ObjectId(id),
      };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          advertised: false,
          sold: true,
        },
      };
      const result = await products.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    //delete product
    app.delete(
      "/delete-product/:id",
      jwtVerify,
      verifyUser,
      async (req, res) => {
        const id = req.params.id;
        const filter = {
          _id: ObjectId(id),
        };
        const result = await products.deleteOne(filter);
        res.send(result);
      }
    );

    app.get("/allsellers", jwtVerify, verifyAdmin, async (req, res) => {
      const query = {
        role: "seller",
      };
      const result = await users.find(query).toArray();
      res.send(result);
    });

    app.get("/allbuyers", jwtVerify, verifyAdmin, async (req, res) => {
      const query = {
        role: "buyer",
      };
      const result = await users.find(query).toArray();
      res.send(result);
    });

    //veify seller
    app.patch(
      "/verify-seller/:id",
      jwtVerify,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = {
          _id: ObjectId(id),
        };
        let updateDoc = {};
        const options = { upsert: true };
        const user = await users.findOne(filter);
        const bool = user?.verified;
        if (bool === true) {
          updateDoc = {
            $set: {
              verified: false,
            },
          };
        }

        if (bool === false) {
          updateDoc = {
            $set: {
              verified: true,
            },
          };
        }
        const result = await users.updateOne(filter, updateDoc, options);

        console.log(result);
        res.send(result);
      }
    );

    //update verified status on products
    app.patch("/verify-product/:email", async (req, res) => {
      const email = req.params.email;
      const filter = {
        sellerEmail: email,
      };
      const options = { upsert: true };

      const allProducts = await products.find(filter).toArray();
      let updateDoc = {};
      allProducts.forEach((product) => {
        const bool = product.verified;
        if (bool === true) {
          updateDoc = { $set: { verified: false } };
        } else {
          updateDoc = { $set: { verified: true } };
        }
      });

      const result = await products.updateMany(filter, updateDoc, options);

      res.send(result);
    });

    //update verified status on advertisement
    app.patch("/verify-ad/:email", jwtVerify, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = {
        seller: email,
      };

      const ads = await advertisements.find(query).toArray();
      if (ads.length === 0) {
        return res.send({ message: "no ads found" });
      }
      let updateDoc = {};
      const options = { upsert: true };

      ads.forEach((ad) => {
        const bool = ad.verified;
        if (bool === true) {
          updateDoc = { $set: { verified: false } };
        } else {
          updateDoc = { $set: { verified: true } };
        }
      });

      const result = await advertisements.updateMany(query, updateDoc, options);

      res.send(result);
    });

    // delete user:
    // 1. user delete
    //   2.product delete
    //   3.bookings delete
    //       4.ads delete

    app.delete(
      "/user-delete/:email",
      jwtVerify,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = {
          email: email,
        };
        const result = await users.deleteOne(filter);
        res.send(result);
      }
    );

    app.delete("/ad-delete/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        seller: email,
      };

      const ads = await advertisements.find(query).toArray();
      if (ads.length === 0) {
        return res.send({ message: "no ads found" });
      }

      const result = await advertisements.deleteMany(query);
      res.send(result);
    });

    app.delete(
      "/user-product-delete/:email",
      jwtVerify,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = {
          sellerEmail: email,
        };

        const getProducts = await products.find(filter).toArray();
        if (getProducts.length === 0) {
          return res.send({ message: "No products found" });
        }

        const result = await products.deleteMany(filter);
        res.send(result);
      }
    );

    app.delete("/orders-delete/:email", async (req, res) => {
      const email = req.params.email;
      const filter = {
        seller: email,
      };

      const getProducts = await orders.find(filter).toArray();
      if (getProducts.length === 0) {
        return res.send({ message: "No products found" });
      }

      const result = await orders.deleteMany(filter);
      res.send(result);
    });
    app.delete(
      "/buyer-orders-delete/:email",
      jwtVerify,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = {
          buyerEmail: email,
        };

        const getProducts = await orders.find(filter).toArray();
        if (getProducts.length === 0) {
          return res.send({ message: "No products found" });
        }

        const result = await orders.deleteMany(filter);
        res.send(result);
      }
    );

    //report by buyer
    app.post(
      "/reported-item-buyer",
      jwtVerify,
      verifyUser,
      async (req, res) => {
        const repItem = req.body;
        const result = await reportedItems.insertOne(repItem);
        res.send(result);
      }
    );

    //get reported item for admin
    app.get("/reported-item", jwtVerify, verifyAdmin, async (req, res) => {
      const filter = {};
      const result = await reportedItems.find(filter).toArray();
      res.send(result);
    });

    //get reported item for buyer
    app.get('/reported-item-buyer', async (req, res) => {
      const email = req.query.email;
      const filter = {
        reporterEmail: email
      }
      const result = await reportedItems.find(filter).toArray();
      res.send(result)
    })

    //delete reported item
    app.delete(
      "/reported-item/:id",
      jwtVerify,
      verifyUser,
      async (req, res) => {
        const id = req.params.id;
        const filter = {
          pID: id,
        };

        const result = await reportedItems.deleteMany(filter);

        res.send(result);
      }
    );
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

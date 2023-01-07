const express = require('express');
const app = express();
const port = process.env.PORT || 5001;
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken')

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rtntsud.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categories = client.db("arkDEALS").collection("categories");
        const users = client.db("arkDEALS").collection("users");
        const products = client.db("arkDEALS").collection("products");
        const orders = client.db("arkDEALS").collection("orders");
        const advertisements = client.db("arkDEALS").collection("advertisements");

        //add users to database
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        //provide jwt token for new users
        app.get('/jwt',async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await users.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '10d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        })

    }
    finally {

    }
}
run().catch(err =>console.log(err))




app.get('/', (req, res) => {
    res.send("ARK Deals server running")
})

app.listen(port, () => {
    console.log("Ark Deals running on port " + port);
})
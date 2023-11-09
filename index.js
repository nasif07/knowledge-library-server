const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
var cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;


app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://knowledge-library-c3978.web.app',
        'https://knowledge-library-c3978.firebaseapp.com'
    ],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser())








const uri = "mongodb+srv://nasifulislamnasif23:PKEDlyZEutSA6rrW@cluster0.15re2ud.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('value in the moddleware', req.cookies.token);
    if (!token) {
        return res.status(401).send({ message: 'not authorized' })
    }
    jwt.verify(token, process.env.ACCESS_token_SECRET, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).send({ message: 'unauthorized' })
        }
        console.log('value in the token', decoded);
        req.user = decoded;
        next()
    })
}

async function run() {
    try {

        const bookCollection = client.db("bookCollectionDB").collection("allBooks");
        const categoryCollection = client.db('bookCategoryDB').collection("allCategories");
        const borrowedCollection = client.db('borrowedCollectionDB').collection("BorrowedItem");


        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_token_SECRET, { expiresIn: '10h' })

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none'
                })
                .send({ success: true });
        })



        // category
        app.get("/allcategory", async (req, res) => {
            const result = await categoryCollection.find().toArray();
            res.send(result)
            // console.log(result);
        });

        // show category  wise collor
        app.post("/allbooks", verifyToken, async (req, res) => {
            const book = req.body;
            const email = req.query.email;
            const tokenEmail = req.user.email;

            if (email !== tokenEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const result = await bookCollection.insertOne(book);
            // console.log(result);
            res.send(result)
        });


        app.get("/allbooks", async (req, res) => {

            let sortObj = {}
            const sortField = req.query.sortField;
            const sortOrder = req.query.sortOrder;
            let sortByPositive = {}

            if(sortField && sortOrder){
                sortObj[sortField] = sortOrder;
                console.log(sortField, sortOrder)
                // const quantity1 = { $gt: 0 }
                // sortByPositive['quantity'] = { $ne: 0 };
                sortByPositive = { quantity: { $gt: 0 } }
                
            }
            console.log(sortByPositive)


            const curson = bookCollection.find(sortByPositive).sort(sortObj);
            const result = await curson.toArray()
            res.send(result);
            // console.log(result);
        })

        app.get("/allbooks/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = {
                _id: new ObjectId(id)
            }
            const result = await bookCollection.findOne(query);
            res.send(result);
            console.log(result);
        });

        app.put("/allbooks/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const email = req.query.email;
            const tokenEmail = req.user.email;
            if (email !== tokenEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            // console.log('fai gei', email);
            const data = req.body;
            const filter = {
                _id: new ObjectId(id)
            };
            const options = { upsert: true };
            const updatedData = {
                $set: {
                    image: data.image,
                    name: data.name,
                    authorName: data.authorName,
                    category: data.category,
                    description: data.description,
                    quantity: data.quantity,
                    rating: data.rating
                }
            };
            const result = await bookCollection.updateOne(filter, updatedData, options);
            res.send(result);
        })

        // borrowed route



        app.get('/borrowed', async (req, res) => {
            console.log(req.query);
            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            console.log(query);
            const result = await borrowedCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/borrowed', async (req, res) => {

            const borrowed = req.body;
            const postName = req.body.name;
            const postEmail = req.body.email
            console.log('in the input',postName, postEmail);

            const id = req.params.id;
            console.log('boorwed item', borrowed);
            // console.log(id);
            const query = {
                name: postName,
                email: postEmail
            }

            const existingDocument = await borrowedCollection.findOne(query);
            console.log(existingDocument);


            // const existingDocument = await collection.findOne(dataToInsert);
            // console.log(borrowed);
            
            // res.send(result)

            if (existingDocument) {
                res.status(409).json({ message: 'Data already exists' });
              } else {
                const result = await borrowedCollection.insertOne(borrowed);
                res.send(result)
              }
        });

        app.delete('/borrowed/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await borrowedCollection.deleteOne(query)
            res.send(result);
        })








        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server is running!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
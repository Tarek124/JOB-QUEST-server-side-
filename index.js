const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cookiePerser = require("cookie-parser");
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookiePerser());

//coustome middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send("unauthorized user");
  }
  try {
    jwt.verify(token, secret_key, (err, decoded) => {
      if (err) {
        return res.status(401).send("unauthorized user");
      }
      req.user = decoded;
      next();
    });
  } finally {
  }
};

//Home route
app.get("/", (req, res) => {
  res.send("Welcome");
});
// Secret key for Json Web Token
const secret_key = process.env.SECRET_KEY;
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  ClientSession,
} = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.83drhwd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
    const jobCollection = client.db("assignment-11").collection("jobs");
    const applyedJobCollection = client
      .db("assignment-11")
      .collection("applyedJob");

    app.get("/allJobs", async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    });
    app.get("/updateJobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });
    app.get("/jobdetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });
    app.get("/user", async (req, res) => {
      const { email } = req.query;
      const query = { email };
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });
    //create json web token and set in cookie
    app.post("/jsonwebtoken", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, secret_key, { expiresIn: "7d" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
        })
        .send("JWT created and set in cookie");
    });
    // add a new job to database
    app.post("/addedJobs", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });
    //clear cookie
    app.get("/logout", (req, res) => {
      // Clear cookie on the client-side
      res.clearCookie("token").send("Logged out successfully");
      console.log("Logged out successfully");
    });
    // Route for searching jobs by title
    app.get("/jobs/search", async (req, res) => {
      const { query } = req.query;
      const regex = new RegExp(query, "i");
      const searchQuery = { category: { $regex: regex } };
      const searchQuery2 = { title: { $regex: regex } };

      try {
        const searchResults = await jobCollection
          .find({ $or: [searchQuery, searchQuery2] })
          .toArray();
        res.send(searchResults);
      } catch (error) {
        console.error("Error searching jobs:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    app.delete("/deleteJob", async (req, res) => {
      const { id } = req.query;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/deleteAppliedJob", async (req, res) => {
      const { id } = req.query;
      const query = { _id: new ObjectId(id) };
      const result = await applyedJobCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/updateJobs", async (req, res) => {
      const updatedJob = req.body;
      const query = { _id: new ObjectId(updatedJob._id) };
      const { _id, ...updateFields } = updatedJob;
      const updateDocument = {
        $set: updateFields,
      };
      const result = await jobCollection.updateOne(query, updateDocument);
      res.send(result);
    });
    app.post("/applyForJob", async (req, res) => {
      const applyedJob = req.body;
      if (applyedJob.hasOwnProperty("_id")) {
        // Assign the value to the new key
        applyedJob["job_id"] = applyedJob["_id"];
        // Delete the old key
        delete applyedJob["_id"];
        const result = await applyedJobCollection.insertOne(applyedJob);
        res.send(result);
      }
    });
    app.get("/applyForJob", async (req, res) => {
      const { id, name, email } = req.query;
      const query = { job_id: id, email, displayName: name };
      const result = await applyedJobCollection.findOne(query);
      res.send(result);
    });
    app.get("/allApplyForJob", async (req, res) => {
      const { name, email, category } = req.query;
      const query =
        category !== "All"
          ? {
              email,
              displayName: name,
              category: { $regex: category, $options: "i" },
            }
          : { email, displayName: name };
      const result = await applyedJobCollection.find(query).toArray();
      res.send(result);
    });
    ///updateApplicants
    app.put("/updateApplicants", async (req, res) => {
      const { applicants, id } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          applicants,
        },
      };
      const result = await jobCollection.updateOne(query, updateDoc);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`app is running at http://localhost:${port}`);
});

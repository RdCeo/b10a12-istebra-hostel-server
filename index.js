require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const { connection, client } = require("./DB/MongoDB");
const { ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
connection();

//Middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://istebra-hostel.netlify.app",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(cookieParser());
//Middleware

//Custom Middleware
// JWT verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.user = decoded;
    next();
  });
};
const verifyAdmin = async (req, res, next) => {
  const email = req.user.email;
  const user = await usersCollection.findOne({ email });
  if (!user || user.role !== "admin") {
    return res.status(403).send({ message: "Forbidden" });
  }
  next();
};
//Custom Middleware

//All Collection mealsCollection
const usersCollection = client.db("hostelManagement").collection("users");
const mealsCollection = client.db("hostelManagement").collection("meals");
const premiumsCollection = client.db("hostelManagement").collection("premiums");
const paymentCollection = client.db("hostelManagement").collection("payments");
const reviewCollection = client.db("hostelManagement").collection("reviews");
const requestMealCollection = client
  .db("hostelManagement")
  .collection("requestMeals");
const upcomingLikeCollection = client
  .db("hostelManagement")
  .collection("likes");
//All Collection

//Create token use jwt
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ success: true });
});
app.post("/logout", async (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ success: true });
});
//Create token use jwt

//Save all Users Data in Users Collection
app.post("/users", async (req, res) => {
  const user = req.body;
  const existUsers = await usersCollection.findOne({ email: user.email });
  if (existUsers) {
    return res.send("User already exist");
  }
  const result = await usersCollection.insertOne(user);
  res.send(result);
});
//Save all Users Data in Users Collection

//get data from User Collection by role base
app.get("/user/role/:email", async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ email });
  if (user) {
    res.send(user.role);
  } else {
    res.status(404).send("User not found");
  }
});
//get data from User Collection by role base

//Create payment Intent
app.post("/create-payment-intent", verifyToken, async (req, res) => {
  const { price } = req.body;
  const amount = price * 100;
  const { client_secret } = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // res.send({ clientSecret: response.client_secret });
  res.send(client_secret);
});
app.post("/payment-info", verifyToken, async (req, res) => {
  const payment = req.body;
  const result = await paymentCollection.insertOne(payment);
  res.send(result);
});
// ===========Admin Related============
app.get("/admin/:email", verifyToken, verifyAdmin, async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ email });
  res.send(user);
});
app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  const query = req.query.search;
  if (query) {
    const searchUser = await usersCollection
      .find({
        $or: [
          {
            email: { $regex: query, $options: "i" },
          },
          {
            displayName: { $regex: query, $options: "i" },
          },
        ],
      })
      .toArray();
    res.send(searchUser);
    return;
  }

  const users = await usersCollection.find().toArray();
  res.send(users);
});
app.patch("/users/role/:id", async (req, res) => {
  const id = req.params.id;
  const { role } = req.body;
  const updateDoc = {
    $set: { role: role },
  };
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    updateDoc
  );
  res.send(result);
});
app.post("/add-meals", verifyToken, verifyAdmin, async (req, res) => {
  const meal = req.body;
  const result = await mealsCollection.insertOne(meal);
  res.send(result);
});
app.get("/all-meals-admin", verifyToken, verifyAdmin, async (req, res) => {
  const { sortBy } = req.query;
  const validSortFields = ["likes", "reviews"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "likes";

  const meals = await mealsCollection
    .find()
    .sort({ [sortField]: -1 })
    .toArray();
  const mealsWithAverageRating = meals.map((meal) => {
    const ratings = meal.rating || [];
    const totalRating = ratings.reduce((acc, rate) => acc + rate, 0);
    const averageRating =
      ratings.length > 0 ? (totalRating / ratings.length).toFixed(1) : 0;
    return {
      ...meal,
      averageRating: parseFloat(averageRating),
    };
  });
  res.send(mealsWithAverageRating);
});
app.delete("/delete/meal/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const result = await mealsCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});
app.get("/view-meal/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const meal = await mealsCollection.findOne({ _id: new ObjectId(id) });
  const mealRating = meal?.rating?.map((rate) => rate);
  const reduceRating = mealRating?.reduce((acc, rating) => acc + rating, 0);
  const averageRating =
    mealRating?.length > 0 ? Math.round(reduceRating / mealRating?.length) : 0;
  res.send({ ...meal, averageRating });
});
app.get("/get-admin-reviews", verifyToken, verifyAdmin, async (req, res) => {
  const reviews = await reviewCollection.find().toArray();
  res.send(reviews);
});
app.get("/all-serves", verifyToken, verifyAdmin, async (req, res) => {
  const query = req.query.search;
  if (query) {
    const searchUser = await requestMealCollection
      .find({
        $or: [
          {
            "customer.email": { $regex: query, $options: "i" },
          },
          {
            "customer.name": { $regex: query, $options: "i" },
          },
        ],
      })
      .toArray();
    res.send(searchUser);
    return;
  }
  const serves = await requestMealCollection.find().toArray();
  res.send(serves);
});
app.patch(
  "/all-serves/status/:id",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const updateDoc = {
      $set: { status: status },
    };
    const result = await requestMealCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );
    res.send(result);
  }
);
app.patch(
  "/all-meals/updata/:id",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const id = req.params.id;
    const meal = req.body;
    const updateDoc = {
      $set: {
        title: meal.title,
        price: meal.price,
        description: meal.description,
        category: meal.category,
        postTime: meal.postTime,
        ingredients: meal.ingredients,
        image: meal.image,
      },
    };
    const result = await mealsCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );
    res.send(result);
  }
);
app.get("/upcoming-meals-admin", verifyToken, verifyAdmin, async (req, res) => {
  const upComing = await mealsCollection
    .find()
    .sort({
      likes: -1,
    })
    .toArray();
  const statusFilter = upComing.filter((meal) => meal.status === "upcoming");
  res.send(statusFilter);
});
app.get(
  "/upcoming-meals-admin/:id",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const id = req.params.id;
    const meal = await mealsCollection.findOne({ _id: new ObjectId(id) });
    res.send(meal);
  }
);
app.patch(
  "/update-status-upcoming-meals-admin/:id",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: "published",
      },
    };
    const result = await mealsCollection.updateOne(filter, updateDoc);
    res.send(result);
  }
);
// ===========Admin Related============

// ===========User Related============
app.get("/user/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ email });
  res.send(user);
});
app.get("/all-meals", async (req, res) => {
  const category = req.query.category;
  const meals =
    category === "All Meals"
      ? await mealsCollection.find().toArray()
      : await mealsCollection.find({ category }).toArray();

  const mealsWithAverageRating = meals.map((meal) => {
    const ratings = meal.rating || [];
    const totalRating = ratings.reduce((acc, rate) => acc + rate, 0);
    const averageRating =
      ratings.length > 0 ? (totalRating / ratings.length).toFixed(1) : 0;
    return {
      ...meal,
      averageRating: parseFloat(averageRating),
    };
  });
  const statusByFilter = mealsWithAverageRating.filter(
    (meal) => meal.status === "published"
  );
  res.send(statusByFilter);
  // res.send(filteredMeals);
});
app.get("/meal-details/:id", async (req, res) => {
  const id = req.params.id;
  const meal = await mealsCollection.findOne({ _id: new ObjectId(id) });
  const ratings = meal.rating.map((rating) => rating) || [];
  const ratingReduce = ratings.reduce((acc, rating) => acc + rating, 0);
  const averageRating =
    ratings.length > 0 ? Math.floor(ratingReduce / ratings.length) : 0;
  const mealWithRating = { ...meal, averageRating };
  res.send({ meal: mealWithRating });
});
app.patch("/update-like/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const { userEmail } = req.body;

  const likedUser = await upcomingLikeCollection.findOne({
    likeId: id,
    userEmail,
  });
  if (likedUser) {
    return res
      .status(400)
      .send({ message: "User has already liked this meal." });
  }
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $inc: { likes: 1 },
  };
  const result = await mealsCollection.updateOne(filter, updateDoc);
  res.send(result);
});
app.post("/upcoming-meal-like", verifyToken, async (req, res) => {
  const likeData = req.body;
  const result = await upcomingLikeCollection.insertOne(likeData);
  res.send(result);
});
app.get("/check-subscription/:email", async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ email });
  res.send(user);
});
app.get("/all-premiums", async (req, res) => {
  const premiums = await premiumsCollection.find().toArray();
  res.send(premiums);
});
app.get("/all-premiums/:package", verifyToken, async (req, res) => {
  const packageType = req.params.package;
  const premiums = await premiumsCollection.findOne({ name: packageType });
  res.send(premiums);
});
app.patch("/update-based", verifyToken, async (req, res) => {
  const { email, packageType } = req.body;
  const filter = { email: email };
  const updateDoc = {
    $set: { badge: packageType },
  };
  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
});
app.post("/request-meal", verifyToken, async (req, res) => {
  const requestMeal = req.body;
  const result = await requestMealCollection.insertOne(requestMeal);
  res.send(result);
});
app.get("/meal/requested/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  const requestedMeals = await requestMealCollection
    .find({ "customer.email": email })
    .toArray();
  res.send(requestedMeals);
});
app.get("/payment/history/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  const paymentHistory = await paymentCollection
    .find({ "customer.email": email })
    .toArray();
  res.send(paymentHistory);
});
app.post("/reviews", verifyToken, async (req, res) => {
  const review = req.body;
  const result = await reviewCollection.insertOne(review);
  res.send(result);
});
app.get("/reviews/:id", async (req, res) => {
  const id = req.params.id;
  const reviews = await reviewCollection.find({ foodId: id }).toArray();
  res.send(reviews);
});
app.patch("/update-reviews/:id", verifyToken, async (req, res) => {
  const { status } = req.body;
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  let updateDoc;
  if (status === "inc") {
    updateDoc = {
      $inc: { reviews: 1 },
    };
  }
  if (status === "dec") {
    updateDoc = {
      $inc: { reviews: -1 },
    };
  }
  const result = await mealsCollection.updateOne(filter, updateDoc);
  res.send(result);
});
app.get("/reviews/user/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  const reviews = await reviewCollection
    .find({ "customer.email": email })
    .toArray();
  res.send(reviews);
});
app.delete("/request-meal/cancel/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const result = await requestMealCollection.deleteOne({
    _id: new ObjectId(id),
  });
  res.send(result);
});
app.get("/api/meals", async (req, res) => {
  const { search, category, minPrice, maxPrice } = req.query;

  let filter = {};
  if (search) {
    filter = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { ingredients: { $regex: search, $options: "i" } },
      ],
    };
  }
  if (category) {
    filter.category = category;
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) {
      filter.price.$gte = Number(minPrice);
    }
    if (maxPrice) {
      filter.price.$lte = Number(maxPrice);
    }
  }

  const meals = await mealsCollection
    .find(filter)

    .toArray();

  const statusByMeals = meals.filter((meal) => meal.status === "published");
  res.send({
    meals: statusByMeals,
  });
});

app.patch("/update-rating/:id", verifyToken, async (req, res) => {
  const { rating } = req.body;
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $push: { rating: rating },
  };
  const result = await mealsCollection.updateOne(filter, updateDoc);
  res.send(result);
});
app.delete("/delete-reviews/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const result = await reviewCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});
app.get("/users-reviews/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const reviews = await reviewCollection.findOne({ _id: new ObjectId(id) });

  res.send(reviews);
});
app.patch("/user-update-reviews/:id", verifyToken, async (req, res) => {
  const { description, reviewRatings } = req.body;
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: { description, reviewRatings },
  };
  const result = await reviewCollection.updateOne(filter, updateDoc);
  res.send(result);
});
app.get("/meal/upcoming-user", async (req, res) => {
  const upcomingMeals = await mealsCollection
    .find({
      status: "upcoming",
    })
    .toArray();
  res.send(upcomingMeals);
});
// ===========User Related============
app.get("/", (req, res) => {
  res.send("Istebra Hostel Management System is running");
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

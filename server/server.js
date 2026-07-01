const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to the LifewoodDB"))
    .catch((err) => console.error("Error", err));

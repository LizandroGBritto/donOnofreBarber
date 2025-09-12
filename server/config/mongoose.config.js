const mongoose = require('mongoose');
const db_name = process.env.DB_NAME || "AlonzoDB";

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log(`Successfully connected to ${db_name}`))
    .catch((err) => console.log(`mongoose connection to ${db_name} failed:`, err));

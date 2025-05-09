const mongoose = require("mongoose");

const connectToDb = () => {
    mongoose.connect(process.env.ATLAS_DB)
        .then(res => {
            console.log("Connected");
        })
        .catch(err => {
            console.log(err);
        })
}

module.exports = connectToDb;
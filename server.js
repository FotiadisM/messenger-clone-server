const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(cors());

const PORT = 3001

const url = 'mongodb://localhost:27017';
const dbName = 'messenger';

const saltRounds = 10;

app.post('/register', (req, res) => {
  const { name , email, password } = req.body;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if(err) { console.log(err) }

    const item = {
      email: email,
      hash: hash
    }

    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if(err) { console.log(err) }
      const db = client.db(dbName);
      db.collection('login').insertOne(item, (err, result) => {
        if(err) { console.log(err) }
        client.close();
        res.status(200).json('User Inserted');
      });
    });
  });
})

app.listen(PORT, err => {
  if (err) {
    console.error(err)
  } else {
    console.log(`Running on port ${PORT}`)
  }
})
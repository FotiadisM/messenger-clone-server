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
const options = {
  useUnifiedTopology: true
  // server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
  // replset: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } }
};


const saltRounds = 10;

const checkEmail = (db, email, callback) => {
  db.collection('login').find({email: email}).toArray((err, result) => {
    if(err) { console.log(err) }
    if(result.length === 0) {
      callback(true)
    }
    else {
      callback(false);
    }
  });
}

const validateSignIn = (db, { email, password, }, callback) => {
  db.collection('login').find({email: email}).toArray((err, result) => {
    if(err) { console.log(err) }
    if(result.length === 0) {
      callback(false);
    }
    else {
      bcrypt.compare(password, result[0].hash, (err, valid) => {
        if(err) { console.log(err) }
        callback(valid);
      });
    }
  });
}

app.post('/login', (req,res) => {
  const { email } = req.body;

  MongoClient.connect(url, options, (err, client) => {
    if(err) { console.log(err) }
    const db = client.db(dbName);

    validateSignIn(db, req.body, (valid) => {
      if(valid) {
        db.collection('users').find({email: email}).toArray((err, result) => {
          if(err) { console.log(err) }
          res.status(200).json(result[0]);
        });
      }
      else {
        res.json(null);
      }
    })
    // client.close();
  });
})

app.post('/register', (req, res) => {
  const { name , email, password } = req.body;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if(err) { console.log(err) }

    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if(err) { console.log(err) }
      const db = client.db(dbName);

      checkEmail(db, email, (exist) => {

        if(exist) {
          db.collection('login').insertOne({
            email: email,
            hash: hash
          }, (err, result) => { if(err) console.log(err) });

          db.collection('users').insertOne({
            name: name,
            email: email,
            status: true,
            friends: [],
            joined: Date()
          }, (err, result) => { if(err) console.log(err) });

          db.collection('users').find({email: email}).toArray((err, result) => {
            if(err) { console.log(err) }
            res.status(200).json(result[0]);
          });
        }
        else {
          res.json(null);
        }
        // client.close();
      })
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
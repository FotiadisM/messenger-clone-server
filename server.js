const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');

const Chatkit = require('@pusher/chatkit-server');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(cors());

const PORT = 3001

const saltRounds = 10;

const url = 'mongodb://localhost:27017';
const dbName = 'messenger';
const options = {
  useUnifiedTopology: true
  // server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
  // replset: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } }
};

const chatkit = new Chatkit.default({
  instanceLocator: '',
  key: ''
})

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

const validateSignIn = (db, { email, password }, callback) => {
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

app.post('/authenticate', (req, res) => {
  const authData = chatkit.authenticate({ userId: req.query.user_id })
  res.status(authData.status).send(authData.body)
});

app.post('/login', (req,res) => {
  const { email } = req.body;

  MongoClient.connect(url, options, (err, client) => {
    if(err) { console.log(err) }
    const db = client.db(dbName);

    validateSignIn(db, req.body, (valid) => {
      if(valid) {
        db.collection('users').find({email: email}).toArray((err, result) => {
          if(err) { console.log(err) }
          client.close();
          res.status(200).json(result[0]);
        });
      }
      else {
        client.close();
        res.json(null);
      }
    })
  });
})

app.post('/register', (req, res) => {
  const { name , email, password } = req.body;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if(err) { console.log(err) }

    MongoClient.connect(url, options, (err, client) => {
      if(err) { console.log(err) }
      const db = client.db(dbName);

      checkEmail(db, email, (exist) => {

        if(exist) {
          db.collection('login').insertOne({
            email: email,
            hash: hash
          }, (err, result) => {
             if(err) { console.log(err) }

             db.collection('users').insertOne({
               name: name,
               email: email,
               status: true,
               friends: [],
               requests: [],
               joined: Date()
             }, (err, result) => {
                if(err) { console.log(err) }

                db.collection('users').find({email: email}).toArray((err, result) => {
                  if(err) { console.log(err) }

                  chatkit.createUser({
                    id: result[0]._id,
                    name: result[0].name
                  });

                  client.close();
                  res.status(200).json(result[0]);
                });
             });
          });
        }
        else {
          client.close();
          res.json(null);
        }
      })
    });
  });
})

app.post('/acceptRequest', (req, res) => {
  const { id, name, user } = req.body;

  chatkit.createRoom({
    creatorId: id,
    name: id,
    isPrivate: true,
    userIds: [id, user.id]
  })
  .then(room => {

    MongoClient.connect(url, options, (err, client) => {
      if(err) { console.log(err) }
      const db = client.db(dbName);
  
      db.collection('users').updateOne({_id: ObjectId(id)}, {$pull: {requests: {_id: user.id}}}, (err, result) => {
        if(err) { console.log(err) }
  
        db.collection('users').updateOne({_id: ObjectId(id)}, {$addToSet: {friends: {
          _id: user.id,
          name: user.name,
          roomId: room.id
        }}}, (err, result) => {
          if(err) { console.log(err) }
  
          db.collection('users').updateOne({_id: ObjectId(user.id)}, {$addToSet: {friends: {
            _id: id,
            name: name,
            roomId: room.id
          }}}, (err, result) => {
            if(err) { console.log(err) }
  
            db.collection('users').find({_id: ObjectId(id)}).toArray((err, result) => {
              if(err) { console.log(err) }
  
              client.close();
              res.status(200).json({friends: result[0].friends, requests: result[0].requests});
            });
          });
        });
      });
    })
  })

})

app.post('/sendRequest', (req, res) => {
  const { email, user } = req.body;

  MongoClient.connect(url, options, (err, client) => {
    if(err) { console.log(err) }
    const db = client.db(dbName);

    db.collection('users').updateOne({email: email}, {$addToSet: {requests: {
      _id: user.id,
      name: user.name
    }}}, (err, result) => {
        if(err) { console.log(err) }
        client.close();
        res.status(200).json();
    });
  })
})

app.post('/users', (req, res) => {
  const { email } = req.body
  MongoClient.connect(url, options, (err, client) => {
    if(err) { console.log(err) }
    const db = client.db(dbName);

    db.collection('users').find({email: email}).toArray((err, result) => {
      if(err) { console.log(err) }

      friends = result[0].friends.map(user => {
        return user.name;
      });

      db.collection('users').find({email: {$ne: email}, name: {$nin: friends}}).toArray((err, result) => {
        if(err) { console.log(err) }
        client.close();
        res.status(200).json(result);
      });
    })
  });
})

app.listen(PORT, err => {
  if (err) {
    console.error(err)
  } else {
    console.log(`Running on port ${PORT}`)
  }
})
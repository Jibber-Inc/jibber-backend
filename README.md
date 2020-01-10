Benji Parse Sever implementation
https://github.com/parse-community/parse-server


### Locally
```
$ npm install -g parse-server mongodb-runner
$ mongodb-runner start
$ parse-server --appId APPLICATION_ID --masterKey MASTER_KEY --databaseURI mongodb://localhost/test
Note: If installation with -g fails due to permission problems (npm ERR! code 'EACCES'), please refer to this link.
```

### Inside a Docker container
```
$ git clone https://github.com/parse-community/parse-server
$ cd parse-server
$ docker build --tag parse-server .
$ docker run --name my-mongo -d mongo
$ docker run --name my-parse-server -p 1337:1337 --link my-mongo:mongo -d parse-server --appId APPLICATION_ID --masterKey MASTER_KEY --databaseURI mongodb://mongo/test
```

### Make a post
```
curl -X POST \
-H "X-Parse-Application-Id: BenjiApp" \
-H "Content-Type: application/json" \
-d '{"test": 1, "from":"Benny" }' \
http://benji-backend.herokuapp.com/parse/classes/Posts
```

### Get the post
```
curl -X GET \
-H "X-Parse-Application-Id: BenjiApp" \
http://benji-backend.herokuapp.com/parse/classes/Posts/${ POST_ID }
```


### Test cloud function
```
curl -X POST \
  -H "X-Parse-Application-Id: BenjiApp" \
  -H "Content-Type: application/json" \
  http://benji-backend.herokuapp.com/parse/functions/hello
```

### Create Twilio Token
```
curl -X POST \
  -H "X-Parse-Application-Id: BenjiApp" \
  -H "Content-Type: application/json" \
  http://benji-backend.herokuapp.com/parse/functions/createToken
```


### Send Code
```
curl -X POST \
  -H "X-Parse-Application-Id: BenjiApp" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "555-555-5555" }' \
  http://benji-backend.herokuapp.com/parse/functions/sendCode
```

### Validate Code
```
curl -X POST \
  -H "X-Parse-Application-Id: BenjiApp" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "206-353-9874", "authCode": "2788" }' \
  http://benji-backend.herokuapp.com/parse/functions/validateCode
```

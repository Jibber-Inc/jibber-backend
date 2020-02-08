Benji Parse Sever implementation
https://github.com/parse-community/parse-server


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

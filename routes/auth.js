var express = require('express');
var uuid = require('uuid');
var router = express.Router();
var jwt = require('jsonwebtoken');

router.post("/login", (req, res, next) => {  
  if(req.body.email == 'admin' && req.body.password == 'Singapore1') {
    var response = {
      sessionId: uuid.v4(),
      emailAddress: req.body.email,
      module: "ADMIN"
    };

    // Generate an access token
    let accessToken = jwt.sign(response, ACCESS_TOKEN_SECRET, {expiresIn: "30m"});
    res.setHeader('Set-Cookie', 'Authorization=' + accessToken + '; HttpOnly; Path=/; SameSite=None; Secure;');

    res.json(response);
  } else if(req.body.email == 'client' && req.body.password == 'Singapore1') {
    var response = {
      sessionId: uuid.v4(),
      clientId: "dummy-client",
      emailAddress: req.body.email,
      module: "CLIENT"
    };
  
    // Generate an access token
    let accessToken = jwt.sign(response, ACCESS_TOKEN_SECRET, {expiresIn: "30m"});
    res.setHeader('Set-Cookie', 'Authorization=' + accessToken + '; HttpOnly; Path=/; SameSite=None; Secure;');
    
    res.json(response);
  } else {
    res.status(403);
    res.json(req.body);
  }
});

router.post("/logout", (req, res, next) => {  
    res.cookie("Authorization", null, {maxAge: 0});
    res.status(204);
    res.json({});
});

router.post("/retrieve-password", (req, res, next) => {  
  var response = {
    account: {
      email: req.body.email
    }
  };

  res.json(response);
});

module.exports = router;

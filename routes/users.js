var express = require('express');
var uuid = require('uuid');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post("/login", (req, res, next) => {  
  if(req.body.username == 'CWLH' && req.body.password == 'Singapore') {
    var response = {
      accessToken: uuid.v4(),
      module: "ADMIN"
    };
  
    res.json(response);
  } else if(req.body.username == 'client' && req.body.password == 'password') {
    var response = {
      accessToken: uuid.v4(),
      module: "CLIENT"
    };
  
    res.json(response);
  } else {
    res.status(403);
    res.json({ error: "Invalid username or password" });
  }
});

router.get("/admin", (req, res, next) => {  
  var response = {
    credentials: {
      adminEmail: "admin@trendsafe.com"
    }
  };

  res.json(response);
});

module.exports = router;

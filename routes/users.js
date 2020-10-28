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
      module: req.body.module
    };
  
    res.json(response);
  } else {
    res.status(403);
    res.json({ error: "Invalid username or password" });
  }
});

module.exports = router;

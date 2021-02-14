var express = require('express');
var uuid = require('uuid');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
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

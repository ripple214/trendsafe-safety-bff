var express = require('express');
var router = express.Router();

var uuid = require('uuid');
var path = require('path');

var s3 = require('./s3');
const multer = require('multer');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "./uploads")
  }),
}).single('file');

router.post("/", upload, (req, res, next) => {
  let clientId = req.user.clientId;
  let group = req.body.group;
  let subgroup = req.body.subgroup;
  let file = req.file;
  let id = uuid.v4();
  let ext = path.extname(file.originalname);
  let key = clientId + '/' + group + '/' + subgroup + '/' + id + ext;

  s3.upload(file.path, key, function(response) {
    if (response.data) {
      response.data = {
        id: id + ext
      };

      var resp = response.data;
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

router.put("/", (req, res, next) => {
  let clientId = req.user.clientId;
  let group = req.body.group;
  let fromSubgroup = req.body.fromSubgroup;
  let toSubgroup = req.body.toSubgroup;
  let fromKey = clientId + '/' + group + '/' + fromSubgroup + '/';
  let toKey = clientId + '/' + group + '/' + toSubgroup;

  s3.move(fromKey, toKey, function(response) {
    if (response.error) {
      res.status(400);
      res.json(response);
    } else {
      res.status(204);
      res.json();
    }
  });
});

router.get("/:group/:subgroup/:file", (req, res, next) => {
  let clientId = req.user.clientId;
  let group = req.params.group;
  let subgroup = req.params.subgroup;
  let file = req.params.file;
  let key = clientId + '/' + group + '/' + subgroup + '/' + file;

  s3.download(key, function(response) {
    if (response.data) {
      let data = response.data;
      res.writeHead(200, {
        'Content-Type': data.content_type, 
        'Content-Length': data.content_length, 
      });
      res.write(data.body, 'binary');
      res.end(null, 'binary');
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

router.get("/:group/:subgroup", (req, res, next) => {
  let clientId = req.user.clientId;
  let group = req.params.group;
  let subgroup = req.params.subgroup;
  let key = clientId + '/' + group + '/' + subgroup;

  s3.list(key, function(response) {
    if (response.data) {
      var resp = response.data;
      res.status(200);
      res.json(resp);
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

router.delete("/:group/:subgroup/:file", (req, res, next) => {
  let clientId = req.user.clientId;
  let group = req.params.group;
  let subgroup = req.params.subgroup;
  let file = req.params.file;
  let key = clientId + '/' + group + '/' + subgroup + '/' + file;

  s3.delete(key, function(response) {
    if (response.data) {
      res.status(204);
      res.json();
    } else {
      res.status(400);
      res.json(response);
    }
  });
});

module.exports = router;

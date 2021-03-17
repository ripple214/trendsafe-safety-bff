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

router.post("/:type", upload, (req, res, next) => {
  let clientId = req.user.clientId;
  let type = req.params.type;
  let group = req.body.group;
  let subgroup = req.body.subgroup;
  let file = req.file;
  let id = uuid.v4();
  let ext = path.extname(file.originalname);
  if(type != "images") {
    id = file.originalname;
    ext = "";
  }
  let key = clientId + '/' + type + '/' + group + '/' + subgroup + '/' + id + ext;

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

router.put("/:type", (req, res, next) => {
  let clientId = req.user.clientId;
  let type = req.params.type;
  let group = req.body.group;
  let fromSubgroup = req.body.fromSubgroup;
  let toSubgroup = req.body.toSubgroup;
  let fromKey = clientId + '/' + group + '/' + fromSubgroup + '/';
  let toKey = clientId + '/' + type + '/' + group + '/' + toSubgroup;

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

router.get("/:type/:group/:subgroup/:file", (req, res, next) => {
  let clientId = req.user.clientId;
  let type = req.params.type;
  let group = req.params.group;
  let subgroup = req.params.subgroup;
  let file = req.params.file;
  let key = clientId + '/' + type + '/' + group + '/' + subgroup + '/' + file;

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

router.get("/:type/:group/:subgroup", (req, res, next) => {
  let clientId = req.user.clientId;
  let type = req.params.type;
  let group = req.params.group;
  let subgroup = req.params.subgroup;
  let key = clientId + '/' + type + '/' + group + '/' + subgroup;

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

router.delete("/:type/:group/:subgroup/:file", (req, res, next) => {
  let clientId = req.user.clientId;
  let type = req.params.type;
  let group = req.params.group;
  let subgroup = req.params.subgroup;
  let file = req.params.file;
  let key = clientId + '/' + type + '/' + group + '/' + subgroup + '/' + file;

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

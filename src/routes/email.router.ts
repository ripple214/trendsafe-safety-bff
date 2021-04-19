import { BffResponse } from 'common/bff.response';
import { default as express } from 'express';

import { email_service } from '../services/email.service';

export const router = express.Router();

router.post("/registration", function(req, res, next) {
  let toAddress: string = req.body.toAddress;
  let username: string = req.body.username;
  let password: string = req.body.password;

  email_service.send_registration( 
    {
      toAddress: toAddress,
      username: username, 
      password: password
    }, (response: BffResponse) => {
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

router.post("/password_changed", function(req, res, next) {
  let toAddress: string = req.body.toAddress;

  email_service.send_password_changed( 
    {
      toAddress: toAddress,
    }, (response: BffResponse) => {
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

router.post("/send_report", function(req, res, next) {
  let toAddresses: string[] = [].concat(req.body.toAddresses);
  let ccAddresses: string[] = [].concat(req.body.ccAddresses);
  let name: string = req.body.name;
  let reportName: string = req.body.toAddress;
  let filePath: string = req.body.filePath;

  email_service.send_report( 
    {
      toAddresses: toAddresses,
      ccAddresses: ccAddresses,
      name: name,
      reportName: reportName,
      filePath: filePath,
    }, (response: BffResponse) => {
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

import { default as express } from 'express';

export const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.status(200);
  res.json({status: 'up'});
});

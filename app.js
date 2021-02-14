var createError = require('http-errors');
var cors = require('cors')
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var usersRouter = require('./routes/users');
var starRouter = require('./routes/star');
var wearRouter = require('./routes/wear');
var hrcRouter = require('./routes/hrc');
var clientsRouter = require('./routes/clients');
var weightingsRouter = require('./routes/weightings');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(cors());

var corsOptions = {
  origin: 'http://localhost',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.use('/', indexRouter);
app.use('/auth', authRouter);

// jwt validator
ACCESS_TOKEN_SECRET = 'f6a5bb06-2655-40d5-8ba3-711690a95558';
const authenticateJWT = (req, res, next) => {
  const authorization = getAppCookies(req, res)['Authorization'];  
  if (authorization) {
      jwt.verify(authorization, ACCESS_TOKEN_SECRET, (err, user) => {
          if (err) {
              return res.sendStatus(403);
          }

          console.log("user", user);
          req.user = user;

          let response = {
            sessionId: user.sessionId,
            emailAddress: user.emailAddress,
            module: user.module
          };
          let accessToken = jwt.sign(response, ACCESS_TOKEN_SECRET, {expiresIn: "5m"});
          res.setHeader('Set-Cookie', 'Authorization=' + accessToken + '; HttpOnly; Path=/; SameSite=Strict;');
      
          next();
      });
  } else {
      res.sendStatus(401);
  }
};

// returns an object with the cookies' name as keys
const getAppCookies = (req) => {
  // We extract the raw cookies from the request headers
  const cookies = req.headers.cookie || "";
  console.log("cookies", cookies);
  const rawCookies = cookies.split('; ');
  // rawCookies = ['myapp=secretcookie, 'analytics_cookie=beacon;']

  const parsedCookies = {};
  rawCookies.forEach(rawCookie=>{
  const parsedCookie = rawCookie.split('=');
  // parsedCookie = ['myapp', 'secretcookie'], ['analytics_cookie', 'beacon']
    parsedCookies[parsedCookie[0]] = parsedCookie[1];
  });
  return parsedCookies;
};

app.use(function(req, res, next) {
  authenticateJWT(req, res, next);
});

app.use('/users', usersRouter);
app.use('/clients', clientsRouter);
app.use('/weightings', weightingsRouter);
app.use('/star', starRouter);
app.use('/wear', wearRouter);
app.use('/hrc', hrcRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

module.exports = app;

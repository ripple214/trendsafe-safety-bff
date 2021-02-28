var conf = require('config'); 

var createError = require('http-errors');
var cors = require('cors')
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var logger = require('morgan');
var nocache = require('nocache');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var kvpsRouter = require('./routes/kvps');
var hierarchiesRouter = require('./routes/hierarchies');
var locationAreasRouter = require('./routes/location-areas');
var equipmentsRouter = require('./routes/equipments');
var tasksRouter = require('./routes/tasks');
var sourcesRouter = require('./routes/sources');
var modulesRouter = require('./routes/modules');
var kpisRouter = require('./routes/kpis');
var risksRouter = require('./routes/risks');
var rulesRouter = require('./routes/rules');
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
app.use(bodyParser.json({ limit: '50mb', extended: true })); // support json encoded bodies
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // support encoded bodies
app.use(nocache());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

console.log("BFF_URL", conf.get('BFF_URL'));

var originsWhitelist = [
  conf.get('BFF_URL')
];
var corsOptions = {
  origin: function(origin, callback){
        var isWhitelisted = originsWhitelist.indexOf(origin) !== -1;
        callback(null, isWhitelisted);
  },
  credentials:true
}
app.use(cors(corsOptions));

app.set('etag', false);

app.all('/*', (req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});

// Add headers
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', conf.get('BFF_URL'));

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});


app.use('/', indexRouter);
app.use('/auth', authRouter);

// jwt validator
ACCESS_TOKEN_SECRET = 'f6a5bb06-2655-40d5-8ba3-711690a95558';
const authenticateJWT = (req, res, next) => {
  const authorization = getAppCookies(req, res)['Authorization'];
  //console.log("authorization", authorization);
  if (authorization) {
      jwt.verify(authorization, ACCESS_TOKEN_SECRET, (err, user) => {
          if (err) {
              return res.sendStatus(403);
          }

          req.user = user;

          let response = {
            sessionId: user.sessionId,
            clientId: user.clientId,
            emailAddress: user.emailAddress,
            module: user.module
          };
          let accessToken = jwt.sign(response, ACCESS_TOKEN_SECRET, {expiresIn: "30m"});
          res.setHeader('Set-Cookie', 'Authorization=' + accessToken + '; HttpOnly; Path=/; SameSite=Strict;');

          next();
      });
  } else {
      res.sendStatus(401);
  }
};

// returns an object with the cookies' name as keys
const getAppCookies = (req) => {
  const cookies = req.headers.cookie || "";
  const rawCookies = cookies.split('; ');

  const parsedCookies = {};
  rawCookies.forEach(rawCookie=>{
  const parsedCookie = rawCookie.split('=');
    parsedCookies[parsedCookie[0]] = parsedCookie[1];
  });
  return parsedCookies;
};

app.use(function(req, res, next) {
  authenticateJWT(req, res, next);
});

app.use('/kvps', kvpsRouter);
app.use('/hierarchies', hierarchiesRouter);
app.use('/location-areas', locationAreasRouter);
app.use('/equipments', equipmentsRouter);
app.use('/tasks', tasksRouter);
app.use('/sources', sourcesRouter);
app.use('/modules', modulesRouter);
app.use('/kpis', kpisRouter);
app.use('/risks', risksRouter);
app.use('/rules', rulesRouter);
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

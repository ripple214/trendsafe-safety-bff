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
var causesRouter = require('./routes/causes');
var modulesRouter = require('./routes/modules');
var kpisRouter = require('./routes/kpis');
var risksRouter = require('./routes/risks');
var rulesRouter = require('./routes/rules');
var usersRouter = require('./routes/users');
var assessorsRouter = require('./routes/assessors');
var categoryElementsRouter = require('./routes/category-elements');
var actionsRouter = require('./routes/actions');
var assessmentsRouter = require('./routes/assessments');
var inspectionsRouter = require('./routes/inspections');
var hazardsRouter = require('./routes/hazards');
var incidentsRouter = require('./routes/incidents');
var managementsRouter = require('./routes/managements');
var planningsRouter = require('./routes/plannings');
var performancesRouter = require('./routes/performances');
var indicatorsRouter = require('./routes/indicators');
var reportsRouter = require('./routes/reports');
var wearRouter = require('./routes/wear');
var hrcRouter = require('./routes/hrc');
var clientsRouter = require('./routes/clients');
var weightingsRouter = require('./routes/weightings');
var filesRouter = require('./routes/files');

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
console.log("APP_URL", conf.get('APP_URL'));
console.log("CONTEXT_PATH", conf.get('CONTEXT_PATH'));

var originsWhitelist = [
  conf.get('APP_URL'),
  conf.get('BFF_URL')
];

const contextPath = conf.get('CONTEXT_PATH');

var corsOptions = {
  origin: function(origin, callback){
    var isWhitelisted = !origin || originsWhitelist.indexOf(origin) !== -1;
    console.log("Origin is ", origin, "is this whitelisted?", isWhitelisted);
    callback(null, isWhitelisted);
  },
  methods: "GET,POST,OPTIONS,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization,Set-Cookie",
  preflightContinue: true,
  optionsSuccessStatus: 200,
  credentials:true
}

app.use(cors(corsOptions));

app.set('etag', false);

app.all('/*', (req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});

app.use(contextPath + '/', indexRouter);
app.use(contextPath + '/auth', authRouter);

// jwt validator
ACCESS_TOKEN_SECRET = 'f6a5bb06-2655-40d5-8ba3-711690a95558';
const authenticateJWT = (req, res, next) => {

  //req.user = {clientId: 'dummy-client', emailAddress: 'client'}; next(); //TODO remove these once ssl cert becomes available

  const authorization = getAppCookies(req, res)['Authorization'];
  //console.log("authorization is ", authorization);
  if (authorization) {
      jwt.verify(authorization, ACCESS_TOKEN_SECRET, (err, user) => {
          if (err) {
              return res.sendStatus(403);
          }

          req.user = user;

          let response = {
            session_id: user.session_id,
            client_id: user.client_id,
            email: user.email,
            module: user.module
          };
          if(user.module == 'CLIENT') {
            response.user_id = user.user_id;
            response.last_name = user.last_name;
            response.first_name = user.first_name;
            response.email = user.email;
            response.administrator = user.administrator;
            response.leader = user.leader;
            response.user = user.user;
            response.authorizer = user.authorizer;
            response.recipient = user.recipient;
            response.dataEntryDivisionIds = user.dataEntryDivisionIds;
            response.dataEntryProjectIds = user.dataEntryProjectIds;
            response.dataEntrySiteIds = user.dataEntrySiteIds;
            response.dataEntrySubsiteIds = user.dataEntrySubsiteIds;
            response.dataEntryDepartmentIds = user.dataEntryDepartmentIds;
            response.reportingDivisionIds = user.reportingDivisionIds;
            response.reportingProjectIds = user.reportingProjectIds;
            response.reportingSiteIds = user.reportingSiteIds;
            response.reportingSubsiteIds = user.reportingSubsiteIds;
            response.reportingDepartmentIds = user.reportingDepartmentIds;
          }
          let accessToken = jwt.sign(response, ACCESS_TOKEN_SECRET, {expiresIn: "30m"});
          res.setHeader('Set-Cookie', 'Authorization=' + accessToken + '; HttpOnly; Path=/; SameSite=Lax;');
          
          next();
      });
  } else {
    if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }
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

app.use(contextPath + '/kvps', kvpsRouter);
app.use(contextPath + '/hierarchies', hierarchiesRouter);
app.use(contextPath + '/location-areas', locationAreasRouter);
app.use(contextPath + '/equipments', equipmentsRouter);
app.use(contextPath + '/tasks', tasksRouter);
app.use(contextPath + '/sources', sourcesRouter);
app.use(contextPath + '/causes', causesRouter);
app.use(contextPath + '/modules', modulesRouter);
app.use(contextPath + '/kpis', kpisRouter);
app.use(contextPath + '/risks', risksRouter);
app.use(contextPath + '/rules', rulesRouter);
app.use(contextPath + '/users', usersRouter);
app.use(contextPath + '/clients', clientsRouter);
app.use(contextPath + '/weightings', weightingsRouter);
app.use(contextPath + '/files', filesRouter);
app.use(contextPath + '/assessors', assessorsRouter);
app.use(contextPath + '/category-elements', categoryElementsRouter);
app.use(contextPath + '/actions', actionsRouter);
app.use(contextPath + '/assessments', assessmentsRouter);
app.use(contextPath + '/inspections', inspectionsRouter);
app.use(contextPath + '/hazards', hazardsRouter);
app.use(contextPath + '/incidents', incidentsRouter);
app.use(contextPath + '/managements', managementsRouter);
app.use(contextPath + '/plannings', planningsRouter);
app.use(contextPath + '/performances', performancesRouter);
app.use(contextPath + '/indicators', indicatorsRouter);
app.use(contextPath + '/reports', reportsRouter);
app.use(contextPath + '/wear', wearRouter);
app.use(contextPath + '/hrc', hrcRouter);

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

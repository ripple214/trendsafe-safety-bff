import { default as conf } from 'config'; 

import { default as createError } from 'http-errors';
import { default as cors } from 'cors'
import { default as express } from 'express';
import { default as path } from 'path';
import { default as cookieParser } from 'cookie-parser';
import { default as jwt } from 'jsonwebtoken';
import { default as bodyParser } from 'body-parser';
import { default as logger } from 'morgan';
import { default as nocache } from 'nocache';

import { router as indexRouter } from './routes/index.router';
import { router as authRouter } from './routes/auth.router';
import { router as authCheckRouter } from './routes/auth-check.router';
import { router as kvpsRouter } from './routes/kvps.router';
import { router as hierarchiesRouter } from './routes/hierarchies.router';
import { router as locationAreasRouter } from './routes/location-areas.router';
import { router as equipmentsRouter } from './routes/equipments.router';
import { router as tasksRouter } from './routes/tasks.router';
import { router as sourcesRouter } from './routes/sources.router';
import { router as causesRouter } from './routes/causes.router';
import { router as modulesRouter } from './routes/modules.router';
import { router as kpisRouter } from './routes/kpis.router';
import { router as risksRouter } from './routes/risks.router';
import { router as rulesRouter } from './routes/rules.router';
import { router as usersRouter } from './routes/users.router';
import { router as assessorsRouter } from './routes/assessors.router';
import { router as categoryElementsRouter } from './routes/category-elements.router';
import { router as actionsRouter } from './routes/actions.router';
import { router as assessmentsRouter } from './routes/assessments.router';
import { router as inspectionsRouter } from './routes/inspections.router';
import { router as hazardsRouter } from './routes/hazards.router';
import { router as incidentsRouter } from './routes/incidents.router';
import { router as managementsRouter } from './routes/managements.router';
import { router as planningsRouter } from './routes/plannings.router';
import { router as performancesRouter } from './routes/performances.router';
import { router as indicatorsRouter } from './routes/indicators.router';
import { router as reportsRouter } from './routes/reports.router';
import { router as clientsRouter } from './routes/clients.router';
import { router as weightingsRouter } from './routes/weightings.router';
import { router as filesRouter } from './routes/files.router';
import { router as emailRouter } from './routes/email.router';
import { router as preferencesRouter } from './routes/preferences.router';
import { ACCESS_TOKEN_SECRET  } from './common/constants';

var app = express();

// view engine setup
//const __dirname = path.resolve(path.dirname(decodeURI(new URL(import.meta.url).pathname)));
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

var limit = '100mb';

app.use(logger('dev'));
app.use(express.json({ limit: limit }));
app.use(express.urlencoded({ extended: false, limit: limit }));
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: limit })); // support json encoded bodies
app.use(bodyParser.urlencoded({ limit: limit, extended: true })); // support encoded bodies
app.use(nocache());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

console.log("BFF_URL", conf.get('BFF_URL'));
console.log("APP_URL", conf.get('APP_URL'));
console.log("CONTEXT_PATH", conf.get('CONTEXT_PATH'));

var originsWhitelist = [
  "http://localhost:8100", // TODO remove this before going to prod
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
const authenticateJWT = (req, res, next) => {

  //req['user'] = {clientId: 'dummy-client', emailAddress: 'client'}; next(); //TODO remove these once ssl cert becomes available

  const authorization = getAppCookies(req)['Authorization'];
  //console.log("authorization is ", authorization);
  if (authorization) {
      jwt.verify(authorization, ACCESS_TOKEN_SECRET, (err, user) => {
          if (err) {
              return res.sendStatus(403);
          }

          req['user'] = user;

          let response:any = {
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
          //res.setHeader('Set-Cookie', 'Authorization=' + accessToken + '; HttpOnly; Path=/; SameSite=Lax;');
          res.setHeader('Set-Cookie', 'Authorization=' + accessToken + '; Path=/; SameSite=Lax;'); //TODO Fix this before going to prod
          
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

app.use(contextPath + '/auth-check', authCheckRouter);
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
app.use(contextPath + '/email', emailRouter);
app.use(contextPath + '/preferences', preferencesRouter);

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
  res.send({
    error: err
  });
  return;
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

export default app;
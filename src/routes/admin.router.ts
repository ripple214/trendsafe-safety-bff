
import { default as express } from 'express';

import { getUsersByType } from "./users.router";
import { login } from "./auth.router";
import { getCredentials } from './credentials.router';

export const router = express.Router();

router.post("/login-as-client", (req, res, next) => {
  let administrator = req['user'].module == 'ADMIN';

  //console.log("administrator", administrator, req['user'].module);
  if(administrator) {
    let clientId = req.body.client_id;
    let email = req.body.email;
  
    //console.log("post info", clientId, email);

    getUsersByType(clientId, 'Y',
      (users) => {
        let user = users.find(user => {
          //console.log("looking for user", user.email, email);
          return user.email == email;
        });

        //console.log("user", user);
  
        if(user) {
          getCredentials(email,
            (credentials) => {
              //console.log("credentials", credentials);
              login(email, credentials.sort_key, res,
                (data) => {
                  var resp = data;
                  res.status(200);
                  res.json(resp);
                }, 
                (error) => {
                  res.status(500);
                  res.json(error);
                }
              );
            }, 
            (error) => {
              res.status(500);
              res.json(error);
            }
          );
        } else {
          res.status(400);
          res.json({
            error: {
              message: "Client default admin user no longer exists.<br/><br/>Please contact system admin.", 
              id: email
            }
          });        
        }
      },
      (error) => {
        res.status(400);
        res.json(error);
      }
    );
  } else {
    res.status(400);
    res.json({
      error: {
        message: "This functionality is only available for admin accounts."
      }
    });        

  }
 
});

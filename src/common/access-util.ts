import { getModules } from "../routes/modules.router";

export const hasModuleAccess = async (req, res, module: string): Promise<boolean> => {
  let user = req['user'];
  let clientId = req['user'].client_id;

  if(user.module_access == undefined || user.module_access.indexOf(module) == -1) {
    noAccess(res);
    return false;
  } else {
    getModules(clientId,
      (modules) => {
        let m = modules.find(m => {
          return m.id == module;
        });
        if (m && m.is_activatable && m.is_activated) {
          return true;
        } else {
          noAccess(res);
          return false;
        }
      },
      (error) => {
        console.log(error);
        noAccess(res);
        return false;
      }
    );
  }
}

export const hasClientAdminAccess = (req, res): boolean => {
  let user = req['user'];

  if(!(user.module == 'CLIENT' && user.administrator == 'Y')) {
    noAccess(res);
    return false;
  }
  return true;
}

export const hasAdminAccess = (req, res): boolean => {
  let user = req['user'];

  if(user.module != 'ADMIN') {
    noAccess(res);
    return false;
  }
  return true;
}

const noAccess = (res) => {
  res.status(403);
  res.json({
    message: 'You do not have access to this module.'
  });
}
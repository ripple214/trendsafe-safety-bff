export const hasModuleAccess = (req, res, module: string): boolean => {
  let user = req['user'];

  if(user.module_access == undefined || user.module_access.indexOf(module) == -1) {
    noAccess(res);
    return false;
  }
  return true;
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
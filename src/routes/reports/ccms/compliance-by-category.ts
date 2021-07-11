import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';
import { retrieve as getCategories } from '../../category-elements.router';
import { isWithin } from '../../../common/date-util';
import { getTop10Hazards } from '../hazards/top-hazards';
import { getManagements } from '../../managements.router';
import { getHazards } from '../../hazards.router';

import { hasModuleAccess } from '../../../common/access-util';
import { checkNum } from '../../../common/number-util';

const moduleIdHazards = 'HR';
const moduleIdManagement = 'TRM';

/* GET compliance-by-category report */
export const ccmsComplianceByCategory = (req, res) => {
  if(!hasModuleAccess(req, res, moduleIdHazards) || !hasModuleAccess(req, res, moduleIdManagement)) return;

  getCCMSComplianceByCategory(req, 
    (data) => {
      res.status(200);
      res.json(data);
    },
    (error) => {
      res.status(400);
      res.json(error);
    }
  )
}

export const getCCMSComplianceByCategory = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let chartType = req.query.chartType;
  let hazardType = req.query.hazardType;

  let resp = undefined;
  let error = undefined;

  let categories = undefined;
  let ccms = undefined;
  let filter: HierarchyFilter = undefined;
  
  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.startDate = startDate;
        filter.endDate = endDate;
        filter.chartType = chartType;
        filter.hazardType = hazardType;

        //console.log(filter);
        resolve(true);
      }, 
      (err) => {
        error = err;
        reject(error);
      }
    );
  })
  .then((resolve, reject) => {
    getCCMs(clientId,  
      (data) => {
        ccms = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    //console.log("raw", moment(filter.startDate), moment(filter.endDate), ccms.length);
    ccms = filterCCMs(ccms, filter);
    //console.log("filtered", ccms.length);
    resolve(true);
  })
  .then((resolve) => {
    getCategories(req, "hazards", (data) => {
      categories = data;

      resolve(true);
    });
  })
  .then((resolve) => {
    getChartData(categories, ccms, filter,  
      (data) => {
        resp = {"report-data": data};

        resolve(true);
      }
    );
  })
  .fail((error) => {
    onFailure(error);
  })
  .success(() => {
    onSuccess(resp);
  })
  .execute();
};

const getChartData = (categories, ccms, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let topData = getTop10Hazards(categories, ccms, filter);
  let chartData = [];
  let tableData = [];

  let total = 0;

  categories.forEach((category) => {
    let nonCompliantCount = 0;

    category.elements.forEach((element) => {

      if((filter.hazardType == 'TOP' && topData.find(top => {
        return top.id == element.id
      })) || filter.hazardType != 'TOP') {
        ccms.forEach((ccm) => {
          let isNonCompliant = ccm.element_compliance[element.id] && ccm.element_compliance[element.id]['N'];

          if(isNonCompliant) {
            nonCompliantCount++;
            total++;
          }
        });
      }
    });

    if(nonCompliantCount > 0) {
      chartData.push({
        id: category.id,
        name: category.name,
        value: nonCompliantCount
      });

      tableData.push({
        categoryId: category.id,
        category: category.name,
        compliance: {
          n: {
            total: nonCompliantCount,
            percent_total: 0 //checkNum(+(nonCompliantCount / total * 100).toFixed(2))
          },
        }
      });
    }

  });

  chartData.forEach(data => {
    data.value = filter.chartType == 'BAR' ? data.value : checkNum(+(data.value / total * 100).toFixed(2))
  });

  chartData = chartData.sort((obj1, obj2) => {
    let diff = obj2.value - obj1.value;
    if(diff == 0) {
        return obj1.name.localeCompare(obj2.name);
    } else {
        return diff;
    }
  });

  tableData.forEach(data => {
    data.compliance.n.percent_total = checkNum(+(data.compliance.n.total / total * 100).toFixed(2))
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_hazards: total, 
    summary: chartData,
    details: tableData
  });  
}

export const getCCMs = (clientId: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let ccms = [];

  new SequentialExecutor()
  .chain((resolve, reject) => {
    getManagements(clientId,  
      (data) => {
        ccms = ccms.concat(data);
        //console.log("managements", data.length, ccms.length);
        resolve(true);
      }, 
      (error) => {
        reject(error);
      }
    );  
  })
  .then((resolve, reject) => {
    getHazards(clientId, undefined, 
      (data) => {
        ccms = ccms.concat(data);
        //console.log("hazards", data.length, ccms.length);
        resolve(true);
      }, 
      (error) => {
        reject(error);
      }
    );  
  })
  .fail((error) => {
    onError(error);
  })
  .success(() => {
    console.log("total", ccms.length);
    onSuccess(ccms);
  })
  .execute();
}

const filterCCMs = (ccms, filter: HierarchyFilter) => {
  //console.log("ccms", ccms);
  //console.log("filter", filter);

  let filteredCCMs = ccms.filter(ccm => {
    let isWithinDateRange = isWithin(ccm.completed_date, filter.startDate, filter.endDate);

    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      //console.log("site id", ccm.site_id, filter.filters);
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(ccm.site_id) > -1;
      } else if(filter.filterType == FilterType.DEPARTMENTS) {
        isWithinHierarchy = filter.filters.indexOf(ccm.department_id) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    return isWithinHierarchy;
  });

  return filteredCCMs;
  //console.log("filtered ccms", ccms);
}

const getHierarchyFilter = (req, onSuccess: (filter: HierarchyFilter) => void, onError?: (error: any) => void) => {
  let divisionId = req.query.divisionId;
  let projectId = req.query.projectId;
  let siteId = req.query.siteId;
  let subsiteId = req.query.subsiteId;
  let departmentId = req.query.departmentId;

  let filters: string[] = [];
  if(departmentId) {
    filters.push(departmentId);
    onSuccess({
      filterType: FilterType.DEPARTMENTS,
      filters: filters
    });
  } else if(subsiteId) {
    getFilteredDepartments(req, 
      (data) => {
        onSuccess({
          filterType: FilterType.DEPARTMENTS,
          filters: mapHierarchy(data)
        });
      }, 
      (err) => {
        onError(err);
      }
    );
  } else if(siteId) {
    filters.push(siteId);
    onSuccess({
      filterType: FilterType.SITES,
      filters: filters
    });
  } else if(projectId) {
    getFilteredSites(req, 
      (data) => {
        onSuccess({
          filterType: FilterType.SITES,
          filters: mapHierarchy(data)
        });
      }, 
      (err) => {
        onError(err);
      }
    );
  } else if(divisionId) {
    getFilteredSites(req, 
      (data) => {
        onSuccess({
          filterType: FilterType.SITES,
          filters: mapHierarchy(data)
        });
      }, 
      (err) => {
        onError(err);
      }
    );
  } else {
    onSuccess({
      filterType: FilterType.NONE,
      filters: []
    });
  }
}

const mapHierarchy = (data: any) => {
  let filters = data.map(hierarchy => {
    return hierarchy.id
  })

  return filters;
}


export interface HierarchyFilter {

  filterType: FilterType;
  filters: string[];
  startDate?: any;
  endDate?: any;
  chartType?: any;
  hazardType?: any;
}

enum FilterType {
  NONE,
  SITES,
  DEPARTMENTS
}
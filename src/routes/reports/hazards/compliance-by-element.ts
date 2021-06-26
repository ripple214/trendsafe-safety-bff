import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getHazards } from '../../hazards.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';
import { retrieve as getCategories } from '../../category-elements.router';
import { isWithin } from '../../../common/date-util';
import { getTop10Hazards } from './top-hazards';

import { hasModuleAccess } from '../../../common/access-util';
const moduleId = 'HR';

/* GET compliance-by-element report */
export const hazardsComplianceByElement = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  getHazardsComplianceByElement(req, 
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

export const getHazardsComplianceByElement = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let chartType = req.query.chartType;
  let hazardType = req.query.hazardType;
  let unsafeType = req.query.unsafeType;

  let resp = undefined;
  let error = undefined;

  let categories = undefined;
  let hazards = undefined;
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
        filter.unsafeType = unsafeType;

        resolve(true);
      }, 
      (err) => {
        error = err;
        reject(error);
      }
    );
  })
  .then((resolve, reject) => {
    getHazards(clientId, undefined, 
      (data) => {
        hazards = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    //console.log("raw", moment(filter.startDate), moment(filter.endDate), hazards);
    hazards = filterHazards(hazards, filter);
    //console.log("filtered", hazards);
    resolve(true);
  })
  .then((resolve) => {
    getCategories(req, "hazards", (data) => {
      categories = data;

      resolve(true);
    });
  })
  .then((resolve) => {
    getChartData(categories, hazards, filter,  
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

const getChartData = (categories, hazards, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let topData = getTop10Hazards(categories, hazards, filter);
  let chartData = [];
  let tableData = [];
  let hazard_summaries = {};

  let total = 0;

  categories.forEach((category) => {
    category.elements.forEach((element) => {
      let nonCompliantCount = 0;

      if((filter.hazardType == 'TOP' && topData.find(top => {
        return top.id == element.id
      })) || filter.hazardType != 'TOP') {
        hazards.forEach((hazard) => {
          let isNonCompliant = hazard.element_compliance[element.id]['N'];

          if(isNonCompliant) {
            nonCompliantCount++;
            total++;
          }

          hazard_summaries[hazard.name] = hazard.summary;
        });
  
        if(nonCompliantCount > 0) {
          chartData.push({
            id: element.id,
            name: element.name + ' ' + nonCompliantCount,
            value: nonCompliantCount
          });
  
          tableData.push({
            categoryId: category.id,
            category: category.name,
            elementId: element.id,
            element: element.name,
            compliance: {
              n: {
                total: nonCompliantCount,
                percent_total: 0 //checkNum(+(nonCompliantCount / total * 100).toFixed(0))
              },
            }
          });
        }
      }
    });
  });

  chartData.forEach(data => {
    data.value = filter.chartType == 'BAR' ? data.value : checkNum(+(data.value / total * 100).toFixed(0))
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
    data.compliance.n.percent_total = checkNum(+(data.compliance.n.total / total * 100).toFixed(0))
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_hazards: total, 
    summary: chartData,
    hazard_summaries: hazard_summaries,
    details: tableData
  });  
}

const filterHazards = (hazards, filter: HierarchyFilter) => {
  //console.log("hazards", hazards);
  //console.log("filter", filter);

  let filteredHazards = hazards.filter(hazard => {
    let isWithinDateRange = isWithin(hazard.completed_date, filter.startDate, filter.endDate);

    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      //console.log("site id", hazard.site_id, filter.filters);
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(hazard.site_id) > -1;
      } else if(filter.filterType == FilterType.DEPARTMENTS) {
        isWithinHierarchy = filter.filters.indexOf(hazard.department_id) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    let isUnsafeTypeMatched = false;
    if(isWithinHierarchy) {
      if(filter.unsafeType) {
        isUnsafeTypeMatched = hazard.hazard_type && hazard.hazard_type[filter.unsafeType];
      } else {
        isUnsafeTypeMatched = true
      }
    }

    return isUnsafeTypeMatched;
  });

  return filteredHazards;
  //console.log("filtered hazards", hazards);
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

const checkNum = (num: number): number => {
  if(num == undefined || isNaN(num)) {
    return 0;
  } else {
    return num;
  }
}
interface HierarchyFilter {

  filterType: FilterType;
  filters: string[];
  startDate?: any;
  endDate?: any;
  chartType?: any;
  hazardType?: any;
  unsafeType?: any;
}

enum FilterType {
  NONE,
  SITES,
  DEPARTMENTS
}
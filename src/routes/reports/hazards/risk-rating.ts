import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getHazards } from '../../hazards.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';
import { retrieve as getCategories } from '../../category-elements.router';
import { isWithin } from '../../../common/date-util';

import { hasModuleAccess } from '../../../common/access-util';
const moduleId = 'HR';

/* GET risk rating report */
export const hazardsRiskRating = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  getHazardsRiskRating(req, 
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

export const getHazardsRiskRating = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let taskId = req.query.taskId;
  let chartType = req.query.chartType;

  let resp = undefined;
  let error = undefined;

  let hazards = undefined;
  let filter: HierarchyFilter = undefined;
  
  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.startDate = startDate;
        filter.endDate = endDate;
        filter.taskId = taskId;
        filter.chartType = chartType;

        console.log(filter);
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
    resolve(true);
  })
  .then((resolve) => {
    getChartData(hazards, filter,  
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

const getChartData = (hazards, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let major = 0;
  let moderate = 0;
  let minor = 0;
  let acceptable = 0;
  let total = 0;

  hazards.forEach((hazard) => {
    let isMajor = hazard.risk_rating['MAJOR'];
    if(isMajor) {
      major++;
    }

    let isModerate = hazard.risk_rating['MODERATE'];
    if(isModerate) {
      moderate++;
    }

    let isMinor = hazard.risk_rating['MINOR'];
    if(isMinor) {
      minor++;
    }

    let isAcceptable = hazard.risk_rating['ACCEPTABLE'];
    if(isAcceptable) {
      acceptable++;
    }

    total++;
  });

  let majorPercentage = checkNum(+(major / total * 100).toFixed(2));
  let moderatePercentage = checkNum(+(moderate / total * 100).toFixed(2));
  let minorPercentage = checkNum(+(minor / total * 100).toFixed(2));
  let acceptablePercentage = checkNum(+(acceptable / total * 100).toFixed(2));

  chartData.push({
    name: 'Major Risk',
    value: filter.chartType == 'BAR' ? major : majorPercentage
  });

  chartData.push({
    name: 'Moderate Risk',
    value: filter.chartType == 'BAR' ? moderate : moderatePercentage
  });

  chartData.push({
    name: 'Minor Risk',
    value: filter.chartType == 'BAR' ? minor : minorPercentage
  });

  chartData.push({
    name: 'Acceptable Risk',
    value: filter.chartType == 'BAR' ? acceptable : acceptablePercentage
  });

  tableData.push({
    risk_rating: 'Major Risk',
    no_of_hazards: major,
    percentage: majorPercentage
  });

  tableData.push({
    risk_rating: 'Moderate Risk',
    no_of_hazards: moderate,
    percentage: moderatePercentage
  });

  tableData.push({
    risk_rating: 'Minor Risk',
    no_of_hazards: minor,
    percentage: minorPercentage
  });

  tableData.push({
    risk_rating: 'Acceptable Risk',
    no_of_hazards: acceptable,
    percentage: acceptablePercentage
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_hazards: total, 
    summary: chartData,
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

    let taskMatches = false;
    if(isWithinHierarchy) {
      if(filter.taskId) {
        taskMatches = hazard.task_id == filter.taskId;
      } else {
        taskMatches = true;
      }
    }

    //console.log("did it match", isWithinDateRange, isWithinHierarchy, taskMatches);

    return taskMatches;
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
  taskId?: any;
  chartType?: string;
}

enum FilterType {
  NONE,
  SITES,
  DEPARTMENTS
}
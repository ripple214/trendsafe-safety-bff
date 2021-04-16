import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getHazards } from '../../hazards.router';
import { getDepartments, getSites } from '../../hierarchies.router';
import { retrieve as getCategories } from '../../category-elements.router';
import { isWithin } from '../../../common/date-util';

/* GET risk rating report */
export const hazardsRiskRating = (req, res) => {
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
  .fail(() => {
    res.status(400);
    res.json(error);
  })
  .success(() => {
    res.status(200);
    res.json(resp);
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

  chartData.push({
    name: 'Major Risk',
    value: major
  });

  chartData.push({
    name: 'Moderate Risk',
    value: moderate
  });

  chartData.push({
    name: 'Minor Risk',
    value: minor
  });

  chartData.push({
    name: 'Acceptable Risk',
    value: acceptable
  });

  tableData.push({
    risk_rating: 'Major Risk',
    no_of_hazards: major,
    percentage: checkNum(+(major / total * 100).toFixed(2))
  });

  tableData.push({
    risk_rating: 'Moderate Risk',
    no_of_hazards: moderate,
    percentage: checkNum(+(moderate / total * 100).toFixed(2))
  });

  tableData.push({
    risk_rating: 'Minor Risk',
    no_of_hazards: minor,
    percentage: checkNum(+(minor / total * 100).toFixed(2))
  });

  tableData.push({
    risk_rating: 'Acceptable Risk',
    no_of_hazards: acceptable,
    percentage: checkNum(+(acceptable / total * 100).toFixed(2))
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
    getDepartments(req, 
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
    getSites(req, 
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
    getSites(req, 
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
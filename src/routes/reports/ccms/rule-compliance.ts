import { getRules } from '../../rules.router';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getHazards } from '../../hazards.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';
import { isWithin } from '../../../common/date-util';
import { getAssessments } from '../../assessments.router';
import { getIncidents } from '../../incidents.router';
import { checkNum } from '../../../common/number-util';

/* GET rule compliance report */
export const ccmsRuleCompliance = (req, res) => {
  getCCMSRuleCompliance(req, 
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

export const getCCMSRuleCompliance = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let taskId = req.query.taskId;
  let chartType = req.query.chartType;

  let resp = undefined;
  let error = undefined;

  let ccms = undefined;
  let rules = undefined;
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
    //console.log("raw", moment(filter.startDate), moment(filter.endDate), reports);
    ccms = filterReports(ccms, filter);
    resolve(true);
  })
  .then((resolve, reject) => {
    getRules(clientId, 
      (data) => {
        rules = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    getChartData(ccms, rules, filter,  
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

const getCCMs = (clientId: string, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let ccms = [];

  new SequentialExecutor().chain()
  .parallel([
    (resolve, reject) => {
      getAssessments(clientId, undefined, 
        (data) => {
          ccms = ccms.concat(data);
          console.log("assessments", data.length, ccms.length);
          resolve(true);
        }, 
        (error) => {
          reject(error);
        }
      );
    },
    (resolve, reject) => {
      getHazards(clientId, undefined, 
        (data) => {
          ccms = ccms.concat(data);
          console.log("hazards", data.length, ccms.length);
          resolve(true);
        }, 
        (error) => {
          reject(error);
        }
      );
    },
    (resolve, reject) => {
      getIncidents(clientId, undefined,
        (data) => {
          ccms = ccms.concat(data);
          console.log("incidents", data.length, ccms.length);
          resolve(true);
        }, 
        (error) => {
          reject(error);
        }
      );
    },
  ])
  .fail((error) => {
    onError(error);
  })
  .success(() => {
    console.log("total", ccms.length);
    onSuccess(ccms);
  })
  .execute();
}

const getChartData = (reports, rules, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let counts = {};
  rules.forEach(rule => {
    counts[rule.id] = 0;
  });

  let total = 0;

  reports.forEach((report) => {
    rules.forEach(rule => {
      if(report.rule_compliance && report.rule_compliance[rule.id]) {
        counts[rule.id] = counts[rule.id] + 1;

        total++;
      }
    });
  });

  rules.forEach(rule => {
    chartData.push({
      name: rule.name,
      value: filter.chartType == 'BAR' ? counts[rule.id] : checkNum(+(counts[rule.id] / total * 100).toFixed(2))
    });
  });

  rules.forEach(rule => {
    tableData.push({
      rule_compliance: rule.name,
      no_of_reports: counts[rule.id],
      percentage: checkNum(+(counts[rule.id] / total * 100).toFixed(2))
    });
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_reports: total, 
    summary: chartData,
    details: tableData
  });  
}

const filterReports = (reports, filter: HierarchyFilter) => {
  //console.log("reports", reports);
  //console.log("filter", filter);

  let filteredReports = reports.filter(report => {
    let isWithinDateRange = isWithin(report.completed_date, filter.startDate, filter.endDate);

    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      //console.log("site id", report.site_id, filter.filters);
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(report.site_id) > -1;
      } else if(filter.filterType == FilterType.DEPARTMENTS) {
        isWithinHierarchy = filter.filters.indexOf(report.department_id) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    let taskMatches = false;
    if(isWithinHierarchy) {
      if(filter.taskId) {
        taskMatches = report.task_id == filter.taskId;
      } else {
        taskMatches = true;
      }
    }

    //console.log("did it match", isWithinDateRange, isWithinHierarchy, taskMatches);

    return taskMatches;
  });

  return filteredReports;
  //console.log("filtered reports", reports);
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
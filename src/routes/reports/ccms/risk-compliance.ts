import moment from 'moment';
import { getRisks } from '../../risks.router';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getHazards } from '../../hazards.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';
import { isWithin } from '../../../common/date-util';
import { getAssessments } from '../../assessments.router';
import { getInspections } from '../../inspections.router';
import { getIncidents } from '../../incidents.router';

/* GET risk compliance report */
export const ccmsRiskCompliance = (req, res) => {
  getCCMSRiskCompliance(req, 
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

export const getCCMSRiskCompliance = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let taskId = req.query.taskId;
  let chartType = req.query.chartType;

  let resp = undefined;
  let error = undefined;

  let ccms = undefined;
  let risks = undefined;
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
    getRisks(clientId, 
      (data) => {
        risks = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    getChartData(ccms, risks, filter,  
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
      getInspections(clientId, undefined, 
        (data) => {
          ccms = ccms.concat(data);
          console.log("inspections", data.length, ccms.length);
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
      getIncidents(clientId,  
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

const getChartData = (reports, risks, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let counts = {};
  risks.forEach(risk => {
    counts[risk.id] = 0;
  });

  let total = 0;

  reports.forEach((report) => {
    risks.forEach(risk => {
      if(report.risk_compliance && report.risk_compliance[risk.id]) {
        counts[risk.id] = counts[risk.id] + 1;

        total++;
      }
    });
  });

  risks.forEach(risk => {
    chartData.push({
      name: risk.name,
      value: filter.chartType == 'BAR' ? counts[risk.id] : checkNum(+(counts[risk.id] / total * 100).toFixed(2))
    });
  });

  risks.forEach(risk => {
    tableData.push({
      risk_compliance: risk.name,
      no_of_reports: counts[risk.id],
      percentage: checkNum(+(counts[risk.id] / total * 100).toFixed(2))
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
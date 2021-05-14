import { isWithin } from '../../../common/date-util';
import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getAssessment, getAssessments, getPhotographs } from '../../assessments.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';

/* GET detailed report */
export const assessmentsDetailedReport = (req, res) => {
  let clientId = req['user'].client_id;

  let id = req.query.id;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let taskId = req.query.taskId;
  let locationId = req.query.locationId;
  let riskRating = req.query.riskRating;
  let nonCompliantElement = req.query.nonCompliantElement;

  let resp = undefined;
  let error = undefined;

  let assessments = undefined;
  let filter: HierarchyFilter = undefined;
  
  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.id = id;
        filter.startDate = startDate;
        filter.endDate = endDate;
        filter.taskId = taskId;
        filter.locationId = locationId;
        filter.riskRating = riskRating;
        filter.nonCompliantElement = nonCompliantElement;

        resolve(true);
      }, 
      (err) => {
        error = err;
        reject(error);
      }
    );
  })
  .then((resolve, reject) => {
    if(filter.id) {
      getAssessment(clientId, filter.id, 
        (data) => {
          assessments = [data];
  
          resolve(true);
        }, 
        (err) => {
          error = err;
  
          reject(error);
        }
      );
    } else {
      getAssessments(clientId, undefined, 
        (data) => {
          assessments = data;
  
          resolve(true);
        }, 
        (err) => {
          error = err;
  
          reject(error);
        }
      );
    }
  })
  .then((resolve) => {
    if(!filter.id) {
      assessments = filterAssessments(assessments, filter);
    }
    resolve(true);
  })
  .then((resolve, reject) => {
    getChartData(clientId, assessments, filter,  
      (data) => {
        resp = {"report-data": data};

        resolve(true);
      },
      (error) => {
        reject(error);
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

const getChartData = (clientId, assessments, filter: HierarchyFilter, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let chartData = [];
  let tableData = [];


  let parallelRuns = [];

  let total = 0;
  assessments.forEach((assessment) => {
    parallelRuns.push((resolve, reject) => {
      getPhotographs(clientId, assessment.id, 
        (data => {
          assessment.photographs = data;
          
          resolve(true);
        }), 
        (error) => {
          reject(error);
        }
      );
    });
    total++;

    tableData.push(assessment);
  });

  
  new SequentialExecutor().chain()
  .parallel(parallelRuns)
  .success(() => {
    onSuccess({
      start_date: filter.startDate,
      end_date: filter.endDate,
      no_of_assessments: assessments.length, 
      summary: chartData,
      details: tableData
    });  
  })
  .execute();
}

const filterAssessments = (assessments, filter: HierarchyFilter) => {
  let filteredAssessments = assessments.filter(assessment => {
    let isWithinDateRange = isWithin(assessment.completed_date, filter.startDate, filter.endDate);

    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      //console.log("site id", assessment.site_id, filter.filters);
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(assessment.site_id) > -1;
      } else if(filter.filterType == FilterType.DEPARTMENTS) {
        isWithinHierarchy = filter.filters.indexOf(assessment.department_id) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    let taskMatches = false;
    if(isWithinHierarchy) {
      if(filter.taskId) {
        taskMatches = assessment.task_id == filter.taskId;
      } else {
        taskMatches = true;
      }
    }

    let locationMatches = false;
    if(taskMatches) {
      if(filter.locationId) {
        locationMatches = assessment.location_id == filter.locationId;
      } else {
        locationMatches = true;
      }
    }

    let riskRatingMatches = false;
    if(locationMatches) {
      if(filter.riskRating) {
        riskRatingMatches = assessment.risk_rating && assessment.risk_rating[filter.riskRating];
      } else {
        riskRatingMatches = true;
      }
    }

    let nonCompliantElementMatches = false;
    if(riskRatingMatches) {
      if(filter.nonCompliantElement) {
        nonCompliantElementMatches = assessment.element_compliance && 
          assessment.element_compliance[filter.nonCompliantElement] && 
          assessment.element_compliance[filter.nonCompliantElement]['N'];
      } else {
        nonCompliantElementMatches = true;
      }
    }

    return nonCompliantElementMatches;
  });

  return filteredAssessments;
}

const getHierarchyFilter = (req, onSuccess: (filter: HierarchyFilter) => void, onError?: (error: any) => void) => {
  let id = req.query.id;
  let divisionId = req.query.divisionId;
  let projectId = req.query.projectId;
  let siteId = req.query.siteId;
  let subsiteId = req.query.subsiteId;
  let departmentId = req.query.departmentId;

  let filters: string[] = [];
  if(id) {
    onSuccess({
      filterType: FilterType.ID,
      filters: []
    });
  } else if(departmentId) {
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
  id?: any;
  startDate?: any;
  endDate?: any;
  taskId?: any;
  locationId?: any;
  riskRating?: any;
  nonCompliantElement?: any;
}

enum FilterType {
  NONE,
  ID, 
  SITES,
  DEPARTMENTS
}
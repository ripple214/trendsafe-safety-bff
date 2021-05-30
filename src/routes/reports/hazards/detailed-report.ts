import { isWithin } from '../../../common/date-util';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getHazard, getHazards, getPhotographs } from '../../hazards.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';

/* GET detailed report */
export const hazardsDetailedReport = (req, res) => {
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

  let hazards = undefined;
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
      getHazard(clientId, filter.id, 
        (data) => {
          hazards = [data];
  
          resolve(true);
        }, 
        (err) => {
          error = err;
  
          reject(error);
        }
      );
    } else {
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
    }
  })
  .then((resolve) => {
    if(!filter.id) {
      hazards = filterHazards(hazards, filter);
    }
    resolve(true);
  })
  .then((resolve, reject) => {
    getChartData(clientId, hazards, filter,  
      (data) => {
        resp = {"report-data": data};

        resolve(true);
      },
      (error) => {
        reject(error);
      }
    );
  })
  .fail((error) => {
    res.status(400);
    res.json(error);
  })
  .success(() => {
    res.status(200);
    res.json(resp);
  })
  .execute();
};

const getChartData = (clientId, hazards, filter: HierarchyFilter, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let chartData = [];
  let tableData = [];


  let parallelRuns = [];

  let total = 0;
  hazards.forEach((hazard) => {
    parallelRuns.push((resolve, reject) => {
      getPhotographs(clientId, hazard.id, 
        (data => {
          hazard.photographs = data;
          
          resolve(true);
        }), 
        (error) => {
          reject(error);
        }
      );
    });
    total++;

    tableData.push(hazard);
  });

  
  new SequentialExecutor().chain()
  .parallel(parallelRuns)
  .success(() => {
    onSuccess({
      start_date: filter.startDate,
      end_date: filter.endDate,
      no_of_hazards: hazards.length, 
      summary: chartData,
      details: tableData
    });  
  })
  .execute();
}

const filterHazards = (hazards, filter: HierarchyFilter) => {
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

    let locationMatches = false;
    if(taskMatches) {
      if(filter.locationId) {
        locationMatches = hazard.location_id == filter.locationId;
      } else {
        locationMatches = true;
      }
    }

    let riskRatingMatches = false;
    if(locationMatches) {
      if(filter.riskRating) {
        riskRatingMatches = hazard.risk_rating && hazard.risk_rating[filter.riskRating];
      } else {
        riskRatingMatches = true;
      }
    }

    let nonCompliantElementMatches = false;
    if(riskRatingMatches) {
      //console.log("pasok");
      if(filter.nonCompliantElement) {
        //console.log("pasok ulit");
        nonCompliantElementMatches = hazard.element_compliance && 
          hazard.element_compliance[filter.nonCompliantElement] && 
          hazard.element_compliance[filter.nonCompliantElement]['N'];
      } else {
        nonCompliantElementMatches = true;
      }
    }

    return nonCompliantElementMatches;
  });

  return filteredHazards;
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
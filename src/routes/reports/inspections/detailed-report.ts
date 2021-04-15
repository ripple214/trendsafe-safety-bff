import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getInspections, getPhotographs } from '../../inspections.router';
import { getDepartments, getSites } from '../../hierarchies.router';

/* GET detailed report */
export const inspectionsDetailedReport = (req, res) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let equipmentId = req.query.equipmentId;
  let locationId = req.query.locationId;
  let riskRating = req.query.riskRating;
  let nonCompliantElement = req.query.nonCompliantElement;

  let resp = undefined;
  let error = undefined;

  let inspections = undefined;
  let filter: HierarchyFilter = undefined;
  
  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.startDate = startDate;
        filter.endDate = endDate;
        filter.equipmentId = equipmentId;
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
    getInspections(clientId, undefined, 
      (data) => {
        inspections = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    inspections = filterInspections(inspections, filter);
    resolve(true);
  })
  .then((resolve, reject) => {
    getChartData(clientId, inspections, filter,  
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

const getChartData = (clientId, inspections, filter: HierarchyFilter, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let chartData = [];
  let tableData = [];


  let parallelRuns = [];

  let total = 0;
  inspections.forEach((inspection) => {
    parallelRuns.push((resolve, reject) => {
      getPhotographs(clientId, inspection.id, 
        (data => {
          inspection.photographs = data;
          
          resolve(true);
        }), 
        (error) => {
          reject(error);
        }
      );
    });
    total++;

    tableData.push(inspection);
  });

  
  new SequentialExecutor().chain()
  .parallel(parallelRuns)
  .success(() => {
    onSuccess({
      start_date: filter.startDate,
      end_date: filter.endDate,
      no_of_inspections: inspections.length, 
      summary: chartData,
      details: tableData
    });  
  })
  .execute();
}

const filterInspections = (inspections, filter: HierarchyFilter) => {
  let filteredInspections = inspections.filter(inspection => {
    let isWithinDateRange = moment(inspection.completed_date, 'MMMM DD, YYYY hh:mm:ss').isSameOrAfter(filter.startDate, 'day') && // false
    moment(inspection.completed_date, 'MMMM DD, YYYY hh:mm:ss').isSameOrBefore(filter.endDate, 'day');

    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      //console.log("site id", inspection.site_id, filter.filters);
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(inspection.site_id) > -1;
      } else if(filter.filterType == FilterType.DEPARTMENTS) {
        isWithinHierarchy = filter.filters.indexOf(inspection.department_id) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    let equipmentMatches = false;
    if(isWithinHierarchy) {
      if(filter.equipmentId) {
        equipmentMatches = inspection.equipment_id == filter.equipmentId;
      } else {
        equipmentMatches = true;
      }
    }

    let locationMatches = false;
    if(equipmentMatches) {
      if(filter.locationId) {
        locationMatches = inspection.location_id == filter.locationId;
      } else {
        locationMatches = true;
      }
    }

    let riskRatingMatches = false;
    if(locationMatches) {
      if(filter.riskRating) {
        riskRatingMatches = inspection.risk_rating && inspection.risk_rating[filter.riskRating];
      } else {
        riskRatingMatches = true;
      }
    }

    let nonCompliantElementMatches = false;
    if(riskRatingMatches) {
      if(filter.nonCompliantElement) {
        nonCompliantElementMatches = inspection.element_compliance && 
          inspection.element_compliance[filter.nonCompliantElement] && 
          inspection.element_compliance[filter.nonCompliantElement]['N'];
      } else {
        nonCompliantElementMatches = true;
      }
    }

    return nonCompliantElementMatches;
  });

  return filteredInspections;
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

interface HierarchyFilter {

  filterType: FilterType;
  filters: string[];
  startDate?: any;
  endDate?: any;
  equipmentId?: any;
  locationId?: any;
  riskRating?: any;
  nonCompliantElement?: any;
}

enum FilterType {
  NONE,
  SITES,
  DEPARTMENTS
}
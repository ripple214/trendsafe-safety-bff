import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getInspection, getInspections, getPhotographs } from '../../inspections.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';
import { isWithin } from '../../../common/date-util';

import { hasModuleAccess } from '../../../common/access-util';
import { FilterType, getHierarchyFilter, HierarchyFilter } from '../../../common/hierarchy-filter';
const moduleId = 'PAI';

/* GET detailed report */
export const inspectionsDetailedReport = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  let clientId = req['user'].client_id;

  let id = req.query.id;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let equipmentId = req.query.equipmentId;
  let locationId = req.query.locationId;
  let riskRating = req.query.riskRating;
  let nonCompliantElement = req.query.nonCompliantElement;

  let resp = undefined;
  let error = undefined;

  let inspections = undefined;
  let filter: InspectionsFilter = undefined;
  
  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.id = id;
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
    if(filter.id) {
      getInspection(clientId, filter.id, 
        (data) => {
          inspections = [data];
  
          resolve(true);
        }, 
        (err) => {
          error = err;
  
          reject(error);
        }
      );
    } else {
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
    }
  })
  .then((resolve) => {
    if(!filter.id) {
      inspections = filterInspections(inspections, filter);
    }
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

const getChartData = (clientId, inspections, filter: InspectionsFilter, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
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

const filterInspections = (inspections, filter: InspectionsFilter) => {
  let filteredInspections = inspections.filter(inspection => {
    let isWithinDateRange = isWithin(inspection.completed_date, filter.startDate, filter.endDate);

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

interface InspectionsFilter extends HierarchyFilter {

  id?: any;
  equipmentId?: any;
  locationId?: any;
  riskRating?: any;
  nonCompliantElement?: any;
}

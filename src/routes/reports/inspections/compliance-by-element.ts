import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getInspections } from '../../inspections.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';
import { retrieve as getCategories } from '../../category-elements.router';
import { isWithin } from '../../../common/date-util';

/* GET compliance-by-element report */
export const inspectionsComplianceByElement = (req, res) => {
  getInspectionsComplianceByElement(req, 
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

export const getInspectionsComplianceByElement = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let equipmentId = req.query.equipmentId;

  let resp = undefined;
  let error = undefined;

  let categories = undefined;
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
    //console.log("raw", moment(filter.startDate), moment(filter.endDate), inspections);
    inspections = filterInspections(inspections, filter);
    //console.log("filtered", inspections);
    resolve(true);
  })
  .then((resolve) => {
    getCategories(req, "inspections", (data) => {
      categories = data;

      resolve(true);
    });
  })
  .then((resolve) => {
    getChartData(categories, inspections, filter,  
      (data) => {
        resp = {"report-data": data};

        resolve(true);
      }
    );
  })
  .fail(() => {
    onFailure(error);
  })
  .success(() => {
    onSuccess(resp);
  })
  .execute();
};

const getChartData = (categories, inspections, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];
  let inspection_summaries = {};

  categories.forEach((category) => {
    category.elements.forEach((element) => {
      let compliantCount = 0;
      let nonCompliantCount = 0;
      let notApplicableCount = 0;
      let total = 0;

      inspections.forEach((inspection) => {
        let isCompliant = inspection.element_compliance[element.id]['Y'];
        if(isCompliant) {
          compliantCount++;
        }

        let isNonCompliant = inspection.element_compliance[element.id]['N'];
        if(isNonCompliant) {
          nonCompliantCount++;
        }

        let isNotApplicable = inspection.element_compliance[element.id]['NA'];
        if(isNotApplicable) {
          notApplicableCount++;
        }

        inspection_summaries[inspection.name] = inspection.summary;

        total++;
      });
      var percentage = checkNum(+(compliantCount / total * 100).toFixed(2));
      chartData.push({
        name: element.name + ' ' + percentage + '%',
        value: percentage
      });

      tableData.push({
        category: category.name,
        element: element.name,
        compliance: {
          y: {
            total: compliantCount,
            percent_total: checkNum(+(compliantCount / total * 100).toFixed(0)),
            percent_applicable: checkNum(+(compliantCount / (total-notApplicableCount) * 100).toFixed(0)),
          },
          n: {
            total: nonCompliantCount,
            percent_total: checkNum(+(nonCompliantCount / total * 100).toFixed(0)),
            percent_applicable: checkNum(+(nonCompliantCount / (total-notApplicableCount) * 100).toFixed(0)),
          },
          na: {
            total: notApplicableCount,
            percent_total: checkNum(+(notApplicableCount / total * 100).toFixed(0))
          }
        }
      });
    });
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_inspections: inspections.length, 
    summary: chartData,
    inspection_summaries: inspection_summaries,
    details: tableData
  });  
}

const filterInspections = (inspections, filter: HierarchyFilter) => {
  //console.log("inspections", inspections);
  //console.log("filter", filter);

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

    //console.log("did it match", isWithinDateRange, isWithinHierarchy, equipmentMatches);

    return equipmentMatches;
  });

  return filteredInspections;
  //console.log("filtered inspections", inspections);
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
  equipmentId?: any;
}

enum FilterType {
  NONE,
  SITES,
  DEPARTMENTS
}
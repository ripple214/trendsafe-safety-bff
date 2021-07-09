import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getInspections } from '../../inspections.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';
import { isWithin } from '../../../common/date-util';

import { hasModuleAccess } from '../../../common/access-util';
import { FilterType, getHierarchyFilter } from '../../../common/hierarchy-filter';
const moduleId = 'PAI';

/* GET rule compliance report */
export const inspectionsByDepartment = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  getInspectionsByDepartment(req, 
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

export const getInspectionsByDepartment = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let chartType = req.query.chartType;

  let resp = undefined;
  let error = undefined;

  let inspections = undefined;
  let departments = undefined;

  let filter: HierarchyFilter = undefined;

  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.startDate = startDate;
        filter.endDate = endDate;
        filter.chartType = chartType;
        
        //console.log(filter);
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
  .then((resolve, reject) => {
    getFilteredDepartments(req,  
      (data) => {
        departments = data;

        //console.log("raw departments", departments);
        departments.filter(department => {
          let isWithinHierarchy = false;
          if(filter.filterType == FilterType.SITES) {
            isWithinHierarchy = filter.filters.indexOf(department.site_id) > -1;
          } else if(filter.filterType == FilterType.DEPARTMENTS) {
            isWithinHierarchy = filter.filters.indexOf(department.id) > -1;
          } else {
            isWithinHierarchy = true;
          }
          return isWithinHierarchy;
        });
        //console.log("filtered departments", departments);

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
  .then((resolve) => {
    getChartData(inspections, departments, filter,
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

const filterInspections = (inspections, filter: HierarchyFilter) => {
  let filteredInspections = inspections.filter(inspection => {
    let isWithinDateRange = isWithin(inspection.completed_date, filter.startDate, filter.endDate);

    return isWithinDateRange;
  });

  return filteredInspections;
}

const getChartData = (inspections, departments, filter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let total = 0;

  inspections.forEach((inspection) => {
    if(inspection.department_id) {
      let dept = departments.find(department => {
        return department.id == inspection.department_id;
      });
      if(dept) {
        let count = chartData.find(data => {
          return data['id'] == dept.id;
        });
        if(count == undefined) {
          count = {
            id: dept.id,
            name: dept.name,
            value: 0
          }
          chartData.push(count);
        }
        count.value += 1;
        total++;
      }
    }
  });

  chartData.forEach(data => {
    let value = data.value;
    data.value = filter.chartType == 'BAR' ? value : checkNum(+(value / total * 100).toFixed(2)),

    tableData.push({
      department: data.name,
      no_of_inspections: value,
      percentage: checkNum(+(value / total * 100).toFixed(2))
    });
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_inspections: total, 
    summary: chartData,
    details: tableData
  });  
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
}

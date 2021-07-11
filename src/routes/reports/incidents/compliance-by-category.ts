import { SequentialExecutor } from '../../../common/sequential-executor';
import { getIncidents } from '../../incidents.router';
import { retrieve as getCategories } from '../../category-elements.router';
import { checkNum } from '../../../common/number-util';
import { HierarchyFilter, getHierarchyFilter, isWithinBasicFilter } from '../../../common/hierarchy-filter';
import { getTop10Hazards } from '../hazards/top-hazards';

import { hasModuleAccess } from '../../../common/access-util';
const moduleId = 'II';

/* GET compliance-by-category report */
export const incidentsComplianceByCategory = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  getIncidentsComplianceByCategory(req, 
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

export const getIncidentsComplianceByCategory = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let chartType = req.query.chartType;
  let hazardType = req.query.hazardType;
  let taskId = req.query.taskId;

  let resp = undefined;
  let error = undefined;

  let categories = undefined;
  let incidents = undefined;
  let filter: IncidentFilter = undefined;
  
  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.startDate = startDate;
        filter.endDate = endDate;
        filter.chartType = chartType;
        filter.hazardType = hazardType;

        filter.taskId = taskId;

        resolve(true);
      }, 
      (err) => {
        error = err;
        reject(error);
      }
    );
  })
  .then((resolve, reject) => {
    getIncidents(clientId, undefined, 
      (data) => {
        incidents = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    incidents = filterIncidents(incidents, filter);
    resolve(true);
  })
  .then((resolve) => {
    getCategories(req, "hazards", (data) => {
      categories = data;

      resolve(true);
    });
  })
  .then((resolve) => {
    getChartData(categories, incidents, filter,  
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

const getChartData = (categories, incidents, filter: IncidentFilter, onSuccess: (data: any) => void) => {
  let topData = getTop10Hazards(categories, incidents, filter);
  let chartData = [];
  let tableData = [];

  let total = 0;

  categories.forEach((category) => {
    let nonCompliantCount = 0;

    category.elements.forEach((element) => {

      if((filter.hazardType == 'TOP' && topData.find(top => {
        return top.id == element.id
      })) || filter.hazardType != 'TOP') {
        incidents.forEach((incident) => {
          let isNonCompliant = 
            incident.element_compliance && 
            incident.element_compliance[element.id] &&
            incident.element_compliance[element.id]['N'];

          if(isNonCompliant) {
            nonCompliantCount++;
            total++;
          }
        });
      }
    });

    if(nonCompliantCount > 0) {
      chartData.push({
        id: category.id,
        name: category.name,
        value: nonCompliantCount
      });

      tableData.push({
        categoryId: category.id,
        category: category.name,
        compliance: {
          n: {
            total: nonCompliantCount,
            percent_total: 0 //checkNum(+(nonCompliantCount / total * 100).toFixed(2))
          },
        }
      });
    }

  });

  chartData.forEach(data => {
    data.value = filter.chartType == 'BAR' ? data.value : checkNum(+(data.value / total * 100).toFixed(2))
  });

  chartData = chartData.sort((obj1, obj2) => {
    let diff = obj2.value - obj1.value;
    if(diff == 0) {
        return obj1.name.localeCompare(obj2.name);
    } else {
        return diff;
    }
  });

  tableData.forEach(data => {
    data.compliance.n.percent_total = checkNum(+(data.compliance.n.total / total * 100).toFixed(2))
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_incidents: total, 
    summary: chartData,
    details: tableData
  });  
}

const filterIncidents = (incidents, filter: IncidentFilter) => {
  let filteredIncidents = incidents.filter(incident => {
    let isWithinHierarchy = isWithinBasicFilter(incident, filter);

    let taskMatches = false;
    if(isWithinHierarchy) {
      if(filter.taskId) {
        taskMatches = incident.task_id == filter.taskId;
      } else {
        taskMatches = true;
      }
    }

    return taskMatches;
  });
  return filteredIncidents;
}

interface IncidentFilter extends HierarchyFilter {
  chartType?: any;
  hazardType?: any;
  taskId?: any;
}
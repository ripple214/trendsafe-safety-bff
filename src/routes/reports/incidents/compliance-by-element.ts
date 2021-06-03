import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { retrieve as getCategories } from '../../category-elements.router';
import { getIncidents } from '../../incidents.router';
import { getTop10Hazards } from '../hazards/top-hazards';
import { getHierarchyFilter, HierarchyFilter, isWithinBasicFilter } from '../../../common/hierarchy-filter';
import { checkNum } from '../../../common/checkNum';

/* GET compliance-by-element report */
export const incidentsComplianceByElement = (req, res) => {
  getIncidentsComplianceByElement(req, 
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

export const getIncidentsComplianceByElement = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let chartType = req.query.chartType;
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
    getIncidents(clientId,  undefined,
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
    //console.log("raw", moment(filter.startDate), moment(filter.endDate), incidents.length);
    incidents = filterIncidents(incidents, filter);
    //console.log("filtered", incidents.length);
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
  filter['hazardType'] = 'TOP';
  let topData = getTop10Hazards(categories, incidents, filter);
  let chartData = [];
  let tableData = [];

  let total = 0;

  categories.forEach((category) => {
    category.elements.forEach((element) => {
      let nonCompliantCount = 0;

      if((topData.find(top => {
        return top.id == element.id
      }))) {
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
  
        if(nonCompliantCount > 0) {
          chartData.push({
            id: element.id,
            name: element.name + ' ' + nonCompliantCount,
            value: nonCompliantCount
          });
  
          tableData.push({
            categoryId: category.id,
            category: category.name,
            elementId: element.id,
            element: element.name,
            compliance: {
              n: {
                total: nonCompliantCount,
                percent_total: 0 //checkNum(+(nonCompliantCount / total * 100).toFixed(0))
              },
            }
          });
        }
      }
    });
  });

  chartData.forEach(data => {
    data.value = filter.chartType == 'BAR' ? data.value : checkNum(+(data.value / total * 100).toFixed(0))
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
    data.compliance.n.percent_total = checkNum(+(data.compliance.n.total / total * 100).toFixed(0))
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
  //console.log("hazards", hazards);
  //console.log("filter", filter);

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
  //console.log("filtered hazards", hazards);
}

interface IncidentFilter extends HierarchyFilter {
  chartType?: any;
  taskId?: any;
}

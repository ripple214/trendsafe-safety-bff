import { SequentialExecutor } from '../../../common/sequential-executor';
import { getIncidents } from '../../incidents.router';
import { retrieve as getCauses } from '../../causes.router';
import { retrieve as getCategories } from '../../category-elements.router';
import { checkNum } from '../../../common/checkNum';
import { HierarchyFilter, getHierarchyFilter, isWithinBasicFilter } from '../../../common/hierarchy-filter';

import { hasModuleAccess } from '../../../common/access-util';
const moduleId = 'II';

/* GET immediate-cause-analysis report */
export const incidentsImmediateCauseAnalysis = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  getIncidentsImmediateCauseAnalysis(req, 
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

export const getIncidentsImmediateCauseAnalysis = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let taskId = req.query.taskId;

  let resp = undefined;
  let error = undefined;

  let headings = undefined;
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
  .parallel([
    (resolve) => {
      getCategories(req, "inspections", (data) => {
        categories = data;

        resolve(true);
      });
    },
    (resolve) => {
      getCauses(req, (data) => {
        headings = data;

        resolve(true);
      });
    }
  ])
  .then((resolve) => {
    getChartData(categories, headings, incidents, filter,  
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

const getChartData = (categories, headings, incidents, filter: IncidentFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let total = 0;

  headings.forEach((heading) => {
    let nonCompliantHeadingCount = 0;

    if(heading.items) {
      heading.items.forEach((item) => {

        incidents.forEach((incident) => {
          let isNonCompliant = 
            incident.task_causes && 
            incident.task_causes[item.id] &&
            incident.task_causes[item.id]['N'];
  
          if(isNonCompliant) {
            nonCompliantHeadingCount++;
            total++;
          }
        });
      });
    }

    if(nonCompliantHeadingCount > 0) {
      chartData.push({
        id: heading.id,
        name: heading.name + ' ' + nonCompliantHeadingCount,
        value: nonCompliantHeadingCount
      });

      tableData.push({
        type: "heading",
        id: heading.id,
        name: heading.name,
        compliance: {
          n: {
            total: nonCompliantHeadingCount,
            percent_total: 0
          },
        }
      });
    }

  });
  //console.log("ok dito");
  categories.forEach((category) => {
    let nonCompliantEquipmentCount = 0;

    category.elements.forEach((element) => {

      incidents.forEach((incident) => {
        let isNonCompliant = incident.area_element_compliance[element.id]['N'];
        if(isNonCompliant) {
          nonCompliantEquipmentCount++;
          total++;
        }
      });
    });

    if(nonCompliantEquipmentCount > 0) {
      chartData.push({
        id: category.id,
        name: category.name + ' ' + nonCompliantEquipmentCount,
        value: nonCompliantEquipmentCount
      });

      tableData.push({
        type: "equipment",
        id: category.id,
        name: category.name,
        compliance: {
          n: {
            total: nonCompliantEquipmentCount,
            percent_total: 0
          },
        }
      });
    }

  });
  //console.log("umabot dito");  
  
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
  taskId?: any;
}
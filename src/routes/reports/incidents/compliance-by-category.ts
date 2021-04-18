import { SequentialExecutor } from '../../../common/sequential-executor';
import { getIncidents } from '../../incidents.router';
import { retrieve as getCategories } from '../../category-elements.router';
import { checkNum } from '../../../common/checkNum';
import { HierarchyFilter, getHierarchyFilter, isWithinBasicFilter } from '../../../common/hierarchy-filter';

/* GET compliance-by-category report */
export const incidentsComplianceByCategory = (req, res) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
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
    getIncidents(clientId,  
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

const getChartData = (categories, incidents, filter: IncidentFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let total = 0;

  categories.forEach((category) => {
    let nonCompliantCount = 0;

    category.elements.forEach((element) => {

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
    });

    if(nonCompliantCount > 0) {
      chartData.push({
        id: category.id,
        name: category.name + ' ' + nonCompliantCount,
        value: nonCompliantCount
      });

      tableData.push({
        categoryId: category.id,
        category: category.name,
        compliance: {
          n: {
            total: nonCompliantCount,
            percent_total: 0 //checkNum(+(nonCompliantCount / total * 100).toFixed(0))
          },
        }
      });
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
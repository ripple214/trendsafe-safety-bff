import { SequentialExecutor } from '../../../common/sequential-executor';
import { getIncidents } from '../../incidents.router';
import { retrieve as getCauses } from '../../causes.router';
import { checkNum } from '../../../common/checkNum';
import { HierarchyFilter, getHierarchyFilter, isWithinBasicFilter } from '../../../common/hierarchy-filter';

/* GET system-and-organization-causes report */
export const incidentsSystemAndOrganizationCauses = (req, res) => {
  getIncidentsSystemAndOrganizationCauses(req, 
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

export const getIncidentsSystemAndOrganizationCauses = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let taskId = req.query.taskId;

  let resp = undefined;
  let error = undefined;

  let headings = undefined;
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
  .then((resolve) => {
    getCauses(req, (data) => {
      headings = data;

      resolve(true);
    });
  })
  .then((resolve) => {
    getChartData(headings, incidents, filter,  
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

const getChartData = (headings, incidents, filter: IncidentFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let total = 0;

  headings.forEach((heading) => {
    let nonCompliantCount = 0;

    if(heading.items) {
      heading.items.forEach((item) => {

        incidents.forEach((incident) => {
          let isNonCompliant = 
            incident.system_element_compliance && 
            incident.system_element_compliance[item.id] &&
            incident.system_element_compliance[item.id]['N'];
  
          if(isNonCompliant) {
            nonCompliantCount++;
            total++;
          }
        });
      });
    }

    if(nonCompliantCount > 0) {
      chartData.push({
        id: heading.id,
        name: heading.name + ' ' + nonCompliantCount,
        value: nonCompliantCount
      });

      tableData.push({
        headingId: heading.id,
        heading: heading.name,
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
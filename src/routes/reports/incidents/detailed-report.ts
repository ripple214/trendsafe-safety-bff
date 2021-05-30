import { SequentialExecutor } from '../../../common/sequential-executor';
import { getIncident, getIncidents } from '../../incidents.router';
import { getHierarchyFilter, isWithinBasicFilter, HierarchyFilter } from '../../../common/hierarchy-filter';

/* GET detailed report */
export const incidentsDetailedReport = (req, res) => {
  let clientId = req['user'].client_id;

  let id = req.query.id;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let taskId = req.query.taskId;
  let locationId = req.query.locationId;
  let nonCompliantElement = req.query.nonCompliantElement;

  let resp = undefined;
  let error = undefined;

  let incidents = undefined;
  let filter: IncidentsFilter = undefined;
  
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
      getIncident(clientId, filter.id, 
        (data) => {
          incidents = [data];
  
          resolve(true);
        }, 
        (err) => {
          error = err;
  
          reject(error);
        }
      );
    } else {
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
    }
  })
  .then((resolve) => {
    incidents = filterIncidents(incidents, filter);
    resolve(true);
  })
  .then((resolve, reject) => {
    getChartData(incidents, filter,  
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

const getChartData = (incidents, filter: IncidentsFilter, onSuccess: (data: any) => void, onError?: (error: any) => void) => {
  let chartData = [];
  let tableData = [];


  let parallelRuns = [];

  let total = 0;
  incidents.forEach((incident) => {
    total++;

    tableData.push(incident);
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_incidents: incidents.length, 
    summary: chartData,
    details: tableData
  });  
}

const filterIncidents = (incidents, filter: IncidentsFilter) => {
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

    let locationMatches = false;
    if(taskMatches) {
      if(filter.locationId) {
        locationMatches = incident.location_id == filter.locationId;
      } else {
        locationMatches = true;
      }
    }

    let nonCompliantElementMatches = false;
    if(locationMatches) {
      //console.log("pasok");
      if(filter.nonCompliantElement) {
        nonCompliantElementMatches = incident.element_compliance && 
          incident.element_compliance[filter.nonCompliantElement] && 
          incident.element_compliance[filter.nonCompliantElement]['N'];
      } else {
        nonCompliantElementMatches = true;
      }
    }

    return nonCompliantElementMatches;
  });

  return filteredIncidents;
}

interface IncidentsFilter extends HierarchyFilter {

  id?: any;
  taskId?: any;
  locationId?: any;
  nonCompliantElement?: any;
}

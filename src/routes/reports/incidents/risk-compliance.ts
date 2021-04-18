import { getRisks } from '../../risks.router';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getIncidents } from '../../incidents.router';
import { getHierarchyFilter, HierarchyFilter, isWithinBasicFilter } from '../../../common/hierarchy-filter';
import { checkNum } from '../../../common/checkNum';

/* GET risk compliance report */
export const incidentsRiskCompliance = (req, res) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let taskId = req.query.taskId;
  let chartType = req.query.chartType;

  let resp = undefined;
  let error = undefined;

  let incidents = undefined;
  let risks = undefined;
  let filter: IncidentFilter = undefined;
  
  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.startDate = startDate;
        filter.endDate = endDate;
        filter.taskId = taskId;
        filter.chartType = chartType;

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
  .then((resolve, reject) => {
    getRisks(clientId, 
      (data) => {
        risks = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    getChartData(incidents, risks, filter,  
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

const getChartData = (incidents, risks, filter: IncidentFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let counts = {};
  risks.forEach(risk => {
    counts[risk.id] = 0;
  });

  let total = 0;

  incidents.forEach((incident) => {
    risks.forEach(risk => {
      if(incident.risk_compliance && incident.risk_compliance[risk.id]) {
        counts[risk.id] = counts[risk.id] + 1;

        total++;
      }
    });
  });

  risks.forEach(risk => {
    chartData.push({
      name: risk.name,
      value: filter.chartType == 'BAR' ? counts[risk.id] : checkNum(+(counts[risk.id] / total * 100).toFixed(2))
    });
  });

  risks.forEach(risk => {
    tableData.push({
      risk_compliance: risk.name,
      no_of_incidents: counts[risk.id],
      percentage: checkNum(+(counts[risk.id] / total * 100).toFixed(2))
    });
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
  chartType?: string;
}

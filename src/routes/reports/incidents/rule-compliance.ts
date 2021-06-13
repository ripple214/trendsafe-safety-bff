import { getRules } from '../../rules.router';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getIncidents } from '../../incidents.router';
import { getHierarchyFilter, HierarchyFilter, isWithinBasicFilter } from '../../../common/hierarchy-filter';
import { checkNum } from '../../../common/checkNum';

import { hasModuleAccess } from '../../../common/access-util';
const moduleId = 'II';

/* GET rule compliance report */
export const incidentsRuleCompliance = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  getIncidentsRuleCompliance(req, 
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

export const getIncidentsRuleCompliance = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let taskId = req.query.taskId;
  let chartType = req.query.chartType;

  let resp = undefined;
  let error = undefined;

  let incidents = undefined;
  let rules = undefined;
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
  .then((resolve, reject) => {
    getRules(clientId, 
      (data) => {
        rules = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    getChartData(incidents, rules, filter,  
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

const getChartData = (incidents, rules, filter: IncidentFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let counts = {};
  rules.forEach(rule => {
    counts[rule.id] = 0;
  });

  let total = 0;

  incidents.forEach((incident) => {
    rules.forEach(rule => {
      if(incident.rule_compliance && incident.rule_compliance[rule.id]) {
        counts[rule.id] = counts[rule.id] + 1;

        total++;
      }
    });
  });

  rules.forEach(rule => {
    chartData.push({
      name: rule.name,
      value: filter.chartType == 'BAR' ? counts[rule.id] : checkNum(+(counts[rule.id] / total * 100).toFixed(2))
    });
  });

  rules.forEach(rule => {
    tableData.push({
      rule_compliance: rule.name,
      no_of_incidents: counts[rule.id],
      percentage: checkNum(+(counts[rule.id] / total * 100).toFixed(2))
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

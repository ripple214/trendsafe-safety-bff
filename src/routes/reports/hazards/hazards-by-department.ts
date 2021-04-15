import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getHazards } from '../../hazards.router';
import { getDepartments, getSites } from '../../hierarchies.router';

/* GET rule compliance report */
export const hazardsByDepartment = (req, res) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;

  let resp = undefined;
  let error = undefined;

  let hazards = undefined;
  let departments = undefined;

  let filter: HierarchyFilter = {
    startDate: startDate,
    endDate: endDate
  };

  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHazards(clientId, undefined, 
      (data) => {
        hazards = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve, reject) => {
    getDepartments(req,  
      (data) => {
        departments = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    hazards = filterHazards(hazards, filter);
    resolve(true);
  })  
  .then((resolve) => {
    getChartData(hazards, departments, filter,
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

const filterHazards = (hazards, filter: HierarchyFilter) => {
  let filteredHazards = hazards.filter(hazard => {
    let isWithinDateRange = moment(hazard.completed_date, 'MMMM DD, YYYY hh:mm:ss').isSameOrAfter(filter.startDate, 'day') && // false
    moment(hazard.completed_date, 'MMMM DD, YYYY hh:mm:ss').isSameOrBefore(filter.endDate, 'day');

    return isWithinDateRange;
  });

  return filteredHazards;
}

const getChartData = (hazards, departments, filter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let total = 0;

  hazards.forEach((hazard) => {
    if(hazard.department_id) {
      let dept = departments.find(department => {
        return department.id == hazard.department_id;
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
    tableData.push({
      department: data.name,
      no_of_hazards: data.value,
      percentage: checkNum(+(data.value / total * 100).toFixed(2))
    });
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_hazards: total, 
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

  startDate?: any;
  endDate?: any;
}

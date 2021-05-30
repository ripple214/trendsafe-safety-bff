import { isWithin } from '../../../common/date-util';
import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getAssessments } from '../../assessments.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';

/* GET rule compliance report */
export const assessmentsByDepartment = (req, res) => {
  getAssessmentsByDepartment(req, 
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

export const getAssessmentsByDepartment = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let chartType = req.query.chartType;

  let resp = undefined;
  let error = undefined;

  let assessments = undefined;
  let departments = undefined;

  let filter: HierarchyFilter = {
    startDate: startDate,
    endDate: endDate
  };

  new SequentialExecutor()
  .chain((resolve, reject) => {
    filter.chartType = chartType;

    getAssessments(clientId, undefined, 
      (data) => {
        assessments = data;

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

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    assessments = filterAssessments(assessments, filter);
    resolve(true);
  })  
  .then((resolve) => {
    getChartData(assessments, departments, filter,
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

const filterAssessments = (assessments, filter: HierarchyFilter) => {
  let filteredAssessments = assessments.filter(assessment => {
    let isWithinDateRange = isWithin(assessment.completed_date, filter.startDate, filter.endDate);


    return isWithinDateRange;
  });

  return filteredAssessments;
}

const getChartData = (assessments, departments, filter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let total = 0;

  assessments.forEach((assessment) => {
    if(assessment.department_id) {
      let dept = departments.find(department => {
        return department.id == assessment.department_id;
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
      no_of_assessments: value,
      percentage: checkNum(+(value / total * 100).toFixed(2))
    });
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_assessments: total, 
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
  chartType?: any;
}

import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getAssessments } from '../../assessments.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';
import { retrieve as getCategories } from '../../category-elements.router';
import { isWithin } from '../../../common/date-util';

import { hasModuleAccess } from '../../../common/access-util';
const moduleId = 'TA';

/* GET risk rating report */
export const assessmentsRiskRating = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  getAssessmentsRiskRating(req, 
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

export const getAssessmentsRiskRating = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let taskId = req.query.taskId;
  let chartType = req.query.chartType;

  let resp = undefined;
  let error = undefined;

  let assessments = undefined;
  let filter: HierarchyFilter = undefined;
  
  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.startDate = startDate;
        filter.endDate = endDate;
        filter.taskId = taskId;
        filter.chartType = chartType;

        console.log(filter);
        resolve(true);
      }, 
      (err) => {
        error = err;
        reject(error);
      }
    );
  })
  .then((resolve, reject) => {
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
  .then((resolve) => {
    //console.log("raw", moment(filter.startDate), moment(filter.endDate), assessments);
    assessments = filterAssessments(assessments, filter);
    resolve(true);
  })
  .then((resolve) => {
    getChartData(assessments, filter,  
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

const getChartData = (assessments, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let major = 0;
  let moderate = 0;
  let minor = 0;
  let acceptable = 0;
  let total = 0;

  assessments.forEach((assessment) => {
    let isMajor = assessment.risk_rating['MAJOR'];
    if(isMajor) {
      major++;
    }

    let isModerate = assessment.risk_rating['MODERATE'];
    if(isModerate) {
      moderate++;
    }

    let isMinor = assessment.risk_rating['MINOR'];
    if(isMinor) {
      minor++;
    }

    let isAcceptable = assessment.risk_rating['ACCEPTABLE'];
    if(isAcceptable) {
      acceptable++;
    }

    total++;
  });

  let majorPercentage = checkNum(+(major / total * 100).toFixed(2));
  let moderatePercentage = checkNum(+(moderate / total * 100).toFixed(2));
  let minorPercentage = checkNum(+(minor / total * 100).toFixed(2));
  let acceptablePercentage = checkNum(+(acceptable / total * 100).toFixed(2));

  chartData.push({
    name: 'Major Risk',
    value: filter.chartType == 'BAR' ? major : majorPercentage
  });

  chartData.push({
    name: 'Moderate Risk',
    value: filter.chartType == 'BAR' ? moderate : moderatePercentage
  });

  chartData.push({
    name: 'Minor Risk',
    value: filter.chartType == 'BAR' ? minor : minorPercentage
  });

  chartData.push({
    name: 'Acceptable Risk',
    value: filter.chartType == 'BAR' ? acceptable : acceptablePercentage
  });

  tableData.push({
    risk_rating: 'Major Risk',
    no_of_assessments: major,
    percentage: majorPercentage
  });

  tableData.push({
    risk_rating: 'Moderate Risk',
    no_of_assessments: moderate,
    percentage: moderatePercentage
  });

  tableData.push({
    risk_rating: 'Minor Risk',
    no_of_assessments: minor,
    percentage: minorPercentage
  });

  tableData.push({
    risk_rating: 'Acceptable Risk',
    no_of_assessments: acceptable,
    percentage: acceptablePercentage
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_assessments: total, 
    summary: chartData,
    details: tableData
  });  
}

const filterAssessments = (assessments, filter: HierarchyFilter) => {
  //console.log("assessments", assessments);
  //console.log("filter", filter);

  let filteredAssessments = assessments.filter(assessment => {
    let isWithinDateRange = isWithin(assessment.completed_date, filter.startDate, filter.endDate);

    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      //console.log("site id", assessment.site_id, filter.filters);
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(assessment.site_id) > -1;
      } else if(filter.filterType == FilterType.DEPARTMENTS) {
        isWithinHierarchy = filter.filters.indexOf(assessment.department_id) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    let taskMatches = false;
    if(isWithinHierarchy) {
      if(filter.taskId) {
        taskMatches = assessment.task_id == filter.taskId;
      } else {
        taskMatches = true;
      }
    }

    //console.log("did it match", isWithinDateRange, isWithinHierarchy, taskMatches);

    return taskMatches;
  });

  return filteredAssessments;
  //console.log("filtered assessments", assessments);
}

const getHierarchyFilter = (req, onSuccess: (filter: HierarchyFilter) => void, onError?: (error: any) => void) => {
  let divisionId = req.query.divisionId;
  let projectId = req.query.projectId;
  let siteId = req.query.siteId;
  let subsiteId = req.query.subsiteId;
  let departmentId = req.query.departmentId;

  let filters: string[] = [];
  if(departmentId) {
    filters.push(departmentId);
    onSuccess({
      filterType: FilterType.DEPARTMENTS,
      filters: filters
    });
  } else if(subsiteId) {
    getFilteredDepartments(req, 
      (data) => {
        onSuccess({
          filterType: FilterType.DEPARTMENTS,
          filters: mapHierarchy(data)
        });
      }, 
      (err) => {
        onError(err);
      }
    );
  } else if(siteId) {
    filters.push(siteId);
    onSuccess({
      filterType: FilterType.SITES,
      filters: filters
    });
  } else if(projectId) {
    getFilteredSites(req, 
      (data) => {
        onSuccess({
          filterType: FilterType.SITES,
          filters: mapHierarchy(data)
        });
      }, 
      (err) => {
        onError(err);
      }
    );
  } else if(divisionId) {
    getFilteredSites(req, 
      (data) => {
        onSuccess({
          filterType: FilterType.SITES,
          filters: mapHierarchy(data)
        });
      }, 
      (err) => {
        onError(err);
      }
    );
  } else {
    onSuccess({
      filterType: FilterType.NONE,
      filters: []
    });
  }
}

const mapHierarchy = (data: any) => {
  let filters = data.map(hierarchy => {
    return hierarchy.id
  })

  return filters;
}

const checkNum = (num: number): number => {
  if(num == undefined || isNaN(num)) {
    return 0;
  } else {
    return num;
  }
}
interface HierarchyFilter {

  filterType: FilterType;
  filters: string[];
  startDate?: any;
  endDate?: any;
  taskId?: any;
  chartType?: string;
}

enum FilterType {
  NONE,
  SITES,
  DEPARTMENTS
}
import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getAssessments } from '../../assessments.router';
import { getFilteredDepartments, getFilteredSites } from '../../hierarchies.router';
import { retrieve as getCategories } from '../../category-elements.router';
import { isSameMonth, isWithin } from '../../../common/date-util';

import { hasModuleAccess } from '../../../common/access-util';
import { checkNum } from '../../../common/number-util';

const moduleId = 'TA';

/* GET compliance-by-element report */
export const assessmentsElementMonthlyTrend = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  getAssessmentsElementMonthlyTrend(req, 
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

export const getAssessmentsElementMonthlyTrend = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;

  let startDt = moment(startDate);
  let endDt = moment(endDate);

  if((endDt.month() + (endDt.year() * 12)) - (startDt.month() + (startDt.year() * 12)) > 11) {
    endDate = startDt.add(11, "month").format('YYYY-MM');
  }

  let elements = req.query.elements || [];

  let resp = undefined;
  let error = undefined;

  let categories = undefined;
  let assessments = undefined;
  let filter: HierarchyFilter = undefined;
  
  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.startDate = startDate;
        filter.endDate = endDate;
        filter.elements = elements;

        //console.log(filter);
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
    //console.log("filtered", assessments);
    resolve(true);
  })
  .then((resolve) => {
    getCategories(req, "assessments", (data) => {
      categories = data;

      resolve(true);
    });
  })
  .then((resolve) => {
    getChartData(categories, assessments, filter,  
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

const getChartData = (categories, assessments, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let chartData = [];
  let tableData = [];

  let startDate = moment(filter.startDate)
  let endDate = moment(filter.endDate)
  let startIndex = startDate.month() + (startDate.year()*12);
  let endIndex = endDate.month() + (endDate.year()*12);

  //console.log("this one", startIndex, endIndex)
  for(let i=0;i+startIndex <= endIndex; i++) {
    let reportDate = moment(filter.startDate).add(i, "month").format("YYYY-MM");
    //console.log("reportdate", reportDate, i, moment(filter.startDate).add(i, "month"));

    categories.forEach((category) => {
      category.elements.forEach((element) => {
        if(filter.elements.indexOf(element.id) > -1) {
          let compliantCount = 0;
          let nonCompliantCount = 0;
          let notApplicableCount = 0;
          let total = 0;
    
          assessments.filter(assessment => {
            return isSameMonth(assessment.completed_date, reportDate)
          }).forEach((assessment) => {
            let isCompliant = assessment.element_compliance[element.id] && assessment.element_compliance[element.id]['Y'];
            if(isCompliant) {
              compliantCount++;
            }
    
            let isNonCompliant = assessment.element_compliance[element.id] && assessment.element_compliance[element.id]['N'];
            if(isNonCompliant) {
              nonCompliantCount++;
            }
    
            let isNotApplicable = assessment.element_compliance[element.id] && assessment.element_compliance[element.id]['NA'];
            if(isNotApplicable) {
              notApplicableCount++;
            }
    
            total++;
          });
          var percentage = checkNum(+(compliantCount / total * 100));

          let data = chartData.find(data => {
            return data.name == element.name;
          });
          if(data == undefined) {
            data = {
              name: element.name,
              series: []
            }
            chartData.push(data);
          }
          let chartDate = moment(reportDate).format("MMM YY");
          let series = data.series;
          let seriesVal = series.find(seriesVal => {
            return seriesVal.name == chartDate
          });
          if(seriesVal == undefined) {
            seriesVal = {
              name: chartDate,
              value: percentage
            };
            series.push(seriesVal);
          }
          
          tableData.push({
            reportDate: reportDate,
            category: category.name,
            element: element.name,
            compliance: {
              y: {
                total: compliantCount,
                percent_total: checkNum(+(compliantCount / total * 100)),
                percent_applicable: checkNum(+(compliantCount / (total-notApplicableCount) * 100)),
              },
              n: {
                total: nonCompliantCount,
                percent_total: checkNum(+(nonCompliantCount / total * 100)),
                percent_applicable: checkNum(+(nonCompliantCount / (total-notApplicableCount) * 100)),
              },
              na: {
                total: notApplicableCount,
                percent_total: checkNum(+(notApplicableCount / total * 100))
              }
            }
          });
        }
      });
    });
  }

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_assessments: assessments.length, 
    summary: chartData,
    details: tableData
  });  
}

const filterAssessments = (assessments, filter: HierarchyFilter) => {
  //console.log("assessments", assessments);
  //console.log("filter", filter);

  let filteredAssessments = assessments.filter(assessment => {
    let isWithinDateRange = isWithin(assessment.completed_date, filter.startDate, filter.endDate, 'month');

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

    //console.log("did it match", isWithinDateRange, isWithinHierarchy);

    return isWithinHierarchy;
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


interface HierarchyFilter {

  filterType: FilterType;
  filters: string[];
  startDate?: any;
  endDate?: any;
  taskId?: any;
  elements?: string[];
}

enum FilterType {
  NONE,
  SITES,
  DEPARTMENTS
}
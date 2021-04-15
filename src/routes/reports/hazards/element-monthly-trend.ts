import moment from 'moment';

import { SequentialExecutor } from '../../../common/sequential-executor';
import { getHazards } from '../../hazards.router';
import { getDepartments, getSites } from '../../hierarchies.router';
import { retrieve as getCategories } from '../../category-elements.router';

/* GET compliance-by-element report */
export const hazardsElementMonthlyTrend = (req, res) => {
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
  let hazards = undefined;
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
  .then((resolve) => {
    //console.log("raw", moment(filter.startDate), moment(filter.endDate), hazards);
    hazards = filterHazards(hazards, filter);
    //console.log("filtered", hazards);
    resolve(true);
  })
  .then((resolve) => {
    getCategories(req, "hazards", (data) => {
      categories = data;

      resolve(true);
    });
  })
  .then((resolve) => {
    getChartData(categories, hazards, filter,  
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

const getChartData = (categories, hazards, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
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
          let total = 0;
    
          hazards.filter(hazard => {
            return moment(hazard.completed_date, 'MMMM DD, YYYY hh:mm:ss').isSame(reportDate, 'month')
          }).forEach((hazard) => {

            let isNonCompliant = hazard.element_compliance[element.id]['N'];
            if(isNonCompliant) {
              nonCompliantCount++;
            }
    
            total++;
          });
          var percentage = checkNum(+(compliantCount / total * 100).toFixed(2));

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
              n: {
                total: nonCompliantCount,
                percent_total: checkNum(+(nonCompliantCount / total * 100).toFixed(0)),
              }
            }
          });
        }
      });
    });
  }

  /*
  tableData = tableData.filter(data => {
    return data.compliance.n.total > 0;
  });
  */

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    no_of_hazards: hazards.length, 
    summary: chartData,
    details: tableData
  });  
}

const filterHazards = (hazards, filter: HierarchyFilter) => {
  //console.log("hazards", hazards);
  //console.log("filter", filter);

  let filteredHazards = hazards.filter(hazard => {
    let isWithinDateRange = moment(hazard.completed_date, 'MMMM DD, YYYY hh:mm:ss').isSameOrAfter(filter.startDate, 'month') && // false
    moment(hazard.completed_date, 'MMMM DD, YYYY hh:mm:ss').isSameOrBefore(filter.endDate, 'month');

    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      //console.log("site id", hazard.site_id, filter.filters);
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(hazard.site_id) > -1;
      } else if(filter.filterType == FilterType.DEPARTMENTS) {
        isWithinHierarchy = filter.filters.indexOf(hazard.department_id) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    //console.log("did it match", isWithinDateRange, isWithinHierarchy);

    return isWithinHierarchy;
  });

  return filteredHazards;
  //console.log("filtered hazards", hazards);
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
    getDepartments(req, 
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
    getSites(req, 
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
    getSites(req, 
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
  elements?: string[];
}

enum FilterType {
  NONE,
  SITES,
  DEPARTMENTS
}
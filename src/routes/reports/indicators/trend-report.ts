import { SequentialExecutor } from '../../../common/sequential-executor';
import { getIndicators } from '../../indicators.router';
import { isSameMonth, isWithin } from '../../../common/date-util';
import moment from 'moment';
import { FilterType, getHierarchyFilter, HierarchyFilter } from '../../../common/hierarchy-filter';
import { checkNum } from '../../../common/checkNum';

/* GET trend-report */
export const indicatorsTrendReport = (req, res) => {
  let clientId = req['user'].client_id;

  let startDate = req.query.startDate;
  let endDate = req.query.endDate;

  let startDt = moment(startDate);
  let endDt = moment(endDate);

  if((endDt.month() + (endDt.year() * 12)) - (startDt.month() + (startDt.year() * 12)) > 11) {
    endDate = startDt.add(11, "month").format('YYYY-MM');
  }

  let resp = undefined;
  let error = undefined;

  let indicators = undefined;
  let filter: HierarchyFilter = undefined;
  
  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.startDate = startDate;
        filter.endDate = endDate;

        resolve(true);
      }, 
      (err) => {
        error = err;
        reject(error);
      }
    );
  })
  .then((resolve, reject) => {
    getIndicators(clientId, 
      (data) => {
        indicators = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    //console.log("raw", moment(filter.reportDate), indicators);
    indicators = filterIndicators(indicators, filter);
    resolve(true);
  })
  .then((resolve) => {
    getChartData(indicators, filter,  
      (data) => {
        resp = {"report-data": data};

        resolve(true);
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

const getChartData = (indicators, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let tableData = [];

  let startDate = moment(filter.startDate)
  let endDate = moment(filter.endDate)
  let startIndex = startDate.month() + (startDate.year()*12);
  let endIndex = endDate.month() + (endDate.year()*12);

  let max_ppifr = 0;
  let max_lsi = 0;

  let overall_ppifr = 0;
  let overall_lsi = 0;

  for(let i=0;i+startIndex <= endIndex; i++) {
    let total_ppifr = 0;
    let total_lsi = 0;

    let reportDate = moment(filter.startDate).add(i, "month").format("YYYY-MM");
    indicators.filter(indicator => {
      return isSameMonth(indicator.report_date, reportDate)
    }).forEach((indicator) => {
      total_ppifr += indicator.total_ppifr;
      total_lsi += indicator.total_lsi;
    });

    overall_ppifr += total_ppifr;
    overall_lsi += total_lsi;

    tableData.push({
      report_date: reportDate,
      total_ppifr: total_ppifr, 
      mat_ppifr: checkNum(overall_ppifr / (i+1)).toFixed(2), 
      total_lsi: total_lsi,
      mat_lsi: checkNum(overall_lsi / (i+1)).toFixed(2)
    });

    if(total_ppifr > max_ppifr) {
      max_ppifr = total_ppifr;
    }
    if(total_lsi > max_lsi) {
      max_lsi = total_lsi;
    }
  }
  

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    details: tableData,
    max_ppifr: max_ppifr,
    max_lsi: max_lsi
  });
}

const filterIndicators = (indicators, filter: HierarchyFilter) => {
  //console.log("indicators", indicators);
  //console.log("filter", filter);

  let filteredIndicators = indicators.filter(indicator => {
    let isWithinDateRange = isWithin(indicator.report_date, filter.startDate, filter.endDate, 'month');

    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      //console.log("site id", indicator.site_id, filter.filters);
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(indicator.site.id) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    return isWithinHierarchy;
  });

  //console.log("filtered indicators", filteredIndicators);
  return filteredIndicators;
}

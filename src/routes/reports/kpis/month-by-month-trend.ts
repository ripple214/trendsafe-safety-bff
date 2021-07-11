import { SequentialExecutor } from '../../../common/sequential-executor';
import { getIndicators } from '../../indicators.router';
import { isSameMonth, isWithin } from '../../../common/date-util';
import moment from 'moment';
import { FilterType, getHierarchyFilter, HierarchyFilter } from '../../../common/hierarchy-filter';

import { hasModuleAccess } from '../../../common/access-util';
import { getKPIs } from '../../../routes/kpis.router';
const moduleId = 'KPI';

/* GET trend-report */
export const kpisMonthByMonthTrend = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  getKPIsMonthByMonthTrend(req, 
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

export const getKPIsMonthByMonthTrend = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
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
  let kpis = undefined;
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
    getKPIs(clientId, undefined,
      (data) => {
        kpis = data;

        resolve(true);
      }, 
      (err) => {
        error = err;

        reject(error);
      }
    );
  })
  .then((resolve) => {
    //console.log("raw", moment(filter.reportDate), kpis);
    kpis = filterKPIs(kpis, filter);
    resolve(true);
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
    getChartData(indicators, kpis, filter,  
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

const getChartData = (indicators, kpis, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let startDate = moment(filter.startDate)
  let endDate = moment(filter.endDate)
  let startIndex = startDate.month() + (startDate.year()*12);
  let endIndex = endDate.month() + (endDate.year()*12);

  let assessments = {data: [], average: [{name: 'Target', series: []}, {name: '', series: []}]};
  let inspections = {data: [], average: [{name: 'Target', series: []}, {name: '', series: []}]};
  let lsi = {data: [], average: [{name: 'Target', series: []}, {name: '', series: []}]};
  let ppi = {data: [], average: [{name: 'Target', series: []}, {name: '', series: []}]};
  let bbsi = {data: [], average: [{name: 'Target', series: []}, {name: '', series: []}]};
  let actions = {data: [], average: [{name: 'Target', series: []}, {name: '', series: []}]};

  for(let i=0;i+startIndex <= endIndex; i++) {
    let reportDate = moment(filter.startDate).add(i, "month").format("YYYY-MM");

    let assessmentsResult = 0;
    let inspectionsResult = 0;
    let lsiResult = 0;
    let ppiResult = 0;
    let bbsiResult = 0;
    let actionsResult = 0;
    indicators.filter(indicator => {
      return isSameMonth(indicator.report_date, reportDate)
    }).forEach((indicator) => {
      assessmentsResult += indicator.assessments;
      inspectionsResult += indicator.inspections;
      lsiResult += indicator.total_lsi;
      ppiResult += indicator.total_ppifr;
      bbsiResult += indicator.total_bbsi;
      actionsResult += indicator.actions_completed_by_due_date;
    });

    assessments.data.push({name: reportDate, value: assessmentsResult});
    inspections.data.push({name: reportDate, value: inspectionsResult});
    lsi.data.push({name: reportDate, value: lsiResult});
    ppi.data.push({name: reportDate, value: ppiResult});
    bbsi.data.push({name: reportDate, value: bbsiResult});
    actions.data.push({name: reportDate, value: actionsResult});

    let assessmentsTarget = 0;
    let inspectionsTarget = 0;
    let lsiTarget = 0;
    let ppiTarget = 0;
    let bbsiTarget = 0;
    let actionsTarget = 0;
    kpis.filter(kpi => {
      return isSameMonth(kpi.kpi_date, reportDate)
    }).forEach((kpi) => {
      console.log("kpi", kpi);
      assessmentsTarget += +kpi.targets['TA'];
      inspectionsTarget += +kpi.targets['PAI'];
      lsiTarget += +kpi.targets['LSI'];
      ppiTarget += +kpi.targets['PPI'];
      bbsiTarget += +kpi.targets['BBSI'];
      actionsTarget += +kpi.targets['ACBDD'];
    });

    assessments.average[0].series.push({name: reportDate, value: assessmentsTarget});
    inspections.average[0].series.push({name: reportDate, value: inspectionsTarget});
    lsi.average[0].series.push({name: reportDate, value: lsiTarget});
    ppi.average[0].series.push({name: reportDate, value: ppiTarget});
    bbsi.average[0].series.push({name: reportDate, value: bbsiTarget});
    actions.average[0].series.push({name: reportDate, value: actionsTarget});

    assessments.average[1].series.push({name: reportDate, value: 0});
    inspections.average[1].series.push({name: reportDate, value: 0});
    lsi.average[1].series.push({name: reportDate, value: 0});
    ppi.average[1].series.push({name: reportDate, value: 0});
    bbsi.average[1].series.push({name: reportDate, value: 0});
    actions.average[1].series.push({name: reportDate, value: 0});
  }

  let max_result = 0;
  let dataSets = [assessments, inspections, lsi, ppi, bbsi, actions];

  dataSets.forEach(dataSet => {
    dataSet.data.forEach(result => {
      if(max_result < result.value) max_result = result.value;
    })
    dataSet.average[0].series.forEach(target => {
      if(max_result < target.value) max_result = target.value;
    })
    dataSet.average[1].series.forEach(target => {
      target.value = max_result;
    })
  });

  onSuccess({
    start_date: filter.startDate,
    end_date: filter.endDate,
    assessments: assessments,
    inspections: inspections,
    lsi: lsi,
    ppi: ppi,
    bbsi: bbsi,
    actions: actions
  });
}

const filterKPIs = (kpis, filter: HierarchyFilter) => {
  //console.log("kpis", kpis);
  //console.log("filter", filter);

  let filteredKPIs = kpis.filter(kpi => {
    let isWithinDateRange = isWithin(kpi.kpi_date, filter.startDate, filter.endDate, 'month');

    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      //console.log("site id", kpi.parent, filter.filters);
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(kpi.parent) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    return isWithinHierarchy;
  });

  //console.log("filtered kpis", filteredKPIs);
  return filteredKPIs;
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

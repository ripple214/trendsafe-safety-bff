import { SequentialExecutor } from '../../../common/sequential-executor';
import { getKPIs } from '../../kpis.router';
import { dateFormat, isSameMonth } from '../../../common/date-util';
import { getEntities, getFilteredSites } from '../../hierarchies.router';

import { hasModuleAccess } from '../../../common/access-util';
import { getIndicators } from '../../../routes/indicators.router';
const moduleId = 'KPI';

/* GET monthly-report */
export const kpisMonthlyReport = (req, res) => {
  if(!hasModuleAccess(req, res, moduleId)) return;
  
  getKPIsMonthlyReport(req, 
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

export const getKPIsMonthlyReport = (req, onSuccess: (data: any) => void, onFailure: (error: any) => void) => {
  let clientId = req['user'].client_id;

  let reportDate = req.query.reportDate;

  let resp = undefined;
  let error = undefined;

  let sites = undefined;
  let kpis = undefined;
  let filter: HierarchyFilter = undefined;
  
  let indicators = 0;

  new SequentialExecutor()
  .chain((resolve, reject) => {
    getHierarchyFilter(req,  
      (data) => {

        filter = data;
        filter.reportDate = reportDate;

        resolve(true);
      }, 
      (err) => {
        error = err;
        reject(error);
      }
    );
  })
  .then((resolve, reject) => {
    getEntities(req, "SITE",
      (data) => {
        sites = data;

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
        (error) => {
          reject(error);
        }
      )
    }
  )
  .then((resolve) => {
    //console.log("indicators", indicators);
    indicators = filterIndicators(indicators, filter);
    resolve(true);
  })
  .then((resolve) => {
    getChartData(kpis, indicators, filter, 
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

const getChartData = (kpis, indicators, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let reportData = {
    report_date: dateFormat(filter.reportDate),
    assessments: {
      target: 0,
      result: 0
    },
    inspections: {
      target: 0,
      result: 0
    },
    lsi: {
      target: 0,
      result: 0
    },
    ppi: {
      target: 0,
      result: 0
    },
    bbsi: {
      target: 0,
      result: 0
    },
    actions: {
      target: 0,
      result: 0
    },
  }
  if(kpis.length == 1 && indicators.length == 1) {
    let kpi =  kpis[0];
    let indicator =  indicators[0];
    reportData = {
      report_date: dateFormat(filter.reportDate),
      assessments: {
        target: kpi.targets['TA'],
        result: indicator.assessments
      },
      inspections: {
        target: kpi.targets['PAI'],
        result: indicator.inspections
      },
      lsi: {
        target: kpi.targets['LSI'],
        result: indicator.total_lsi
      },
      ppi: {
        target: kpi.targets['PPI'],
        result: indicator.total_ppifr
      },
      bbsi: {
        target: kpi.targets['BBSI'],
        result: indicator.total_bbsi
      },
      actions: {
        target: kpi.targets['ACBDD'],
        result: indicator.actions_completed_by_due_date
      },
    }
  } 
  onSuccess(reportData);  
}

const filterKPIs = (kpis, filter: HierarchyFilter) => {
  //console.log("kpis", kpis);
  //console.log("filter", filter);

  let filteredKPIs = kpis.filter(kpi => {
    let isWithinDateRange = isSameMonth(kpi.kpi_date, filter.reportDate);

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
  let filteredIndicators = indicators.filter(indicator => {
    let isWithinDateRange = isSameMonth(indicator.report_date, filter.reportDate);

    let isWithinHierarchy = false;
    if(isWithinDateRange) {
      if(filter.filterType == FilterType.SITES) {
        isWithinHierarchy = filter.filters.indexOf(indicator.site.id) > -1;
      } else {
        isWithinHierarchy = true;
      }
    }

    return isWithinHierarchy;
  });
  return filteredIndicators;
}

const getHierarchyFilter = (req, onSuccess: (filter: HierarchyFilter) => void, onError?: (error: any) => void) => {
  let divisionId = req.query.divisionId;
  let projectId = req.query.projectId;
  let siteId = req.query.siteId;

  let filters: string[] = [];
  if(siteId) {
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
  reportDate?: any;
}

enum FilterType {
  NONE,
  SITES
}
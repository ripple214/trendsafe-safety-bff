import { SequentialExecutor } from '../../../common/sequential-executor';
import { getIndicators } from '../../indicators.router';
import { dateFormat, isSameMonth } from '../../../common/date-util';
import { getEntities, getFilteredSites, getSites } from '../../../routes/hierarchies.router';

/* GET monthly-performance-report */
export const indicatorsMonthlyPerformanceReport = (req, res) => {
  let clientId = req['user'].client_id;

  let reportDate = req.query.reportDate;

  let resp = undefined;
  let error = undefined;

  let sites = undefined;
  let indicators = undefined;
  let filter: HierarchyFilter = undefined;
  
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
    getChartData(indicators, sites, filter,  
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

const getChartData = (indicators, sites, filter: HierarchyFilter, onSuccess: (data: any) => void) => {
  let tableData = [];

  let total_ppifr = 0;
  let total_lsi = 0;

  indicators.forEach((indicator) => {
    let site = sites.find(site => {
      return site.id == indicator.site.id
    });
    tableData.push({
      site: {
        id: indicator.site.id,
        name: site.name + ' (' + site.parentNames + ')'
      },
      total_ppifr: indicator.total_ppifr, 
      total_lsi: indicator.total_lsi
    });

    total_ppifr += indicator.total_ppifr;
    total_lsi += indicator.total_lsi;
  });

  onSuccess({
    report_date: dateFormat(filter.reportDate),
    details: tableData,
    total_ppifr: total_ppifr,
    total_lsi: total_lsi
  });  
}

const filterIndicators = (indicators, filter: HierarchyFilter) => {
  //console.log("indicators", indicators);
  //console.log("filter", filter);

  let filteredIndicators = indicators.filter(indicator => {
    let isWithinDateRange = isSameMonth(indicator.report_date, filter.reportDate);

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